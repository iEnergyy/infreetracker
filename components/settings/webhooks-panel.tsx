"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { WebhookEndpointListItem } from "@/app/app/settings/webhooks/actions";
import { createWebhookEndpointAction } from "@/app/app/settings/webhooks/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WEBHOOK_EVENT_PAYMENT_RECEIVED } from "@/lib/webhooks/webhook-events";

interface WebhooksPanelProps {
  readonly endpoints: WebhookEndpointListItem[];
}

export function WebhooksPanel({ endpoints }: WebhooksPanelProps) {
  const [url, setUrl] = useState("");
  const [paymentReceived, setPaymentReceived] = useState(true);
  const [pending, setPending] = useState(false);
  const [shownSecret, setShownSecret] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setShownSecret(null);
    setPending(true);
    const result = await createWebhookEndpointAction({
      url,
      paymentReceived,
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setShownSecret(result.signingSecretPlaintext);
    setUrl("");
    toast.success("Webhook endpoint created — copy the signing secret now.");
  }

  return (
    <div className="flex flex-col gap-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add endpoint</CardTitle>
          <CardDescription>
            Signing secret is shown once. Store it where your receiver verifies{" "}
            <code className="text-xs">X-Webhook-Signature</code> (HMAC-SHA256 of the JSON body).
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="wh-url">URL</Label>
              <Input
                id="wh-url"
                name="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/webhooks/cobroflow"
                autoComplete="off"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="wh-pay"
                checked={paymentReceived}
                onChange={(e) => setPaymentReceived(e.target.checked)}
                className="border-input size-4 rounded border"
              />
              <Label htmlFor="wh-pay" className="font-normal">
                {WEBHOOK_EVENT_PAYMENT_RECEIVED}
              </Label>
            </div>
            {shownSecret ? (
              <div className="bg-muted rounded-md border p-3 font-mono text-xs break-all">
                <p className="text-muted-foreground mb-1 text-[11px] font-sans">Signing secret (copy now)</p>
                {shownSecret}
              </div>
            ) : null}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create endpoint"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-medium">Your endpoints</h2>
        {endpoints.length === 0 ? (
          <p className="text-muted-foreground text-sm">No webhook endpoints yet.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {endpoints.map((ep) => (
              <li
                key={ep.id}
                className="border-border flex flex-col gap-1 rounded-md border px-3 py-2"
              >
                <span className="font-mono text-xs break-all">{ep.url}</span>
                <span className="text-muted-foreground text-xs">
                  {ep.enabled ? "Enabled" : "Disabled"} · {ep.events.join(", ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
