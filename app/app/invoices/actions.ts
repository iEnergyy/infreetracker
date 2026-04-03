"use server";

import { and, asc, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/db";
import { clients, invoices, payments, subscriptions } from "@/db/schema";
import { auth } from "@/lib/auth";
import { recordFullPaymentInTransaction } from "@/lib/domain/record-full-payment";
import { dispatchPaymentReceivedWebhooks } from "@/lib/webhooks/dispatch-payment-received";
import { recordInvoicePaymentSchema } from "@/lib/validation/payments";

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

export interface InvoiceListItem {
  id: string;
  dueDate: string;
  amount: string;
  currency: string;
  status: string;
  clientId: string;
  clientName: string;
  subscriptionId: string;
}

export async function listInvoicesForSession(): Promise<InvoiceListItem[]> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return [];

  const rows = await db
    .select({
      id: invoices.id,
      dueDate: invoices.dueDate,
      amount: invoices.amount,
      currency: invoices.currency,
      status: invoices.status,
      clientId: clients.id,
      clientName: clients.name,
      subscriptionId: subscriptions.id,
    })
    .from(invoices)
    .innerJoin(
      subscriptions,
      and(
        eq(invoices.subscriptionId, subscriptions.id),
        eq(subscriptions.userId, session.user.id),
      ),
    )
    .innerJoin(
      clients,
      and(eq(subscriptions.clientId, clients.id), eq(clients.userId, session.user.id)),
    )
    .where(eq(invoices.userId, session.user.id))
    .orderBy(desc(invoices.dueDate), desc(invoices.createdAt));

  return rows.map((r) => ({
    id: r.id,
    dueDate: formatPgDate(r.dueDate),
    amount: String(r.amount),
    currency: r.currency,
    status: r.status,
    clientId: r.clientId,
    clientName: r.clientName,
    subscriptionId: r.subscriptionId,
  }));
}

export interface InvoicePaymentRow {
  id: string;
  amount: string;
  method: string;
  note: string | null;
  recordedAt: string;
}

export interface InvoiceDetailForSession {
  id: string;
  dueDate: string;
  amount: string;
  currency: "DOP" | "USD";
  status: "pending" | "paid" | "overdue";
  paidAt: string | null;
  createdAt: string;
  subscriptionId: string;
  subscriptionStatus: string;
  clientId: string;
  clientName: string;
  clientExternalId: string;
  payments: InvoicePaymentRow[];
}

export async function getInvoiceForSession(invoiceId: string): Promise<InvoiceDetailForSession | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const [row] = await db
    .select({
      invoice: invoices,
      subscription: subscriptions,
      clientName: clients.name,
      clientExternalId: clients.externalId,
    })
    .from(invoices)
    .innerJoin(
      subscriptions,
      and(
        eq(invoices.subscriptionId, subscriptions.id),
        eq(subscriptions.userId, session.user.id),
      ),
    )
    .innerJoin(
      clients,
      and(eq(subscriptions.clientId, clients.id), eq(clients.userId, session.user.id)),
    )
    .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, session.user.id)))
    .limit(1);

  if (!row) return null;

  const payRows = await db
    .select({
      id: payments.id,
      amount: payments.amount,
      method: payments.method,
      note: payments.note,
      recordedAt: payments.recordedAt,
    })
    .from(payments)
    .where(and(eq(payments.invoiceId, invoiceId), eq(payments.userId, session.user.id)))
    .orderBy(asc(payments.recordedAt), asc(payments.createdAt));

  const inv = row.invoice;

  return {
    id: inv.id,
    dueDate: formatPgDate(inv.dueDate),
    amount: String(inv.amount),
    currency: inv.currency,
    status: inv.status,
    paidAt: inv.paidAt ? inv.paidAt.toISOString() : null,
    createdAt: inv.createdAt.toISOString(),
    subscriptionId: row.subscription.id,
    subscriptionStatus: row.subscription.status,
    clientId: row.subscription.clientId,
    clientName: row.clientName,
    clientExternalId: row.clientExternalId,
    payments: payRows.map((p) => ({
      id: p.id,
      amount: String(p.amount),
      method: p.method,
      note: p.note,
      recordedAt: p.recordedAt.toISOString(),
    })),
  };
}

export async function recordInvoicePaymentAction(raw: unknown): Promise<
  | { ok: true }
  | { ok: false; fieldErrors: FieldErrors; formError?: string }
> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, fieldErrors: {}, formError: "Unauthorized" };

  const parsed = recordInvoicePaymentSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, fieldErrors: zodToFieldErrors(parsed.error) };
  }

  const { invoiceId, method, note } = parsed.data;

  const result = await recordFullPaymentInTransaction(db, {
    userId: session.user.id,
    invoiceId,
    method,
    note,
  });

  if (!result.ok) {
    if (result.code === "INVOICE_NOT_FOUND") {
      return { ok: false, fieldErrors: {}, formError: "Invoice not found" };
    }
    if (result.code === "INVALID_INVOICE_STATUS") {
      return { ok: false, fieldErrors: {}, formError: result.message };
    }
    return { ok: false, fieldErrors: {}, formError: result.message };
  }

  await dispatchPaymentReceivedWebhooks(db, {
    userId: session.user.id,
    paymentId: result.paymentId,
    invoiceId,
  });

  revalidatePath(`/app/invoices/${invoiceId}`);
  const [invRow] = await db
    .select({ subscriptionId: invoices.subscriptionId })
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, session.user.id)))
    .limit(1);
  if (invRow) {
    revalidatePath(`/app/subscriptions/${invRow.subscriptionId}`);
    revalidatePath("/app/subscriptions");
  }
  revalidatePath("/app/invoices");

  return { ok: true };
}
