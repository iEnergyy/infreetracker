import { listWebhookEndpointsForSession } from "@/app/app/settings/webhooks/actions";
import { WebhooksPanel } from "@/components/settings/webhooks-panel";

export default async function WebhooksSettingsPage() {
  const endpoints = await listWebhookEndpointsForSession();

  return (
    <div className="mx-auto max-w-3xl flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-lg font-medium">Webhooks</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Receive <code className="bg-muted rounded px-1 py-0.5 text-xs">payment.received</code> when an
          invoice is marked paid in the dashboard.
        </p>
      </div>
      <WebhooksPanel endpoints={endpoints} />
    </div>
  );
}
