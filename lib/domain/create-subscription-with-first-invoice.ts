import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { clients, invoices, subscriptions } from "@/db/schema";
import type * as schema from "@/db/schema";
import { computeFirstPeriodEnd } from "@/lib/billing/first-period-end";

export type CreateSubscriptionWithFirstInvoiceErrorCode = "CLIENT_NOT_FOUND";

export interface CreateSubscriptionWithFirstInvoiceOk {
  ok: true;
  subscriptionId: string;
}

export interface CreateSubscriptionWithFirstInvoiceErr {
  ok: false;
  code: CreateSubscriptionWithFirstInvoiceErrorCode;
  message: string;
}

export type CreateSubscriptionWithFirstInvoiceResult =
  | CreateSubscriptionWithFirstInvoiceOk
  | CreateSubscriptionWithFirstInvoiceErr;

export interface CreateSubscriptionWithFirstInvoiceInput {
  userId: string;
  clientId: string;
  amount: string;
  currency: "DOP" | "USD";
  billingCycle: "monthly" | "custom_days";
  billingIntervalDays: number | null;
  startDate: string;
  gracePeriodDays: number;
}

/**
 * Inserts subscription (active) + first pending invoice in one transaction (AC-5.1.2, AC-5.1.3).
 */
export async function createSubscriptionWithFirstInvoice(
  database: NodePgDatabase<typeof schema>,
  input: CreateSubscriptionWithFirstInvoiceInput,
): Promise<CreateSubscriptionWithFirstInvoiceResult> {
  return database.transaction(async (tx) => {
    const [clientRow] = await tx
      .select({ id: clients.id })
      .from(clients)
      .where(and(eq(clients.id, input.clientId), eq(clients.userId, input.userId)))
      .limit(1);

    if (!clientRow) {
      return {
        ok: false,
        code: "CLIENT_NOT_FOUND",
        message: "Client not found",
      };
    }

    const { firstPeriodEndDate, currentPeriodEnd } = computeFirstPeriodEnd({
      startDate: input.startDate,
      billingCycle: input.billingCycle,
      billingIntervalDays: input.billingIntervalDays,
    });

    const [sub] = await tx
      .insert(subscriptions)
      .values({
        userId: input.userId,
        clientId: input.clientId,
        amount: input.amount,
        currency: input.currency,
        billingCycle: input.billingCycle,
        billingIntervalDays:
          input.billingCycle === "custom_days" ? input.billingIntervalDays : null,
        startDate: input.startDate,
        gracePeriodDays: input.gracePeriodDays,
        status: "active",
        currentPeriodEnd,
        blockedAt: null,
      })
      .returning({ id: subscriptions.id });

    if (!sub) {
      throw new Error("Subscription insert returned no row");
    }

    await tx.insert(invoices).values({
      userId: input.userId,
      subscriptionId: sub.id,
      amount: input.amount,
      currency: input.currency,
      dueDate: firstPeriodEndDate,
      status: "pending",
    });

    return { ok: true, subscriptionId: sub.id };
  });
}
