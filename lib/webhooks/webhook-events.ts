export const WEBHOOK_EVENT_PAYMENT_RECEIVED = "payment.received" as const;

export const WEBHOOK_EVENTS = [WEBHOOK_EVENT_PAYMENT_RECEIVED] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENTS)[number];
