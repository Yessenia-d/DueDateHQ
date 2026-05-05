import type { DueDateRule } from "@due-date-hq/db/schema/tax-rules";

/**
 * Federal holidays for 2025-2028, expressed as "YYYY-MM-DD".
 * Includes observed dates when the actual holiday falls on a weekend.
 */
const FEDERAL_HOLIDAYS: ReadonlySet<string> = new Set([
  // 2025
  "2025-01-01", // New Year's Day
  "2025-01-20", // MLK Day
  "2025-02-17", // Presidents' Day
  "2025-05-26", // Memorial Day
  "2025-06-19", // Juneteenth
  "2025-07-04", // Independence Day
  "2025-09-01", // Labor Day
  "2025-10-13", // Columbus Day
  "2025-11-11", // Veterans Day
  "2025-11-27", // Thanksgiving
  "2025-12-25", // Christmas
  // 2026
  "2026-01-01", // New Year's Day
  "2026-01-19", // MLK Day
  "2026-02-16", // Presidents' Day
  "2026-05-25", // Memorial Day
  "2026-06-19", // Juneteenth
  "2026-07-03", // Independence Day (observed, Jul 4 is Saturday)
  "2026-09-07", // Labor Day
  "2026-10-12", // Columbus Day
  "2026-11-11", // Veterans Day
  "2026-11-26", // Thanksgiving
  "2026-12-25", // Christmas
  // 2027
  "2027-01-01", // New Year's Day
  "2027-01-18", // MLK Day
  "2027-02-15", // Presidents' Day
  "2027-05-31", // Memorial Day
  "2027-06-18", // Juneteenth (observed, Jun 19 is Saturday)
  "2027-07-05", // Independence Day (observed, Jul 4 is Sunday)
  "2027-09-06", // Labor Day
  "2027-10-11", // Columbus Day
  "2027-11-11", // Veterans Day
  "2027-11-25", // Thanksgiving
  "2027-12-24", // Christmas (observed, Dec 25 is Saturday)
  "2027-12-31", // New Year's Day 2028 (observed, Jan 1 is Saturday -> previous Friday)
  // 2028
  "2028-01-17", // MLK Day
  "2028-02-21", // Presidents' Day
  "2028-05-29", // Memorial Day
  "2028-06-19", // Juneteenth
  "2028-07-04", // Independence Day
  "2028-09-04", // Labor Day
  "2028-10-09", // Columbus Day
  "2028-11-10", // Veterans Day (observed, Nov 11 is Saturday)
  "2028-11-23", // Thanksgiving
  "2028-12-25", // Christmas
]);

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function isFederalHoliday(date: Date): boolean {
  return FEDERAL_HOLIDAYS.has(formatDateKey(date));
}

/**
 * If a due date falls on a weekend or federal holiday, move it to the next
 * business day (Monday-Friday, non-holiday).
 */
export function adjustForWeekendAndHoliday(date: Date): Date {
  const adjusted = new Date(date);
  while (isWeekend(adjusted) || isFederalHoliday(adjusted)) {
    adjusted.setDate(adjusted.getDate() + 1);
  }
  return adjusted;
}

export type CalculatedDueDate = {
  dueDate: Date;
  extensionDate: Date | null;
  quarter: number | null;
};

/**
 * Calculate due date(s) from a structured rule for a given tax year.
 *
 * For "fixed" rules, returns one result with optional extension date.
 * For "quarterly" rules, returns four results (Q1-Q4).
 */
export function calculateDueDates(
  rule: DueDateRule,
  taxYear: number,
): CalculatedDueDate[] {
  if (rule.type === "fixed") {
    return [calculateFixedDueDate(rule, taxYear)];
  }

  if (rule.type === "quarterly") {
    return calculateQuarterlyDueDates(rule, taxYear);
  }

  // Exhaustive check for future rule types
  const _exhaustive: never = rule;
  throw new Error(`Unknown due date rule type: ${JSON.stringify(_exhaustive)}`);
}

function calculateFixedDueDate(
  rule: Extract<DueDateRule, { type: "fixed" }>,
  taxYear: number,
): CalculatedDueDate {
  // Fixed rules: the due date is in the year after the tax year
  // e.g. tax year 2025 -> April 15, 2026
  const rawDate = new Date(taxYear + 1, rule.month - 1, rule.day);
  const dueDate = rule.adjustForWeekendHoliday
    ? adjustForWeekendAndHoliday(rawDate)
    : rawDate;

  let extensionDate: Date | null = null;
  if (rule.extensionRule) {
    const rawExt = new Date(taxYear + 1, rule.extensionRule.month - 1, rule.extensionRule.day);
    extensionDate = rule.extensionRule.adjustForWeekendHoliday
      ? adjustForWeekendAndHoliday(rawExt)
      : rawExt;
  }

  return { dueDate, extensionDate, quarter: null };
}

function calculateQuarterlyDueDates(
  rule: Extract<DueDateRule, { type: "quarterly" }>,
  taxYear: number,
): CalculatedDueDate[] {
  const quarters = [
    { key: "q1" as const, quarter: 1 },
    { key: "q2" as const, quarter: 2 },
    { key: "q3" as const, quarter: 3 },
    { key: "q4" as const, quarter: 4 },
  ] as const;

  return quarters.map(({ key, quarter }) => {
    const q = rule.quarters[key];
    const yearOffset = q.yearOffset ?? 0;
    const rawDate = new Date(taxYear + yearOffset, q.month - 1, q.day);
    const dueDate = rule.adjustForWeekendHoliday
      ? adjustForWeekendAndHoliday(rawDate)
      : rawDate;

    return { dueDate, extensionDate: null, quarter };
  });
}
