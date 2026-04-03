import { z } from "zod";
import { WEBHOOK_EVENT_PAYMENT_RECEIVED } from "@/lib/webhooks/webhook-events";

export const webhookEndpointCreateSchema = z.object({
  url: z.string().min(1, "URL is required"),
  paymentReceived: z.boolean(),
});

export type WebhookEndpointCreateInput = z.infer<typeof webhookEndpointCreateSchema>;

export function eventsFromCreateInput(input: WebhookEndpointCreateInput): string[] {
  const events: string[] = [];
  if (input.paymentReceived) events.push(WEBHOOK_EVENT_PAYMENT_RECEIVED);
  return events;
}
