import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const currencyEnum = pgEnum("currency", ["DOP", "USD"]);

export const subscriptionBillingCycleEnum = pgEnum("subscription_billing_cycle", [
  "monthly",
  "custom_days",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "grace",
  "overdue",
  "blocked",
]);

export const invoiceStatusEnum = pgEnum("invoice_status", ["pending", "paid", "overdue"]);

export const costCategoryEnum = pgEnum("cost_category", [
  "hosting",
  "api",
  "domain",
  "other",
]);

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    contact: text("contact"),
    externalId: text("external_id").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (t) => [
    /** Required so composite FKs (e.g. costs, subscriptions) can reference `(user_id, id)`. */
    uniqueIndex("clients_user_id_id_unique").on(t.userId, t.id),
    uniqueIndex("clients_user_id_external_id_unique").on(t.userId, t.externalId),
    check(
      "clients_external_id_format",
      sql`lower(${t.externalId}) = ${t.externalId} AND ${t.externalId} ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`,
    ),
  ],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    clientId: uuid("client_id").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    currency: currencyEnum("currency").notNull(),
    billingCycle: subscriptionBillingCycleEnum("billing_cycle").notNull(),
    billingIntervalDays: integer("billing_interval_days"),
    startDate: date("start_date").notNull(),
    gracePeriodDays: integer("grace_period_days").notNull(),
    status: subscriptionStatusEnum("status").notNull(),
    currentPeriodEnd: timestamp("current_period_end").notNull(),
    blockedAt: timestamp("blocked_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (t) => [
    uniqueIndex("subscriptions_user_id_id_unique").on(t.userId, t.id),
    foreignKey({
      columns: [t.userId, t.clientId],
      foreignColumns: [clients.userId, clients.id],
    }).onDelete("restrict"),
    check("subscriptions_grace_non_negative", sql`${t.gracePeriodDays} >= 0`),
    check("subscriptions_amount_positive", sql`${t.amount}::numeric > 0`),
    check(
      "subscriptions_custom_cycle_interval",
      sql`(${t.billingCycle}::text <> 'custom_days') OR (${t.billingIntervalDays} IS NOT NULL AND ${t.billingIntervalDays} >= 1)`,
    ),
  ],
);

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    subscriptionId: uuid("subscription_id").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    currency: currencyEnum("currency").notNull(),
    dueDate: date("due_date").notNull(),
    status: invoiceStatusEnum("status").notNull(),
    paidAt: timestamp("paid_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (t) => [
    uniqueIndex("invoices_user_id_id_unique").on(t.userId, t.id),
    /** One invoice per subscription per period end (AC-6.1.3); replaces non-unique cron listing index. */
    uniqueIndex("invoices_subscription_id_due_date_unique").on(t.subscriptionId, t.dueDate),
    foreignKey({
      columns: [t.userId, t.subscriptionId],
      foreignColumns: [subscriptions.userId, subscriptions.id],
    }).onDelete("restrict"),
  ],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    invoiceId: uuid("invoice_id").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    method: text("method").notNull(),
    note: text("note"),
    recordedAt: timestamp("recorded_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.userId, t.invoiceId],
      foreignColumns: [invoices.userId, invoices.id],
    }).onDelete("restrict"),
  ],
);

/** Costs use `billing_month` (first of month) for per-client monthly aggregation. */
export const costs = pgTable(
  "costs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    clientId: uuid("client_id").notNull(),
    category: costCategoryEnum("category").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    currency: currencyEnum("currency").notNull(),
    billingMonth: date("billing_month").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.userId, t.clientId],
      foreignColumns: [clients.userId, clients.id],
    }).onDelete("restrict"),
    check("costs_amount_non_negative", sql`${t.amount}::numeric >= 0`),
    index("costs_user_client_billing_month_idx").on(t.userId, t.clientId, t.billingMonth),
  ],
);

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    keyHash: text("key_hash").notNull(),
    prefix: text("prefix").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    revokedAt: timestamp("revoked_at"),
  },
  (t) => [index("api_keys_user_id_idx").on(t.userId)],
);

/**
 * `secret` stores ciphertext (e.g. AES-GCM) for outbound HMAC signing material — never plaintext.
 * See README (Phase 3).
 */
export const webhookEndpoints = pgTable(
  "webhook_endpoints",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    url: text("url").notNull(),
    secret: text("secret").notNull(),
    events: jsonb("events").notNull().$type<string[]>(),
    enabled: boolean("enabled").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("webhook_endpoints_user_id_idx").on(t.userId)],
);

export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    endpointId: uuid("endpoint_id")
      .notNull()
      .references(() => webhookEndpoints.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").notNull().$type<Record<string, unknown>>(),
    status: text("status").notNull(),
    attempts: integer("attempts").default(0).notNull(),
    lastError: text("last_error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("webhook_deliveries_endpoint_id_idx").on(t.endpointId)],
);

export const clientsRelations = relations(clients, ({ one, many }) => ({
  user: one(user, { fields: [clients.userId], references: [user.id] }),
  subscriptions: many(subscriptions),
  costs: many(costs),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  user: one(user, { fields: [subscriptions.userId], references: [user.id] }),
  client: one(clients, { fields: [subscriptions.clientId], references: [clients.id] }),
  invoices: many(invoices),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  user: one(user, { fields: [invoices.userId], references: [user.id] }),
  subscription: one(subscriptions, {
    fields: [invoices.subscriptionId],
    references: [subscriptions.id],
  }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(user, { fields: [payments.userId], references: [user.id] }),
  invoice: one(invoices, { fields: [payments.invoiceId], references: [invoices.id] }),
}));

export const costsRelations = relations(costs, ({ one }) => ({
  user: one(user, { fields: [costs.userId], references: [user.id] }),
  client: one(clients, { fields: [costs.clientId], references: [clients.id] }),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(user, { fields: [apiKeys.userId], references: [user.id] }),
}));

export const webhookEndpointsRelations = relations(webhookEndpoints, ({ one, many }) => ({
  user: one(user, { fields: [webhookEndpoints.userId], references: [user.id] }),
  deliveries: many(webhookDeliveries),
}));

export const webhookDeliveriesRelations = relations(webhookDeliveries, ({ one }) => ({
  endpoint: one(webhookEndpoints, {
    fields: [webhookDeliveries.endpointId],
    references: [webhookEndpoints.id],
  }),
}));
