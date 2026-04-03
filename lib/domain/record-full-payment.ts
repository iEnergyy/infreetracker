import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { invoices, payments, subscriptions } from "@/db/schema";
import type * as schema from "@/db/schema";
import { subscriptionStatusAfterFullPayment } from "@/lib/domain/subscription-status-after-payment";

export type RecordFullPaymentErrorCode =
  | "INVOICE_NOT_FOUND"
  | "INVALID_INVOICE_STATUS"
  | "METHOD_REQUIRED";

export interface RecordFullPaymentOk {
  ok: true;
  paymentId: string;
}

export interface RecordFullPaymentErr {
  ok: false;
  code: RecordFullPaymentErrorCode;
  message: string;
}

export type RecordFullPaymentResult = RecordFullPaymentOk | RecordFullPaymentErr;

function invoiceAmountToPaymentAmount(amount: string): string {
  return amount.trim();
}

/**
 * MVP full payment only: inserts `payments`, sets invoice `paid` + `paid_at`, and recalculates
 * subscription status when applicable (AC-3.4.2, AC-7.1.3).
 */
export async function recordFullPaymentInTransaction(
  database: NodePgDatabase<typeof schema>,
  input: {
    userId: string;
    invoiceId: string;
    method: string;
    note?: string | null;
  },
): Promise<RecordFullPaymentResult> {
  const method = input.method.trim();
  if (!method) {
    return { ok: false, code: "METHOD_REQUIRED", message: "Payment method is required" };
  }

  return database.transaction(async (tx) => {
    const [invoiceRow] = await tx
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, input.invoiceId), eq(invoices.userId, input.userId)))
      .limit(1);

    if (!invoiceRow) {
      return {
        ok: false,
        code: "INVOICE_NOT_FOUND",
        message: "Invoice not found",
      };
    }

    if (invoiceRow.status !== "pending" && invoiceRow.status !== "overdue") {
      return {
        ok: false,
        code: "INVALID_INVOICE_STATUS",
        message: "Only pending or overdue invoices can be paid",
      };
    }

    const payAmount = invoiceAmountToPaymentAmount(String(invoiceRow.amount));

    const [payment] = await tx
      .insert(payments)
      .values({
        userId: input.userId,
        invoiceId: input.invoiceId,
        amount: payAmount,
        method,
        note: input.note?.trim() || null,
      })
      .returning({ id: payments.id });

    if (!payment) {
      throw new Error("Payment insert returned no row");
    }

    await tx
      .update(invoices)
      .set({
        status: "paid",
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(invoices.id, input.invoiceId), eq(invoices.userId, input.userId)));

    const [subRow] = await tx
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.id, invoiceRow.subscriptionId),
          eq(subscriptions.userId, input.userId),
        ),
      )
      .limit(1);

    if (subRow) {
      const patch = subscriptionStatusAfterFullPayment(subRow.status);
      if (patch) {
        await tx
          .update(subscriptions)
          .set({
            status: patch.status,
            blockedAt: patch.clearBlockedAt ? null : subRow.blockedAt,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, subRow.id));
      }
    }

    return { ok: true, paymentId: payment.id };
  });
}
