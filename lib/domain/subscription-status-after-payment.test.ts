import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { subscriptionStatusAfterFullPayment } from "./subscription-status-after-payment";

describe("subscriptionStatusAfterFullPayment", () => {
  it("returns active for overdue and grace", () => {
    assert.deepEqual(subscriptionStatusAfterFullPayment("overdue"), {
      status: "active",
      clearBlockedAt: false,
    });
    assert.deepEqual(subscriptionStatusAfterFullPayment("grace"), {
      status: "active",
      clearBlockedAt: false,
    });
  });

  it("returns active and clear blocked for blocked", () => {
    assert.deepEqual(subscriptionStatusAfterFullPayment("blocked"), {
      status: "active",
      clearBlockedAt: true,
    });
  });

  it("returns null for already active", () => {
    assert.equal(subscriptionStatusAfterFullPayment("active"), null);
  });
});
