/**
 * Regression: overdue subscription → record payment → status active (AC-7.1.3).
 * Requires DATABASE_URL, migrations, and a `user` row. Run: pnpm verify:phase7-payments
 */
import "dotenv/config";
import { and, eq, inArray } from "drizzle-orm";
import { db, pool } from "@/db";
import { clients, invoices, payments, subscriptions, user } from "@/db/schema";
import { createSubscriptionWithFirstInvoice } from "@/lib/domain/create-subscription-with-first-invoice";
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
      name: `verify-p7-${suffix}`,
      externalId: `verify-p7-${suffix}`,
    })
    .returning({ id: clients.id });

  if (!client) throw new Error("client insert failed");

  const created = await createSubscriptionWithFirstInvoice(db, {
    userId,
    clientId: client.id,
    amount: "40.00",
    currency: "USD",
    billingCycle: "monthly",
    billingIntervalDays: null,
    startDate: "2026-02-01",
    gracePeriodDays: 1,
  });

  if (!created.ok) throw new Error(`create failed: ${created.message}`);

  const subId = created.subscriptionId;

  await db
    .update(subscriptions)
    .set({ status: "overdue", updatedAt: new Date() })
    .where(and(eq(subscriptions.id, subId), eq(subscriptions.userId, userId)));

  const [firstInv] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.subscriptionId, subId))
    .limit(1);

  if (!firstInv) throw new Error("no invoice");

  const paid = await recordFullPaymentInTransaction(db, {
    userId,
    invoiceId: firstInv.id,
    method: "bank_transfer",
    note: "phase7 verify",
  });

  if (!paid.ok) throw new Error(`pay failed: ${paid.message}`);

  const [subAfter] = await db.select().from(subscriptions).where(eq(subscriptions.id, subId)).limit(1);
  if (!subAfter || subAfter.status !== "active") {
    throw new Error(`expected subscription active after pay, got ${subAfter?.status}`);
  }

  await cleanupSubscription(userId, subId);
  await db.delete(clients).where(eq(clients.id, client.id));

  console.log("Phase 7 payments OK (overdue → active after record payment)");
  await pool.end();
} catch (err) {
  console.error(err);
  await pool.end();
  process.exit(1);
}
