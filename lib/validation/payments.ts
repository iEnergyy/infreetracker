import { z } from "zod";

/** AC-7.1.2 — predefined methods (extend as product needs). */
export const PAYMENT_METHODS = ["cash", "bank_transfer", "card", "other"] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const recordInvoicePaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  method: z.enum(PAYMENT_METHODS),
  note: z.string().max(2000).optional().nullable(),
});

export type RecordInvoicePaymentInput = z.infer<typeof recordInvoicePaymentSchema>;
