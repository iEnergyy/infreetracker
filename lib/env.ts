/**
 * Server-side environment accessors. Use from Route Handlers, Server Actions, and scripts.
 */

import { createHash } from "node:crypto";

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

export function getDatabaseUrl(): string {
  const url = readEnv("DATABASE_URL");
  if (!url) throw new Error("DATABASE_URL is required");
  return url;
}

export function getBetterAuthSecret(): string {
  const secret = readEnv("BETTER_AUTH_SECRET");
  if (!secret || secret.length < 32) {
    throw new Error(
      "BETTER_AUTH_SECRET is required and must be at least 32 characters",
    );
  }
  return secret;
}

export function getBetterAuthUrl(): string {
  const url = readEnv("BETTER_AUTH_URL");
  if (!url) throw new Error("BETTER_AUTH_URL is required (e.g. http://localhost:3000)");
  return url.replace(/\/$/, "");
}

/** Origins allowed for Better Auth CSRF / Origin checks. */
export function getTrustedOrigins(): string[] {
  const base = getBetterAuthUrl();
  const origins = new Set<string>([base]);
  if (process.env.NODE_ENV === "development") {
    origins.add("http://localhost:3000");
    origins.add("http://127.0.0.1:3000");
  }
  return [...origins];
}

/** Optional global pepper concatenated before hashing API keys (see README). */
export function getOptionalApiKeyPepper(): string {
  return readEnv("API_KEY_PEPPER") ?? "";
}

/** Shared secret for `/api/cron/*` (Bearer token). Min 16 chars; set in Vercel env for Cron jobs. */
export function getCronSecret(): string {
  const secret = readEnv("CRON_SECRET");
  if (!secret || secret.length < 16) {
    throw new Error("CRON_SECRET is required and must be at least 16 characters");
  }
  return secret;
}

/**
 * Derives a 32-byte AES key from `WEBHOOK_SECRET_ENCRYPTION_KEY` for encrypting webhook signing
 * secrets at rest (README Phase 3).
 */
export function getWebhookSecretEncryptionKeyBytes(): Buffer {
  const raw = readEnv("WEBHOOK_SECRET_ENCRYPTION_KEY");
  if (!raw || raw.length < 16) {
    throw new Error(
      "WEBHOOK_SECRET_ENCRYPTION_KEY is required and must be at least 16 characters",
    );
  }
  return createHash("sha256").update(raw, "utf8").digest();
}
