/**
 * MVP rules after a full invoice payment (AC-7.1.3, aligned with §10.1.2 intent):
 * - `overdue` or `grace` → `active` (subscription back in good standing).
 * - `blocked` → `active` and clear `blocked_at` (manual unblock when obligation is settled).
 * - `active` → no subscription row change (invoice pay still valid for that period).
 */

export type SubscriptionStatus = "active" | "grace" | "overdue" | "blocked";

export interface SubscriptionStatusAfterPaymentPatch {
  status: "active";
  clearBlockedAt: boolean;
}

export function subscriptionStatusAfterFullPayment(
  current: SubscriptionStatus,
): SubscriptionStatusAfterPaymentPatch | null {
  if (current === "overdue" || current === "grace") {
    return { status: "active", clearBlockedAt: false };
  }
  if (current === "blocked") {
    return { status: "active", clearBlockedAt: true };
  }
  return null;
}
