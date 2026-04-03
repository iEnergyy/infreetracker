"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/db";
import { webhookEndpoints } from "@/db/schema";
import { auth } from "@/lib/auth";
import { getWebhookSecretEncryptionKeyBytes } from "@/lib/env";
import { encryptWebhookSigningSecret } from "@/lib/webhooks/secret-crypto";
import { generateWebhookSigningSecret } from "@/lib/webhooks/generate-signing-secret";
import { WebhookUrlValidationError, assertValidWebhookEndpointUrl } from "@/lib/webhooks/validate-endpoint-url";
import {
  eventsFromCreateInput,
  webhookEndpointCreateSchema,
} from "@/lib/validation/webhooks";

export interface WebhookEndpointListItem {
  id: string;
  url: string;
  enabled: boolean;
  events: string[];
  createdAt: string;
}

export async function listWebhookEndpointsForSession(): Promise<WebhookEndpointListItem[]> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return [];

  const rows = await db
    .select({
      id: webhookEndpoints.id,
      url: webhookEndpoints.url,
      enabled: webhookEndpoints.enabled,
      events: webhookEndpoints.events,
      createdAt: webhookEndpoints.createdAt,
    })
    .from(webhookEndpoints)
    .where(eq(webhookEndpoints.userId, session.user.id))
    .orderBy(desc(webhookEndpoints.createdAt));

  return rows.map((r) => ({
    id: r.id,
    url: r.url,
    enabled: r.enabled,
    events: r.events,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function createWebhookEndpointAction(raw: unknown): Promise<
  | { ok: true; signingSecretPlaintext: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }
> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "Unauthorized" };

  const parsed = webhookEndpointCreateSchema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    const fieldErrors: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(flat)) {
      if (v?.length) fieldErrors[k] = v;
    }
    return { ok: false, error: "Invalid form", fieldErrors };
  }

  const events = eventsFromCreateInput(parsed.data);
  if (events.length === 0) {
    return { ok: false, error: "Select at least one event" };
  }

  try {
    assertValidWebhookEndpointUrl(parsed.data.url);
  } catch (e) {
    if (e instanceof WebhookUrlValidationError) {
      return { ok: false, error: e.message };
    }
    throw e;
  }

  let key: Buffer;
  try {
    key = getWebhookSecretEncryptionKeyBytes();
  } catch {
    return {
      ok: false,
      error: "Set WEBHOOK_SECRET_ENCRYPTION_KEY in the environment (min 16 characters) to create webhooks.",
    };
  }

  const signingSecretPlaintext = generateWebhookSigningSecret();
  const secretCiphertext = encryptWebhookSigningSecret(signingSecretPlaintext, key);

  await db.insert(webhookEndpoints).values({
    userId: session.user.id,
    url: parsed.data.url.trim(),
    secret: secretCiphertext,
    events,
    enabled: true,
  });

  revalidatePath("/app/settings/webhooks");
  return { ok: true, signingSecretPlaintext };
}
