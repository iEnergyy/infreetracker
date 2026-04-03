import { and, eq, isNull } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { apiKeys } from "@/db/schema";
import type * as schema from "@/db/schema";
import { API_KEY_PREFIX_LENGTH, verifyApiKeyPlaintext } from "@/lib/api-keys/hash";

export function parseBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) return null;
  const m = /^Bearer\s+(\S+)$/i.exec(authorizationHeader.trim());
  return m?.[1] ?? null;
}

/**
 * Resolves Bearer API key to `user_id`, or `null` if invalid / revoked.
 */
export async function resolveUserIdFromApiKeyBearer(
  database: NodePgDatabase<typeof schema>,
  bearerToken: string,
): Promise<string | null> {
  const trimmed = bearerToken.trim();
  if (trimmed.length < API_KEY_PREFIX_LENGTH) return null;

  const prefix = trimmed.slice(0, API_KEY_PREFIX_LENGTH);

  const candidates = await database
    .select({
      userId: apiKeys.userId,
      keyHash: apiKeys.keyHash,
      revokedAt: apiKeys.revokedAt,
    })
    .from(apiKeys)
    .where(and(eq(apiKeys.prefix, prefix), isNull(apiKeys.revokedAt)));

  for (const row of candidates) {
    if (row.revokedAt) continue;
    if (verifyApiKeyPlaintext(trimmed, row.keyHash)) return row.userId;
  }

  return null;
}
