import assert from "node:assert/strict";
import test from "node:test";

import { formatDueTodayCountdown, getHoursRemainingToday } from "./deadline-countdown.ts";

test("due-today countdown uses the supplied date key boundary", () => {
  assert.equal(
    getHoursRemainingToday({
      dateKey: "2026-05-06",
      now: new Date("2026-05-06T08:00:00.000Z"),
    }),
    16,
  );
});

test("due-today countdown clamps elapsed or invalid inputs safely", () => {
  assert.equal(
    getHoursRemainingToday({
      dateKey: "2026-05-06",
      now: new Date("2026-05-07T00:00:00.000Z"),
    }),
    0,
  );
  assert.equal(getHoursRemainingToday({ now: new Date(Number.NaN) }), 0);
});

test("due-today countdown label is stable across callers", () => {
  const options = {
    dateKey: "2026-05-06",
    now: new Date("2026-05-06T12:30:00.000Z"),
  };

  assert.equal(formatDueTodayCountdown(options), "Due today · 12 h");
});
