import { randomBytes } from "node:crypto";

/** Random signing material for HMAC (shown once on create). */
export function generateWebhookSigningSecret(): string {
  return randomBytes(32).toString("base64url");
}
