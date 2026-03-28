/**
 * Server-side environment accessors. Use from Route Handlers, Server Actions, and scripts.
 */

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
  return url;
}
