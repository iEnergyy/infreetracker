import { z } from "zod";

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

const amountField = z
  .string()
  .trim()
  .min(1, "Amount is required")
  .refine((s) => {
    const n = Number(s);
    return Number.isFinite(n) && n > 0;
  }, "Amount must be a positive number")
  .transform((s) => Number(s).toFixed(2));

export const subscriptionCreateSchema = z
  .object({
    clientId: z.uuid(),
    amount: amountField,
    currency: z.enum(["DOP", "USD"]),
    billingCycle: z.enum(["monthly", "custom_days"]),
    billingIntervalDays: z
      .union([z.string(), z.number(), z.null(), z.undefined()])
      .optional()
      .transform((v) => {
        if (v === "" || v === undefined || v === null) return null;
        const n = typeof v === "string" ? Number(v.trim()) : Number(v);
        return Number.isFinite(n) ? Math.trunc(n) : null;
      }),
    startDate: z
      .string()
      .trim()
      .regex(isoDateRegex, "Use YYYY-MM-DD"),
    gracePeriodDays: z.coerce.number().int().min(0, "Grace period must be 0 or more"),
  })
  .superRefine((data, ctx) => {
    if (data.billingCycle === "custom_days") {
      if (data.billingIntervalDays == null || data.billingIntervalDays < 1) {
        ctx.addIssue({
          code: "custom",
          message: "Interval days is required (at least 1) for custom billing",
          path: ["billingIntervalDays"],
        });
      }
    }
  });

export const subscriptionUpdateSchema = z
  .object({
    subscriptionId: z.uuid(),
    amount: amountField,
    gracePeriodDays: z.coerce.number().int().min(0, "Grace period must be 0 or more"),
    billingIntervalDays: z
      .union([z.string(), z.number(), z.null(), z.undefined()])
      .optional()
      .transform((v) => {
        if (v === "" || v === undefined || v === null) return undefined;
        const n = typeof v === "string" ? Number(v.trim()) : Number(v);
        return Number.isFinite(n) ? Math.trunc(n) : undefined;
      }),
  })
  .superRefine((data, ctx) => {
    if (data.billingIntervalDays !== undefined && data.billingIntervalDays < 1) {
      ctx.addIssue({
        code: "custom",
        message: "Interval days must be at least 1",
        path: ["billingIntervalDays"],
      });
    }
  });

export type SubscriptionCreateInput = z.infer<typeof subscriptionCreateSchema>;
export type SubscriptionUpdateInput = z.infer<typeof subscriptionUpdateSchema>;
