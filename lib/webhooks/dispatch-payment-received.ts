/**
 * Outbound `payment.received` delivery (AC-7.2.2, §11.2 MVP).
 *
 * Payload shape: `{ event, timestamp, data }` (AC-11.2.1).
 * Signature: HMAC-SHA256 hex of the raw JSON body, header **`X-Webhook-Signature`**.
 *
 * MVP: single synchronous POST per endpoint; failures logged on `webhook_deliveries`.
 * Retries: document only for now (AC-11.2.3).
 */

import { createHmac } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { clients, invoices, payments, subscriptions, webhookDeliveries, webhookEndpoints } from "@/db/schema";
import type * as schema from "@/db/schema";
import { getWebhookSecretEncryptionKeyBytes } from "@/lib/env";
import { decryptWebhookSigningSecret } from "@/lib/webhooks/secret-crypto";
import { WEBHOOK_EVENT_PAYMENT_RECEIVED } from "@/lib/webhooks/webhook-events";

const SIGNATURE_HEADER = "X-Webhook-Signature";

export interface PaymentReceivedPayloadData {
  paymentId: string;
  invoiceId: string;
  subscriptionId: string;
  clientExternalId: string;
  amount: string;
  currency: string;
  method: string;
}

function endpointWantsEvent(events: string[] | null | undefined, event: string): boolean {
  return Array.isArray(events) && events.includes(event);
}

export async function dispatchPaymentReceivedWebhooks(
  database: NodePgDatabase<typeof schema>,
  params: { userId: string; paymentId: string; invoiceId: string },
): Promise<void> {
  let key: Buffer;
  try {
    key = getWebhookSecretEncryptionKeyBytes();
  } catch {
    return;
  }

  const [pay] = await database
    .select()
    .from(payments)
    .where(and(eq(payments.id, params.paymentId), eq(payments.userId, params.userId)))
    .limit(1);

  if (!pay) return;

  const [ctx] = await database
    .select({
      invoice: invoices,
      subscription: subscriptions,
      client: clients,
    })
    .from(invoices)
    .innerJoin(subscriptions, eq(invoices.subscriptionId, subscriptions.id))
    .innerJoin(clients, eq(subscriptions.clientId, clients.id))
    .where(and(eq(invoices.id, params.invoiceId), eq(invoices.userId, params.userId)))
    .limit(1);

  if (!ctx) return;

  const data: PaymentReceivedPayloadData = {
    paymentId: params.paymentId,
    invoiceId: params.invoiceId,
    subscriptionId: ctx.subscription.id,
    clientExternalId: ctx.client.externalId,
    amount: String(ctx.invoice.amount),
    currency: ctx.invoice.currency,
    method: pay.method,
  };

  const envelope = {
    event: WEBHOOK_EVENT_PAYMENT_RECEIVED,
    timestamp: new Date().toISOString(),
    data,
  };

  const body = JSON.stringify(envelope);

  const endpoints = await database
    .select()
    .from(webhookEndpoints)
    .where(and(eq(webhookEndpoints.userId, params.userId), eq(webhookEndpoints.enabled, true)));

  for (const ep of endpoints) {
    if (!endpointWantsEvent(ep.events, WEBHOOK_EVENT_PAYMENT_RECEIVED)) continue;

    let signingSecret: string;
    try {
      signingSecret = decryptWebhookSigningSecret(ep.secret, key);
    } catch {
      await database.insert(webhookDeliveries).values({
        endpointId: ep.id,
        eventType: WEBHOOK_EVENT_PAYMENT_RECEIVED,
        payload: { ...envelope, _dispatchError: "decrypt_signing_secret_failed" } as Record<
          string,
          unknown
        >,
        status: "failed",
        attempts: 1,
        lastError: "Could not decrypt endpoint signing secret",
      });
      continue;
    }

    const signature = createHmac("sha256", signingSecret).update(body, "utf8").digest("hex");

    let status: "delivered" | "failed" = "delivered";
    let lastError: string | null = null;

    try {
      const res = await fetch(ep.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [SIGNATURE_HEADER]: signature,
        },
        body,
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        status = "failed";
        lastError = `HTTP ${res.status} ${res.statusText}`;
      }
    } catch (e) {
      status = "failed";
      lastError = e instanceof Error ? e.message : String(e);
    }

    await database.insert(webhookDeliveries).values({
      endpointId: ep.id,
      eventType: WEBHOOK_EVENT_PAYMENT_RECEIVED,
      payload: envelope as unknown as Record<string, unknown>,
      status,
      attempts: 1,
      lastError,
    });
  }
}
