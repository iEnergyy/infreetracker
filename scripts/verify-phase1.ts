/**
 * One-off checks for ROADMAP §1. Run: pnpm exec tsx scripts/verify-phase1.ts
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { db, pool } from "@/db";
import { getBetterAuthSecret, getBetterAuthUrl, getDatabaseUrl } from "@/lib/env";

try {
  getDatabaseUrl();
  getBetterAuthSecret();
  getBetterAuthUrl();

  const tables = await db.execute(sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('user', 'session', 'account', 'verification')
    ORDER BY table_name
  `);

  const names = (tables.rows as { table_name: string }[]).map((r) => r.table_name);
  const expected = ["account", "session", "user", "verification"];
  const missing = expected.filter((t) => !names.includes(t));

  if (missing.length > 0) {
    console.error("Missing tables:", missing.join(", "));
    console.error("Found:", names.join(", ") || "(none)");
    process.exit(1);
  }

  const { auth } = await import("@/lib/auth");
  if (!auth?.options?.database) {
    console.error("Better Auth did not load database adapter");
    process.exit(1);
  }

  console.log("Phase 1 checks OK:");
  console.log("  - env: DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL present");
  console.log("  - tables:", expected.join(", "));
  console.log("  - Better Auth instance loads with Drizzle adapter");
  await pool.end();
} catch (err) {
  console.error(err);
  process.exit(1);
}
