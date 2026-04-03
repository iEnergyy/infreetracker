import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { account, session, user, verification } from "./auth";
import {
  apiKeys,
  clients,
  costs,
  invoices,
  payments,
  subscriptions,
  webhookDeliveries,
  webhookEndpoints,
} from "./domain";

/**
 * Drizzle schema entrypoint. Auth tables match Better Auth (`user`, `session`, `account`, `verification`).
 *
 * **Domain rule:** any future `user_id` column must reference `user.id` (text) — same type Better Auth uses.
 */
export * from "./auth";
export * from "./domain";

export type UserRow = InferSelectModel<typeof user>;
export type UserInsert = InferInsertModel<typeof user>;
export type SessionRow = InferSelectModel<typeof session>;
export type SessionInsert = InferInsertModel<typeof session>;
export type AccountRow = InferSelectModel<typeof account>;
export type AccountInsert = InferInsertModel<typeof account>;
export type VerificationRow = InferSelectModel<typeof verification>;
export type VerificationInsert = InferInsertModel<typeof verification>;

export type ClientRow = InferSelectModel<typeof clients>;
export type ClientInsert = InferInsertModel<typeof clients>;
export type SubscriptionRow = InferSelectModel<typeof subscriptions>;
export type SubscriptionInsert = InferInsertModel<typeof subscriptions>;
export type InvoiceRow = InferSelectModel<typeof invoices>;
export type InvoiceInsert = InferInsertModel<typeof invoices>;
export type PaymentRow = InferSelectModel<typeof payments>;
export type PaymentInsert = InferInsertModel<typeof payments>;
export type CostRow = InferSelectModel<typeof costs>;
export type CostInsert = InferInsertModel<typeof costs>;
export type ApiKeyRow = InferSelectModel<typeof apiKeys>;
export type ApiKeyInsert = InferInsertModel<typeof apiKeys>;
export type WebhookEndpointRow = InferSelectModel<typeof webhookEndpoints>;
export type WebhookEndpointInsert = InferInsertModel<typeof webhookEndpoints>;
export type WebhookDeliveryRow = InferSelectModel<typeof webhookDeliveries>;
export type WebhookDeliveryInsert = InferInsertModel<typeof webhookDeliveries>;
