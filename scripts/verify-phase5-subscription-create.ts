/**
 * Regression: createSubscriptionWithFirstInvoice + first-period math (month-end + custom_days).
 * Requires DATABASE_URL and at least one `user` row. Run: pnpm verify:phase5-subscription
 */
import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { db, pool } from "@/db";
import { clients, invoices, subscriptions, user } from "@/db/schema";
import { computeFirstPeriodEnd } from "@/lib/billing/first-period-end";
import { createSubscriptionWithFirstInvoice } from "@/lib/domain/create-subscription-with-first-invoice";
import { getDatabaseUrl } from "@/lib/env";

function randomSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function cleanupSubscription(userId: string, subscriptionId: string): Promise<void> {
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
      name: `verify-sub-${suffix}`,
      externalId: `verify-sub-${suffix}`,
    })
    .returning({ id: clients.id });

  if (!client) throw new Error("client insert failed");

  const monthlyEnd = computeFirstPeriodEnd({
    startDate: "2026-01-31",
    billingCycle: "monthly",
  });

  const monthly = await createSubscriptionWithFirstInvoice(db, {
    userId,
    clientId: client.id,
    amount: "99.00",
    currency: "USD",
    billingCycle: "monthly",
    billingIntervalDays: null,
    startDate: "2026-01-31",
    gracePeriodDays: 2,
  });

  if (!monthly.ok) throw new Error(`monthly create failed: ${monthly.message}`);

  const [invM] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.subscriptionId, monthly.subscriptionId))
    .limit(1);

  if (!invM) throw new Error("monthly: no invoice");
  const dueM = typeof invM.dueDate === "string" ? invM.dueDate.slice(0, 10) : String(invM.dueDate);
  if (dueM !== monthlyEnd.firstPeriodEndDate) {
    throw new Error(`monthly due_date: expected ${monthlyEnd.firstPeriodEndDate}, got ${dueM}`);
  }

  const [subM] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, monthly.subscriptionId))
    .limit(1);
  if (!subM || subM.status !== "active") {
    throw new Error(`Expected subscription active, got ${JSON.stringify(subM)}`);
  }

  await cleanupSubscription(userId, monthly.subscriptionId);

  const customEnd = computeFirstPeriodEnd({
    startDate: "2026-01-01",
    billingCycle: "custom_days",
    billingIntervalDays: 14,
  });

  const custom = await createSubscriptionWithFirstInvoice(db, {
    userId,
    clientId: client.id,
    amount: "10.00",
    currency: "DOP",
    billingCycle: "custom_days",
    billingIntervalDays: 14,
    startDate: "2026-01-01",
    gracePeriodDays: 0,
  });

  if (!custom.ok) throw new Error(`custom create failed: ${custom.message}`);

  const [invC] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.subscriptionId, custom.subscriptionId))
    .limit(1);

  if (!invC) throw new Error("custom: no invoice");
  const dueC = typeof invC.dueDate === "string" ? invC.dueDate.slice(0, 10) : String(invC.dueDate);
  if (dueC !== customEnd.firstPeriodEndDate) {
    throw new Error(`custom due_date: expected ${customEnd.firstPeriodEndDate}, got ${dueC}`);
  }

  await cleanupSubscription(userId, custom.subscriptionId);
  await db.delete(clients).where(eq(clients.id, client.id));

  console.log(
    "Phase 5 subscription create OK (month-end",
    monthlyEnd.firstPeriodEndDate,
    ", custom",
    customEnd.firstPeriodEndDate,
    ")",
  );
  await pool.end();
} catch (err) {
  console.error(err);
  await pool.end();
  process.exit(1);
}
