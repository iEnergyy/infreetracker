/**
 * Idempotent next-period invoice generation (ROADMAP §6.1, §6.3.1).
 *
 * Eligibility: subscription `status` must be `active`, `grace`, or `overdue`. **`blocked` is skipped**
 * (no new invoices while blocked).
 *
 * Frontier: `subscriptions.current_period_end` (UTC midnight) encodes the invoice `due_date` for the
 * current billing period. When that invoice is `paid`, we insert the next `pending` invoice and
 * advance `current_period_end`. At most one row per `(subscription_id, due_date)` (AC-6.1.3).
 *
 * Catch-up: at most one new invoice per successful run per subscription (see job runner).
 */

import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { invoices, subscriptions } from "@/db/schema";
import type * as schema from "@/db/schema";
import { computeNextPeriodEnd } from "@/lib/billing/first-period-end";

const ELIGIBLE_STATUSES = new Set(["active", "grace", "overdue"] as const);

export type GenerateNextInvoiceErrorCode =
  | "SUBSCRIPTION_NOT_FOUND"
  | "FORBIDDEN"
  | "BLOCKED"
  | "NOT_BILLABLE_STATUS";

export interface GenerateNextInvoiceOk {
  ok: true;
  created: boolean;
  invoiceId?: string;
}

export interface GenerateNextInvoiceErr {
  ok: false;
  code: GenerateNextInvoiceErrorCode;
  message: string;
}

export type GenerateNextInvoiceResult = GenerateNextInvoiceOk | GenerateNextInvoiceErr;

export interface GenerateNextInvoiceInput {
  subscriptionId: string;
  /** When set, subscription must belong to this user (dashboard). */
  scopedUserId?: string;
}

function timestampToUtcDateString(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export async function generateNextInvoiceForSubscription(
  database: NodePgDatabase<typeof schema>,
  input: GenerateNextInvoiceInput,
): Promise<GenerateNextInvoiceResult> {
  return database.transaction(async (tx) => {
    const whereSub = input.scopedUserId
      ? and(eq(subscriptions.id, input.subscriptionId), eq(subscriptions.userId, input.scopedUserId))
      : eq(subscriptions.id, input.subscriptionId);

    const [sub] = await tx.select().from(subscriptions).where(whereSub).limit(1);

    if (!sub) {
      return input.scopedUserId
        ? { ok: false, code: "FORBIDDEN", message: "Subscription not found" }
        : { ok: false, code: "SUBSCRIPTION_NOT_FOUND", message: "Subscription not found" };
    }

    if (sub.status === "blocked") {
      return { ok: false, code: "BLOCKED", message: "Subscription is blocked" };
    }

    if (!ELIGIBLE_STATUSES.has(sub.status as "active" | "grace" | "overdue")) {
      return {
        ok: false,
        code: "NOT_BILLABLE_STATUS",
        message: `Status ${sub.status} is not billable`,
      };
    }

    const frontierDate = timestampToUtcDateString(sub.currentPeriodEnd);

    const [frontierInvoice] = await tx
      .select()
      .from(invoices)
      .where(
        and(eq(invoices.subscriptionId, input.subscriptionId), eq(invoices.dueDate, frontierDate)),
      )
      .limit(1);

    if (frontierInvoice) {
      if (frontierInvoice.status === "pending" || frontierInvoice.status === "overdue") {
        return { ok: true, created: false };
      }

      if (frontierInvoice.status === "paid") {
        const { nextPeriodEndDate, currentPeriodEnd } = computeNextPeriodEnd({
          periodEndDate: frontierDate,
          billingCycle: sub.billingCycle,
          billingIntervalDays: sub.billingIntervalDays,
        });

        const [inserted] = await tx
          .insert(invoices)
          .values({
            userId: sub.userId,
            subscriptionId: sub.id,
            amount: String(sub.amount),
            currency: sub.currency,
            dueDate: nextPeriodEndDate,
            status: "pending",
          })
          .onConflictDoNothing({ target: [invoices.subscriptionId, invoices.dueDate] })
          .returning({ id: invoices.id });

        if (inserted) {
          await tx
            .update(subscriptions)
            .set({ currentPeriodEnd: currentPeriodEnd, updatedAt: new Date() })
            .where(eq(subscriptions.id, sub.id));
          return { ok: true, created: true, invoiceId: inserted.id };
        }

        const [existingNext] = await tx
          .select({ id: invoices.id })
          .from(invoices)
          .where(
            and(
              eq(invoices.subscriptionId, input.subscriptionId),
              eq(invoices.dueDate, nextPeriodEndDate),
            ),
          )
          .limit(1);

        if (existingNext) {
          await tx
            .update(subscriptions)
            .set({ currentPeriodEnd: currentPeriodEnd, updatedAt: new Date() })
            .where(eq(subscriptions.id, sub.id));
        }

        return { ok: true, created: false, invoiceId: existingNext?.id };
      }
    }

    // Repair: missing invoice row for current frontier (legacy / inconsistency).
    const [repaired] = await tx
      .insert(invoices)
      .values({
        userId: sub.userId,
        subscriptionId: sub.id,
        amount: String(sub.amount),
        currency: sub.currency,
        dueDate: frontierDate,
        status: "pending",
      })
      .onConflictDoNothing({ target: [invoices.subscriptionId, invoices.dueDate] })
      .returning({ id: invoices.id });

    if (repaired) {
      return { ok: true, created: true, invoiceId: repaired.id };
    }

    return { ok: true, created: false };
  });
}
