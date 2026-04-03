/**
 * Pure calendar math for the first billing period end (AC-5.1.2, seed for §6.1).
 * All dates are UTC calendar dates (YYYY-MM-DD); no DB.
 *
 * monthly: due = same calendar day next month; if that day does not exist (e.g. Jan 31 → Feb),
 * clamp to the last day of the target month (Feb 28/29).
 * custom_days: due = startDate + N calendar days (N = length of one period).
 */

export type BillingCycleForPeriod = "monthly" | "custom_days";

export interface FirstPeriodEndResult {
  /** Drizzle `date` / invoice `due_date` */
  firstPeriodEndDate: string;
  /** `subscriptions.current_period_end` — UTC midnight of `firstPeriodEndDate` */
  currentPeriodEnd: Date;
}

function parseISODateParts(isoDate: string): { y: number; m: number; d: number } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!m) throw new Error(`Invalid date (expected YYYY-MM-DD): ${isoDate}`);
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) {
    throw new Error(`Invalid date: ${isoDate}`);
  }
  return { y, m: mo, d };
}

/** Last calendar day of month `month1Based` (1–12) in `year`. */
function daysInMonth(year: number, month1Based: number): number {
  return new Date(Date.UTC(year, month1Based, 0)).getUTCDate();
}

/** Add whole calendar months; clamp day to valid day in target month (month-end edge case). */
export function addCalendarMonths(isoDate: string, monthsToAdd: number): string {
  const { y, m, d } = parseISODateParts(isoDate);
  const startMonthIndex = m - 1 + monthsToAdd;
  const year = y + Math.floor(startMonthIndex / 12);
  const monthIndex = ((startMonthIndex % 12) + 12) % 12;
  const dim = daysInMonth(year, monthIndex + 1);
  const day = Math.min(d, dim);
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function addCalendarDays(isoDate: string, days: number): string {
  const { y, m, d } = parseISODateParts(isoDate);
  const t = Date.UTC(y, m - 1, d) + days * 86_400_000;
  const u = new Date(t);
  return `${u.getUTCFullYear()}-${String(u.getUTCMonth() + 1).padStart(2, "0")}-${String(u.getUTCDate()).padStart(2, "0")}`;
}

export function computeFirstPeriodEnd(input: {
  startDate: string;
  billingCycle: BillingCycleForPeriod;
  billingIntervalDays?: number | null;
}): FirstPeriodEndResult {
  let firstPeriodEndDate: string;
  if (input.billingCycle === "monthly") {
    firstPeriodEndDate = addCalendarMonths(input.startDate, 1);
  } else {
    const n = input.billingIntervalDays;
    if (n == null || n < 1) {
      throw new Error("billingIntervalDays is required and must be >= 1 for custom_days");
    }
    firstPeriodEndDate = addCalendarDays(input.startDate, n);
  }

  return {
    firstPeriodEndDate,
    currentPeriodEnd: new Date(`${firstPeriodEndDate}T00:00:00.000Z`),
  };
}
