/**
 * Rules (see README): production webhook URLs must be HTTPS; dev may use http://localhost or 127.0.0.1.
 * Call this from webhook create/update server actions (§11.1) before persisting.
 */

function isProductionLike(): boolean {
  if (process.env.VERCEL_ENV === "production") return true;
  if (process.env.NODE_ENV === "production") return true;
  return false;
}

function isLocalHttpAllowed(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export class WebhookUrlValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookUrlValidationError";
  }
}

/**
 * @throws WebhookUrlValidationError when the URL is not allowed for the current environment.
 */
export function assertValidWebhookEndpointUrl(rawUrl: string): void {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    throw new WebhookUrlValidationError("URL is required");
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new WebhookUrlValidationError("Invalid URL");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new WebhookUrlValidationError("URL must use http or https");
  }

  if (parsed.protocol === "https:") return;

  // http: — only outside production-like env, and only for local hosts
  if (isProductionLike()) {
    throw new WebhookUrlValidationError("Webhook URL must use HTTPS in production");
  }

  if (!isLocalHttpAllowed(parsed.hostname)) {
    throw new WebhookUrlValidationError(
      "HTTP is only allowed for localhost / 127.0.0.1 in development",
    );
  }
}
