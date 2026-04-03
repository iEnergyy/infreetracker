/**
 * Daily invoice generation batch (ROADMAP §6.3.1). Skips `blocked` via DB filter.
 */

import { inArray } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { subscriptions } from "@/db/schema";
import type * as schema from "@/db/schema";
import { generateNextInvoiceForSubscription } from "@/lib/domain/generate-next-invoice";

const BILLABLE_STATUSES = ["active", "grace", "overdue"] as const;

export interface RunInvoiceGenerationSummary {
  scanned: number;
  created: number;
  skipped: number;
  errors: { subscriptionId: string; message: string }[];
}

export async function runInvoiceGenerationJob(
  database: NodePgDatabase<typeof schema>,
): Promise<RunInvoiceGenerationSummary> {
  const rows = await database
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(inArray(subscriptions.status, [...BILLABLE_STATUSES]));

  let created = 0;
  let skipped = 0;
  const errors: RunInvoiceGenerationSummary["errors"] = [];

  for (const row of rows) {
    try {
      const r = await generateNextInvoiceForSubscription(database, { subscriptionId: row.id });
      if (!r.ok) {
        if (r.code === "BLOCKED" || r.code === "NOT_BILLABLE_STATUS") {
          skipped += 1;
          continue;
        }
        errors.push({ subscriptionId: row.id, message: `${r.code}: ${r.message}` });
        continue;
      }
      if (r.created) created += 1;
      else skipped += 1;
    } catch (e) {
      errors.push({
        subscriptionId: row.id,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return { scanned: rows.length, created, skipped, errors };
}
