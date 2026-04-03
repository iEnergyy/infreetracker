import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALG = "aes-256-gcm";
const IV_LENGTH = 12;
const VERSION = 1;

export interface EncryptedPayloadV1 {
  v: typeof VERSION;
  iv: string;
  t: string;
  d: string;
}

/** `key` must be 32 bytes (e.g. SHA-256 of `WEBHOOK_SECRET_ENCRYPTION_KEY`). */
export function encryptWebhookSigningSecret(plaintext: string, key: Buffer): string {
  if (key.length !== 32) {
    throw new Error("Encryption key must be 32 bytes");
  }
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALG, key, iv, { authTagLength: 16 });
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload: EncryptedPayloadV1 = {
    v: VERSION,
    iv: iv.toString("base64url"),
    t: tag.toString("base64url"),
    d: encrypted.toString("base64url"),
  };
  return JSON.stringify(payload);
}

export function decryptWebhookSigningSecret(ciphertextJson: string, key: Buffer): string {
  if (key.length !== 32) {
    throw new Error("Encryption key must be 32 bytes");
  }
  const o = JSON.parse(ciphertextJson) as EncryptedPayloadV1;
  if (o.v !== VERSION) {
    throw new Error(`Unsupported webhook secret ciphertext version: ${o.v}`);
  }
  const iv = Buffer.from(o.iv, "base64url");
  const tag = Buffer.from(o.t, "base64url");
  const decipher = createDecipheriv(ALG, key, iv, { authTagLength: 16 });
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(Buffer.from(o.d, "base64url")), decipher.final()]).toString(
    "utf8",
  );
}
