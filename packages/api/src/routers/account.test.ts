import assert from "node:assert/strict";
import test from "node:test";

import { createAchievementMetrics, getInclusiveUsageDay } from "./account";

const firm = {
  id: "firm-1",
  name: "North Star CPA",
  createdAt: new Date("2026-05-01T15:30:00.000Z"),
};

test("achievement metrics use the firm creation date as inclusive day one", () => {
  const result = createAchievementMetrics({
    firm,
    tasks: [
      { status: "done" },
      { status: "done" },
      { status: "waiting_on_client" },
      { status: "not_started" },
    ],
    today: new Date("2026-05-06T10:00:00.000Z"),
    totalClientRelationships: 3,
  });

  assert.equal(result.workspace.usageStartDate, "2026-05-01");
  assert.equal(result.metrics.totalUsageDays, 6);
  assert.equal(result.metrics.currentUsageDay, 6);
  assert.equal(result.metrics.totalClientRelationships, 3);
  assert.equal(result.metrics.totalDeadlineTasks, 4);
  assert.equal(result.metrics.completedDeadlineTasks, 2);
  assert.equal(result.metrics.remainingDeadlineTasks, 2);
  assert.equal(result.metrics.averageCompletedTasksPerDay, 0.3);
});

test("achievement metrics report first-day usage as day one", () => {
  assert.equal(
    getInclusiveUsageDay(
      new Date("2026-05-06T23:00:00.000Z"),
      new Date("2026-05-06T00:30:00.000Z"),
    ),
    1,
  );
});

test("achievement metrics handle zero tasks without a misleading average", () => {
  const result = createAchievementMetrics({
    firm,
    tasks: [],
    today: new Date("2026-05-06T10:00:00.000Z"),
    totalClientRelationships: 0,
  });

  assert.equal(result.metrics.totalDeadlineTasks, 0);
  assert.equal(result.metrics.completedDeadlineTasks, 0);
  assert.equal(result.metrics.remainingDeadlineTasks, 0);
  assert.equal(result.metrics.averageCompletedTasksPerDay, 0);
});
