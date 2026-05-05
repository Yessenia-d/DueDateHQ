import assert from "node:assert/strict";
import test from "node:test";

import type { DueDateRule } from "@due-date-hq/db/schema/tax-rules";

import { adjustForWeekendAndHoliday, calculateDueDates } from "./due-date-engine";

// ── adjustForWeekendAndHoliday ──

test("adjustForWeekendAndHoliday returns the same date for a regular weekday", () => {
  // 2026-04-15 is a Wednesday
  const date = new Date(2026, 3, 15);
  const adjusted = adjustForWeekendAndHoliday(date);
  assert.equal(adjusted.getFullYear(), 2026);
  assert.equal(adjusted.getMonth(), 3);
  assert.equal(adjusted.getDate(), 15);
});

test("adjustForWeekendAndHoliday moves Saturday to Monday", () => {
  // 2026-03-14 is a Saturday
  const date = new Date(2026, 2, 14);
  const adjusted = adjustForWeekendAndHoliday(date);
  assert.equal(adjusted.getDay(), 1); // Monday
  assert.equal(adjusted.getDate(), 16);
});

test("adjustForWeekendAndHoliday moves Sunday to Monday", () => {
  // 2026-03-15 is a Sunday
  const date = new Date(2026, 2, 15);
  const adjusted = adjustForWeekendAndHoliday(date);
  assert.equal(adjusted.getDay(), 1); // Monday
  assert.equal(adjusted.getDate(), 16);
});

test("adjustForWeekendAndHoliday moves a federal holiday to next business day", () => {
  // 2026-01-19 is MLK Day (Monday) - should move to 2026-01-20 (Tuesday)
  const date = new Date(2026, 0, 19);
  const adjusted = adjustForWeekendAndHoliday(date);
  assert.equal(adjusted.getDate(), 20);
  assert.equal(adjusted.getDay(), 2); // Tuesday
});

test("adjustForWeekendAndHoliday handles weekend + holiday sequence", () => {
  // 2027-07-04 is a Sunday, observed Monday 2027-07-05 is the holiday
  // So July 4 (Sunday) -> July 5 (Monday, holiday) -> July 6 (Tuesday)
  const date = new Date(2027, 6, 4);
  const adjusted = adjustForWeekendAndHoliday(date);
  assert.equal(adjusted.getDate(), 6);
  assert.equal(adjusted.getDay(), 2); // Tuesday
});

// ── calculateDueDates: fixed rules ──

test("calculateDueDates handles a fixed rule with April 15 due date", () => {
  const rule: DueDateRule = {
    type: "fixed",
    month: 4,
    day: 15,
    adjustForWeekendHoliday: true,
    extensionRule: {
      month: 10,
      day: 15,
      adjustForWeekendHoliday: true,
    },
  };

  // Tax year 2025 -> due April 15, 2026 (Wednesday)
  const results = calculateDueDates(rule, 2025);
  assert.equal(results.length, 1);

  const result = results[0];
  assert.ok(result);
  assert.equal(result.dueDate.getFullYear(), 2026);
  assert.equal(result.dueDate.getMonth(), 3); // April
  assert.equal(result.dueDate.getDate(), 15);
  assert.equal(result.quarter, null);

  // Extension: October 15, 2026 (Thursday)
  assert.ok(result.extensionDate);
  assert.equal(result.extensionDate.getFullYear(), 2026);
  assert.equal(result.extensionDate.getMonth(), 9); // October
  assert.equal(result.extensionDate.getDate(), 15);
});

test("calculateDueDates handles a fixed rule with March 15 due date", () => {
  const rule: DueDateRule = {
    type: "fixed",
    month: 3,
    day: 15,
    adjustForWeekendHoliday: true,
    extensionRule: {
      month: 9,
      day: 15,
      adjustForWeekendHoliday: true,
    },
  };

  // Tax year 2025 -> due March 15, 2026 (Sunday) -> adjusted to March 16 (Monday)
  const results = calculateDueDates(rule, 2025);
  assert.equal(results.length, 1);

  const result = results[0];
  assert.ok(result);
  assert.equal(result.dueDate.getFullYear(), 2026);
  assert.equal(result.dueDate.getMonth(), 2); // March
  assert.equal(result.dueDate.getDate(), 16); // Adjusted from Sunday to Monday

  // Extension: September 15, 2026 (Tuesday)
  assert.ok(result.extensionDate);
  assert.equal(result.extensionDate.getMonth(), 8); // September
  assert.equal(result.extensionDate.getDate(), 15);
});

test("calculateDueDates without adjustForWeekendHoliday keeps exact dates", () => {
  const rule: DueDateRule = {
    type: "fixed",
    month: 3,
    day: 15,
    adjustForWeekendHoliday: false,
  };

  // Tax year 2025 -> March 15, 2026 (Sunday) - not adjusted
  const results = calculateDueDates(rule, 2025);
  const result = results[0];
  assert.ok(result);
  assert.equal(result.dueDate.getDate(), 15);
  assert.equal(result.extensionDate, null);
});

// ── calculateDueDates: quarterly rules ──

test("calculateDueDates handles quarterly estimated tax with yearOffset", () => {
  const rule: DueDateRule = {
    type: "quarterly",
    quarters: {
      q1: { month: 4, day: 15 },
      q2: { month: 6, day: 15 },
      q3: { month: 9, day: 15 },
      q4: { month: 1, day: 15, yearOffset: 1 },
    },
    adjustForWeekendHoliday: true,
  };

  // Tax year 2025 estimated payments fall during 2025, except Q4's January
  // payment, which uses yearOffset.
  const results = calculateDueDates(rule, 2025);
  assert.equal(results.length, 4);

  // Q1: April 15, 2025 (Tuesday)
  const q1 = results[0];
  assert.ok(q1);
  assert.equal(q1.quarter, 1);
  assert.equal(q1.dueDate.getFullYear(), 2025);
  assert.equal(q1.dueDate.getMonth(), 3);
  assert.equal(q1.dueDate.getDate(), 15);

  // Q2: June 15, 2025 is Sunday -> adjusted to Monday, June 16
  const q2 = results[1];
  assert.ok(q2);
  assert.equal(q2.quarter, 2);
  assert.equal(q2.dueDate.getFullYear(), 2025);
  assert.equal(q2.dueDate.getMonth(), 5);
  assert.equal(q2.dueDate.getDate(), 16);

  // Q3: September 15, 2025 (Monday)
  const q3 = results[2];
  assert.ok(q3);
  assert.equal(q3.quarter, 3);
  assert.equal(q3.dueDate.getFullYear(), 2025);
  assert.equal(q3.dueDate.getMonth(), 8);
  assert.equal(q3.dueDate.getDate(), 15);

  // Q4: January 15, 2026 (Thursday) - yearOffset: 1 means 2025+1 = 2026
  const q4 = results[3];
  assert.ok(q4);
  assert.equal(q4.quarter, 4);
  assert.equal(q4.dueDate.getFullYear(), 2026);
  assert.equal(q4.dueDate.getMonth(), 0);
  assert.equal(q4.dueDate.getDate(), 15);
});

test("calculateDueDates handles quarterly without yearOffset", () => {
  const rule: DueDateRule = {
    type: "quarterly",
    quarters: {
      q1: { month: 4, day: 15 },
      q2: { month: 6, day: 15 },
      q3: { month: 9, day: 15 },
      q4: { month: 12, day: 15 },
    },
    adjustForWeekendHoliday: true,
  };

  // Tax year 2025
  const results = calculateDueDates(rule, 2025);
  assert.equal(results.length, 4);

  // Q4: December 15, 2025 (Monday)
  const q4 = results[3];
  assert.ok(q4);
  assert.equal(q4.quarter, 4);
  assert.equal(q4.dueDate.getFullYear(), 2025);
  assert.equal(q4.dueDate.getMonth(), 11);
  assert.equal(q4.dueDate.getDate(), 15);
});

test("calculateDueDates adjusts quarterly dates that fall on weekends", () => {
  const rule: DueDateRule = {
    type: "quarterly",
    quarters: {
      q1: { month: 4, day: 15 },
      q2: { month: 6, day: 15 },
      q3: { month: 9, day: 15 },
      q4: { month: 12, day: 15 },
    },
    adjustForWeekendHoliday: true,
  };

  // Tax year 2028 -> Q1 is April 15, 2028 (Saturday) -> April 17, 2028 (Monday)
  const results = calculateDueDates(rule, 2028);
  const q1 = results[0];
  assert.ok(q1);
  assert.equal(q1.dueDate.getFullYear(), 2028);
  assert.equal(q1.dueDate.getMonth(), 3);
  assert.equal(q1.dueDate.getDate(), 17);
  assert.equal(q1.dueDate.getDay(), 1);
});
