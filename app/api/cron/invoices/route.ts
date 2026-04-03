import { db } from "@/db";
import { getCronSecret } from "@/lib/env";
import { runInvoiceGenerationJob } from "@/lib/jobs/run-invoice-generation";

export const dynamic = "force-dynamic";

/**
 * Secured cron entrypoint (AC-6.3.2). Send `Authorization: Bearer <CRON_SECRET>`.
 * Vercel Cron includes this header when `CRON_SECRET` is set in project env.
 */
export async function GET(request: Request) {
  let secret: string;
  try {
    secret = getCronSecret();
  } catch {
    return new Response("Cron not configured", { status: 503 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const summary = await runInvoiceGenerationJob(db);
  return Response.json(summary);
}
