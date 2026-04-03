import { randomBytes } from "node:crypto";

/** URL-safe secret; first 8 chars become DB `prefix` for lookup. */
export function generateApiKeyPlaintext(): string {
  return `cflw_${randomBytes(24).toString("base64url")}`;
}
