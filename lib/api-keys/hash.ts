import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { getOptionalApiKeyPepper } from "@/lib/env";

const PREFIX = "v1";
const SCRYPT_KEYLEN = 64;
/** scrypt options (Node defaults for cost). */
const SCRYPT_OPTS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const;

export const API_KEY_PREFIX_LENGTH = 8;

/**
 * Stored format: `v1$<salt_b64>$<hash_b64>` (single column `key_hash`).
 */
export function hashApiKeyPlaintext(plaintext: string): string {
  const salt = randomBytes(16);
  const pepper = getOptionalApiKeyPepper();
  const hash = scryptSync(plaintext + pepper, salt, SCRYPT_KEYLEN, SCRYPT_OPTS);
  return `${PREFIX}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export function verifyApiKeyPlaintext(plaintext: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== PREFIX) return false;
  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(parts[1], "base64");
    expected = Buffer.from(parts[2], "base64");
  } catch {
    return false;
  }
  if (salt.length === 0 || expected.length === 0) return false;
  const pepper = getOptionalApiKeyPepper();
  let computed: Buffer;
  try {
    computed = scryptSync(plaintext + pepper, salt, expected.length, SCRYPT_OPTS);
  } catch {
    return false;
  }
  if (computed.length !== expected.length) return false;
  return timingSafeEqual(computed, expected);
}

export function displayPrefixFromPlaintext(plaintext: string): string {
  return plaintext.slice(0, API_KEY_PREFIX_LENGTH);
}
