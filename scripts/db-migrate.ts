/**
 * Run Drizzle migrations with explicit error output (mirrors drizzle-kit migrate).
 * Usage: pnpm exec tsx scripts/db-migrate.ts
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { getDatabaseUrl } from "@/lib/env";
import * as schema from "@/db/schema";
import { resolve } from "node:path";

const migrationsFolder = resolve(process.cwd(), "drizzle");

async function main() {
  const url = getDatabaseUrl();
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });
  try {
    await migrate(db, { migrationsFolder });
    console.log("Migrations applied OK:", migrationsFolder);
  } finally {
    await pool.end();
  }
}

main().catch((err: unknown) => {
  console.error("Migration failed:");
  console.error(err);
  process.exit(1);
});
