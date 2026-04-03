import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addCalendarMonths,
  computeFirstPeriodEnd,
  computeNextPeriodEnd,
} from "./first-period-end";

describe("computeFirstPeriodEnd", () => {
  it("monthly from Jan 31 clamps to Feb then chains", () => {
    const first = computeFirstPeriodEnd({
      startDate: "2026-01-31",
      billingCycle: "monthly",
    });
    assert.equal(first.firstPeriodEndDate, "2026-02-28");
    const second = computeNextPeriodEnd({
      periodEndDate: first.firstPeriodEndDate,
      billingCycle: "monthly",
    });
    assert.equal(second.nextPeriodEndDate, "2026-03-28");
  });

  it("custom_days adds N calendar days from start", () => {
    const first = computeFirstPeriodEnd({
      startDate: "2026-01-01",
      billingCycle: "custom_days",
      billingIntervalDays: 14,
    });
    assert.equal(first.firstPeriodEndDate, "2026-01-15");
  });
});

describe("computeNextPeriodEnd", () => {
  it("custom_days chains +N from previous period end", () => {
    const n = computeNextPeriodEnd({
      periodEndDate: "2026-01-15",
      billingCycle: "custom_days",
      billingIntervalDays: 14,
    });
    assert.equal(n.nextPeriodEndDate, "2026-01-29");
  });

  it("monthly aligns with same anchor rules as first period", () => {
    assert.equal(
      computeFirstPeriodEnd({ startDate: "2026-03-15", billingCycle: "monthly" }).firstPeriodEndDate,
      "2026-04-15",
    );
    assert.equal(
      computeNextPeriodEnd({
        periodEndDate: "2026-03-15",
        billingCycle: "monthly",
      }).nextPeriodEndDate,
      "2026-04-15",
    );
  });
});

describe("addCalendarMonths", () => {
  it("handles year rollover", () => {
    assert.equal(addCalendarMonths("2026-11-30", 1), "2026-12-30");
    assert.equal(addCalendarMonths("2026-12-15", 1), "2027-01-15");
  });
});
