"use server";

import { and, asc, desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { clients, invoices, subscriptions } from "@/db/schema";
import { auth } from "@/lib/auth";
import { createSubscriptionWithFirstInvoice } from "@/lib/domain/create-subscription-with-first-invoice";
import { subscriptionCreateSchema, subscriptionUpdateSchema } from "@/lib/validation/subscriptions";

export type FieldErrors = Record<string, string[]>;

function zodToFieldErrors(err: { flatten(): { fieldErrors: Record<string, string[] | undefined> } }): FieldErrors {
  const flat = err.flatten().fieldErrors;
  const out: FieldErrors = {};
  for (const [k, v] of Object.entries(flat)) {
    if (v?.length) out[k] = v;
  }
  return out;
}

function formatPgDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "string") return value.slice(0, 10);
  return String(value);
}

export async function createSubscriptionAction(raw: unknown): Promise<
  | { ok: true; subscriptionId: string }
  | { ok: false; fieldErrors: FieldErrors; formError?: string }
> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, fieldErrors: {}, formError: "Unauthorized" };

  const parsed = subscriptionCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, fieldErrors: zodToFieldErrors(parsed.error) };
  }

  const data = parsed.data;

  const result = await createSubscriptionWithFirstInvoice(db, {
    userId: session.user.id,
    clientId: data.clientId,
    amount: data.amount,
    currency: data.currency,
    billingCycle: data.billingCycle,
    billingIntervalDays: data.billingCycle === "custom_days" ? data.billingIntervalDays : null,
    startDate: data.startDate,
    gracePeriodDays: data.gracePeriodDays,
  });

  if (!result.ok) {
    if (result.code === "CLIENT_NOT_FOUND") {
      return { ok: false, fieldErrors: { clientId: ["Select a valid client"] } };
    }
    return { ok: false, fieldErrors: {}, formError: result.message };
  }

  return { ok: true, subscriptionId: result.subscriptionId };
}

export async function updateSubscriptionAction(raw: unknown): Promise<
  { ok: true } | { ok: false; fieldErrors: FieldErrors; formError?: string }
> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, fieldErrors: {}, formError: "Unauthorized" };

  const parsed = subscriptionUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, fieldErrors: zodToFieldErrors(parsed.error) };
  }

  const data = parsed.data;

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.id, data.subscriptionId), eq(subscriptions.userId, session.user.id)))
    .limit(1);

  if (!sub) {
    return { ok: false, fieldErrors: {}, formError: "Subscription not found" };
  }

  if (sub.billingCycle === "custom_days") {
    const interval = data.billingIntervalDays ?? sub.billingIntervalDays;
    if (interval == null || interval < 1) {
      return {
        ok: false,
        fieldErrors: { billingIntervalDays: ["Interval days must be at least 1"] },
      };
    }
    await db
      .update(subscriptions)
      .set({
        amount: data.amount,
        gracePeriodDays: data.gracePeriodDays,
        billingIntervalDays: interval,
        updatedAt: new Date(),
      })
      .where(and(eq(subscriptions.id, data.subscriptionId), eq(subscriptions.userId, session.user.id)));
  } else {
    await db
      .update(subscriptions)
      .set({
        amount: data.amount,
        gracePeriodDays: data.gracePeriodDays,
        updatedAt: new Date(),
      })
      .where(and(eq(subscriptions.id, data.subscriptionId), eq(subscriptions.userId, session.user.id)));
  }

  return { ok: true };
}

export interface SubscriptionListItem {
  id: string;
  clientId: string;
  clientName: string;
  amount: string;
  currency: string;
  billingCycle: string;
  billingIntervalDays: number | null;
  gracePeriodDays: number;
  status: string;
  startDate: string;
  currentPeriodEnd: string;
}

export async function listSubscriptionsForSession(): Promise<SubscriptionListItem[]> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return [];

  const rows = await db
    .select({
      id: subscriptions.id,
      clientId: subscriptions.clientId,
      clientName: clients.name,
      amount: subscriptions.amount,
      currency: subscriptions.currency,
      billingCycle: subscriptions.billingCycle,
      billingIntervalDays: subscriptions.billingIntervalDays,
      gracePeriodDays: subscriptions.gracePeriodDays,
      status: subscriptions.status,
      startDate: subscriptions.startDate,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
    })
    .from(subscriptions)
    .innerJoin(
      clients,
      and(eq(subscriptions.clientId, clients.id), eq(clients.userId, session.user.id)),
    )
    .where(eq(subscriptions.userId, session.user.id))
    .orderBy(desc(subscriptions.createdAt));

  return rows.map((r) => ({
    id: r.id,
    clientId: r.clientId,
    clientName: r.clientName,
    amount: String(r.amount),
    currency: r.currency,
    billingCycle: r.billingCycle,
    billingIntervalDays: r.billingIntervalDays,
    gracePeriodDays: r.gracePeriodDays,
    status: r.status,
    startDate: formatPgDate(r.startDate),
    currentPeriodEnd: r.currentPeriodEnd.toISOString(),
  }));
}

export interface SubscriptionInvoiceRow {
  id: string;
  dueDate: string;
  amount: string;
  currency: string;
  status: string;
  paidAt: string | null;
}

export interface SubscriptionDetail {
  id: string;
  clientId: string;
  clientName: string;
  clientExternalId: string;
  amount: string;
  currency: "DOP" | "USD";
  billingCycle: "monthly" | "custom_days";
  billingIntervalDays: number | null;
  startDate: string;
  gracePeriodDays: number;
  status: "active" | "grace" | "overdue" | "blocked";
  currentPeriodEnd: string;
  blockedAt: string | null;
  createdAt: string;
  invoices: SubscriptionInvoiceRow[];
}

export async function getSubscriptionForSession(subscriptionId: string): Promise<SubscriptionDetail | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const [row] = await db
    .select({
      sub: subscriptions,
      clientName: clients.name,
      clientExternalId: clients.externalId,
    })
    .from(subscriptions)
    .innerJoin(
      clients,
      and(eq(subscriptions.clientId, clients.id), eq(clients.userId, session.user.id)),
    )
    .where(and(eq(subscriptions.id, subscriptionId), eq(subscriptions.userId, session.user.id)))
    .limit(1);

  if (!row) return null;

  const invRows = await db
    .select({
      id: invoices.id,
      dueDate: invoices.dueDate,
      amount: invoices.amount,
      currency: invoices.currency,
      status: invoices.status,
      paidAt: invoices.paidAt,
    })
    .from(invoices)
    .where(and(eq(invoices.subscriptionId, subscriptionId), eq(invoices.userId, session.user.id)))
    .orderBy(asc(invoices.dueDate), asc(invoices.createdAt));

  const s = row.sub;

  return {
    id: s.id,
    clientId: s.clientId,
    clientName: row.clientName,
    clientExternalId: row.clientExternalId,
    amount: String(s.amount),
    currency: s.currency,
    billingCycle: s.billingCycle,
    billingIntervalDays: s.billingIntervalDays,
    startDate: formatPgDate(s.startDate),
    gracePeriodDays: s.gracePeriodDays,
    status: s.status,
    currentPeriodEnd: s.currentPeriodEnd.toISOString(),
    blockedAt: s.blockedAt ? s.blockedAt.toISOString() : null,
    createdAt: s.createdAt.toISOString(),
    invoices: invRows.map((inv) => ({
      id: inv.id,
      dueDate: formatPgDate(inv.dueDate),
      amount: String(inv.amount),
      currency: inv.currency,
      status: inv.status,
      paidAt: inv.paidAt ? inv.paidAt.toISOString() : null,
    })),
  };
}
