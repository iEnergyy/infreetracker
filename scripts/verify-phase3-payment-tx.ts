/**
 * Regression check for AC-3.4.2: recordFullPaymentInTransaction updates invoice + inserts payment atomically.
 * Requires DATABASE_URL and at least one row in `user` (e.g. after registering once). Run: pnpm verify:phase3-payment-tx
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db, pool } from "@/db";
import { clients, invoices, payments, subscriptions, user } from "@/db/schema";
import { getDatabaseUrl } from "@/lib/env";
import { recordFullPaymentInTransaction } from "@/lib/domain/record-full-payment";

function randomSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

try {
  getDatabaseUrl();

  const [existingUser] = await db.select({ id: user.id }).from(user).limit(1);
  if (!existingUser) {
    console.log("SKIP: no user in database (register once, then re-run)");
    await pool.end();
    process.exit(0);
  }

  const suffix = randomSuffix();
  const userId = existingUser.id;

  const [client] = await db
    .insert(clients)
    .values({
      userId,
      name: `verify-payment-${suffix}`,
      externalId: `verify-pay-${suffix}`,
    })
    .returning({ id: clients.id });

  if (!client) throw new Error("client insert failed");

  const [sub] = await db
    .insert(subscriptions)
    .values({
      userId,
      clientId: client.id,
      amount: "10.00",
      currency: "USD",
      billingCycle: "monthly",
      startDate: "2026-01-01",
      gracePeriodDays: 0,
      status: "active",
      currentPeriodEnd: new Date("2026-02-01T00:00:00Z"),
    })
    .returning({ id: subscriptions.id });

  if (!sub) throw new Error("subscription insert failed");

  const [inv] = await db
    .insert(invoices)
    .values({
      userId,
      subscriptionId: sub.id,
      amount: "10.00",
      currency: "USD",
      dueDate: "2026-01-15",
      status: "pending",
    })
    .returning({ id: invoices.id });

  if (!inv) throw new Error("invoice insert failed");

  const result = await recordFullPaymentInTransaction(db, {
    userId,
    invoiceId: inv.id,
    method: "cash",
    note: "verify script",
  });

  if (!result.ok) {
    console.error("recordFullPaymentInTransaction failed:", result);
    process.exit(1);
  }

  const [paid] = await db.select().from(invoices).where(eq(invoices.id, inv.id)).limit(1);
  if (!paid || paid.status !== "paid" || !paid.paidAt) {
    console.error("Expected invoice status paid with paid_at set, got:", paid);
    process.exit(1);
  }

  await db.delete(payments).where(eq(payments.invoiceId, inv.id));
  await db.delete(invoices).where(eq(invoices.id, inv.id));
  await db.delete(subscriptions).where(eq(subscriptions.id, sub.id));
  await db.delete(clients).where(eq(clients.id, client.id));

  console.log("AC-3.4.2 payment transaction OK (payment id:", result.paymentId, ")");
  await pool.end();
} catch (err) {
  console.error(err);
  process.exit(1);
}
