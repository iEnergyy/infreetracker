"use server";

import { and, asc, count, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { clients, subscriptions } from "@/db/schema";
import { auth } from "@/lib/auth";
import { clientCreateSchema, clientUpdateSchema } from "@/lib/validation/clients";

export type FieldErrors = Record<string, string[]>;

function zodToFieldErrors(err: { flatten(): { fieldErrors: Record<string, string[] | undefined> } }): FieldErrors {
  const flat = err.flatten().fieldErrors;
  const out: FieldErrors = {};
  for (const [k, v] of Object.entries(flat)) {
    if (v?.length) out[k] = v;
  }
  return out;
}

function isPgUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "23505"
  );
}

export async function createClientAction(raw: unknown): Promise<
  | { ok: true; clientId: string }
  | { ok: false; fieldErrors: FieldErrors; formError?: string }
> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, fieldErrors: {}, formError: "Unauthorized" };

  const parsed = clientCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, fieldErrors: zodToFieldErrors(parsed.error) };
  }

  const data = parsed.data;

  const [existing] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.userId, session.user.id), eq(clients.externalId, data.externalId)))
    .limit(1);

  if (existing) {
    return {
      ok: false,
      fieldErrors: { externalId: ["This external ID is already in use"] },
    };
  }

  try {
    const [row] = await db
      .insert(clients)
      .values({
        userId: session.user.id,
        name: data.name,
        externalId: data.externalId,
        contact: data.contact ?? null,
        notes: data.notes ?? null,
      })
      .returning({ id: clients.id });

    if (!row) return { ok: false, fieldErrors: {}, formError: "Could not create client" };

    return { ok: true, clientId: row.id };
  } catch (e) {
    if (isPgUniqueViolation(e)) {
      return {
        ok: false,
        fieldErrors: { externalId: ["This external ID is already in use"] },
      };
    }
    throw e;
  }
}

export async function updateClientAction(raw: unknown): Promise<
  { ok: true } | { ok: false; fieldErrors: FieldErrors; formError?: string }
> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, fieldErrors: {}, formError: "Unauthorized" };

  const parsed = clientUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, fieldErrors: zodToFieldErrors(parsed.error) };
  }

  const data = parsed.data;

  const [owned] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, data.clientId), eq(clients.userId, session.user.id)))
    .limit(1);

  if (!owned) return { ok: false, fieldErrors: {}, formError: "Client not found" };

  await db
    .update(clients)
    .set({
      name: data.name,
      contact: data.contact ?? null,
      notes: data.notes ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(clients.id, data.clientId), eq(clients.userId, session.user.id)));

  return { ok: true };
}

export async function deleteClientAction(clientId: string): Promise<
  { ok: true } | { ok: false; formError: string }
> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, formError: "Unauthorized" };

  const [owned] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.userId, session.user.id)))
    .limit(1);

  if (!owned) return { ok: false, formError: "Client not found" };

  const [subCount] = await db
    .select({ n: count() })
    .from(subscriptions)
    .where(and(eq(subscriptions.clientId, clientId), eq(subscriptions.userId, session.user.id)));

  const n = Number(subCount?.n ?? 0);
  if (n > 0) {
    return {
      ok: false,
      formError:
        "This client has subscriptions. Remove or reassign them before deleting the client.",
    };
  }

  await db.delete(clients).where(and(eq(clients.id, clientId), eq(clients.userId, session.user.id)));

  return { ok: true };
}

export interface ClientSummary {
  id: string;
  name: string;
  externalId: string;
  contact: string | null;
  createdAt: string;
}

export interface ClientDetail extends ClientSummary {
  notes: string | null;
}

export async function listClientsForSession(): Promise<ClientSummary[]> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return [];

  const rows = await db
    .select({
      id: clients.id,
      name: clients.name,
      externalId: clients.externalId,
      contact: clients.contact,
      createdAt: clients.createdAt,
    })
    .from(clients)
    .where(eq(clients.userId, session.user.id))
    .orderBy(asc(clients.name));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    externalId: r.externalId,
    contact: r.contact,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function getClientForSession(clientId: string): Promise<ClientDetail | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const [row] = await db
    .select({
      id: clients.id,
      name: clients.name,
      externalId: clients.externalId,
      contact: clients.contact,
      notes: clients.notes,
      createdAt: clients.createdAt,
    })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.userId, session.user.id)))
    .limit(1);

  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    externalId: row.externalId,
    contact: row.contact,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
  };
}
