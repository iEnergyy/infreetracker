"use server";

import { and, desc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { auth } from "@/lib/auth";
import { displayPrefixFromPlaintext, hashApiKeyPlaintext } from "@/lib/api-keys/hash";
import { generateApiKeyPlaintext } from "@/lib/api-keys/generate-secret";

export interface ApiKeyListItem {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  revokedAt: string | null;
}

export async function listApiKeysForSession(): Promise<ApiKeyListItem[]> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return [];

  const rows = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      prefix: apiKeys.prefix,
      createdAt: apiKeys.createdAt,
      revokedAt: apiKeys.revokedAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.userId, session.user.id))
    .orderBy(desc(apiKeys.createdAt));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    prefix: r.prefix,
    createdAt: r.createdAt.toISOString(),
    revokedAt: r.revokedAt ? r.revokedAt.toISOString() : null,
  }));
}

export async function createApiKeyAction(name: string): Promise<
  | { ok: true; plaintext: string }
  | { ok: false; error: string }
> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "Unauthorized" };

  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Name is required" };

  const plaintext = generateApiKeyPlaintext();
  const keyHash = hashApiKeyPlaintext(plaintext);
  const prefix = displayPrefixFromPlaintext(plaintext);

  await db.insert(apiKeys).values({
    userId: session.user.id,
    name: trimmed,
    keyHash,
    prefix,
  });

  revalidatePath("/app/settings/api-keys");
  return { ok: true, plaintext };
}

export async function revokeApiKeyAction(keyId: string): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "Unauthorized" };

  const updated = await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(apiKeys.id, keyId),
        eq(apiKeys.userId, session.user.id),
        isNull(apiKeys.revokedAt),
      ),
    )
    .returning({ id: apiKeys.id });

  if (updated.length === 0) return { ok: false, error: "Key not found or already revoked" };

  revalidatePath("/app/settings/api-keys");
  return { ok: true };
}
