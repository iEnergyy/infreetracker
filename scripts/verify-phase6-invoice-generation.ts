/**
 * Regression: pay first invoice → generate next (idempotent ×2). Requires DATABASE_URL,
 * migration `0002_*` applied (unique invoices_subscription_id_due_date_unique), and a `user` row.
 * Run: pnpm verify:phase6-invoices
 */
import "dotenv/config";
import { and, eq, inArray } from "drizzle-orm";
import { db, pool } from "@/db";
import { clients, invoices, payments, subscriptions, user } from "@/db/schema";
import { computeFirstPeriodEnd, computeNextPeriodEnd } from "@/lib/billing/first-period-end";
import { createSubscriptionWithFirstInvoice } from "@/lib/domain/create-subscription-with-first-invoice";
import { generateNextInvoiceForSubscription } from "@/lib/domain/generate-next-invoice";
import { recordFullPaymentInTransaction } from "@/lib/domain/record-full-payment";
import { getDatabaseUrl } from "@/lib/env";

function randomSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function cleanupSubscription(userId: string, subscriptionId: string): Promise<void> {
  const invRows = await db
    .select({ id: invoices.id })
    .from(invoices)
    .where(and(eq(invoices.subscriptionId, subscriptionId), eq(invoices.userId, userId)));
  const invIds = invRows.map((r) => r.id);
  if (invIds.length) {
    await db.delete(payments).where(inArray(payments.invoiceId, invIds));
  }
  await db.delete(invoices).where(eq(invoices.subscriptionId, subscriptionId));
  await db
    .delete(subscriptions)
    .where(and(eq(subscriptions.id, subscriptionId), eq(subscriptions.userId, userId)));
}

try {
  getDatabaseUrl();

  const [existingUser] = await db.select({ id: user.id }).from(user).limit(1);
  if (!existingUser) {
    console.log("SKIP: no user in database (register once, then re-run)");
    await pool.end();
    process.exit(0);
  }

  const userId = existingUser.id;
  const suffix = randomSuffix();

  const [client] = await db
    .insert(clients)
    .values({
      userId,
      name: `verify-p6-${suffix}`,
      externalId: `verify-p6-${suffix}`,
    })
    .returning({ id: clients.id });

  if (!client) throw new Error("client insert failed");

  const startDate = "2026-01-01";
  const billingIntervalDays = 14;

  const created = await createSubscriptionWithFirstInvoice(db, {
    userId,
    clientId: client.id,
    amount: "25.00",
    currency: "USD",
    billingCycle: "custom_days",
    billingIntervalDays,
    startDate,
    gracePeriodDays: 0,
  });

  if (!created.ok) throw new Error(`create failed: ${created.message}`);

  const subId = created.subscriptionId;

  const [firstInv] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.subscriptionId, subId))
    .limit(1);

  if (!firstInv) throw new Error("expected first invoice");

  const firstEnd = computeFirstPeriodEnd({
    startDate,
    billingCycle: "custom_days",
    billingIntervalDays,
  });

  const due1 =
    typeof firstInv.dueDate === "string" ? firstInv.dueDate.slice(0, 10) : String(firstInv.dueDate);
  if (due1 !== firstEnd.firstPeriodEndDate) {
    throw new Error(`first due_date: expected ${firstEnd.firstPeriodEndDate}, got ${due1}`);
  }

  const paid = await recordFullPaymentInTransaction(db, {
    userId,
    invoiceId: firstInv.id,
    method: "cash",
  });
  if (!paid.ok) throw new Error(`pay failed: ${paid.message}`);

  const nextEnd = computeNextPeriodEnd({
    periodEndDate: firstEnd.firstPeriodEndDate,
    billingCycle: "custom_days",
    billingIntervalDays,
  });

  const g1 = await generateNextInvoiceForSubscription(db, { subscriptionId: subId });
  if (!g1.ok) throw new Error(`generate 1: ${g1.message}`);
  if (!g1.created) throw new Error("generate 1: expected created true");

  const g2 = await generateNextInvoiceForSubscription(db, { subscriptionId: subId });
  if (!g2.ok) throw new Error(`generate 2: ${g2.message}`);
  if (g2.created) throw new Error("generate 2: expected idempotent no new row");

  const allInv = await db.select().from(invoices).where(eq(invoices.subscriptionId, subId));
  if (allInv.length !== 2) {
    throw new Error(`expected 2 invoices, got ${allInv.length}`);
  }

  const [subAfter] = await db.select().from(subscriptions).where(eq(subscriptions.id, subId)).limit(1);
  if (!subAfter) throw new Error("subscription missing");

  const cpe = subAfter.currentPeriodEnd.toISOString().slice(0, 10);
  if (cpe !== nextEnd.nextPeriodEndDate) {
    throw new Error(`current_period_end: expected ${nextEnd.nextPeriodEndDate}, got ${cpe}`);
  }

  await cleanupSubscription(userId, subId);
  await db.delete(clients).where(eq(clients.id, client.id));

  console.log("Phase 6 invoice generation OK (next due", nextEnd.nextPeriodEndDate, ")");
  await pool.end();
} catch (err) {
  console.error(err);
  await pool.end();
  process.exit(1);
}
