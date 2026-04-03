import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import { decryptWebhookSigningSecret, encryptWebhookSigningSecret } from "./secret-crypto";

const testKey = createHash("sha256").update("test-webhook-key-16chars", "utf8").digest();

describe("encryptWebhookSigningSecret / decryptWebhookSigningSecret", () => {
  it("round-trips signing material", () => {
    const plain = "my-hmac-secret-value";
    const enc = encryptWebhookSigningSecret(plain, testKey);
    assert.notEqual(enc, plain);
    assert.equal(decryptWebhookSigningSecret(enc, testKey), plain);
  });
});
