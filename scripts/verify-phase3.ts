/**
 * Smoke checks for ROADMAP §3 (domain schema). Run: pnpm verify:phase3
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { db, pool } from "@/db";
import { getDatabaseUrl } from "@/lib/env";

const EXPECTED_TABLES = [
  "api_keys",
  "clients",
  "costs",
  "invoices",
  "payments",
  "subscriptions",
  "webhook_deliveries",
  "webhook_endpoints",
] as const;

try {
  getDatabaseUrl();

  const tables = await db.execute(sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'api_keys',
        'clients',
        'costs',
        'invoices',
        'payments',
        'subscriptions',
        'webhook_deliveries',
        'webhook_endpoints'
      )
    ORDER BY table_name
  `);

  const names = (tables.rows as { table_name: string }[]).map((r) => r.table_name);
  const missing = EXPECTED_TABLES.filter((t) => !names.includes(t));

  if (missing.length > 0) {
    console.error("Missing domain tables:", missing.join(", "));
    console.error("Found:", names.join(", ") || "(none)");
    process.exit(1);
  }

  const enums = await db.execute(sql`
    SELECT typname
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typtype = 'e'
      AND typname IN (
        'cost_category',
        'currency',
        'invoice_status',
        'subscription_billing_cycle',
        'subscription_status'
      )
    ORDER BY typname
  `);

  const enumNameSet = new Set(
    (enums.rows as { typname: string }[]).map((r) => r.typname),
  );
  const expectedEnums = [
    "cost_category",
    "currency",
    "invoice_status",
    "subscription_billing_cycle",
    "subscription_status",
  ];
  const missingEnums = expectedEnums.filter((e) => !enumNameSet.has(e));
  if (missingEnums.length > 0) {
    console.error("Missing enum types:", missingEnums.join(", "));
    process.exit(1);
  }

  console.log("Phase 3 checks OK:");
  console.log("  - tables:", EXPECTED_TABLES.join(", "));
  console.log("  - enums:", expectedEnums.join(", "));
  await pool.end();
} catch (err) {
  console.error(err);
  process.exit(1);
}
