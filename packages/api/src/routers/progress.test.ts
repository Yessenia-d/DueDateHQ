import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  featureProgressPriorities,
  featureProgressStatuses,
} from "@due-date-hq/db/schema/feature-progress";

import type { Context } from "../context";
import { appRouter } from "./index";

const mockDb = {} as Context["db"];

type FeatureProgressStatus = (typeof featureProgressStatuses)[number];

const expectedFeatureStatuses = [
  ["Auth and firm workspace", "done"],
  ["CSV import with profile review", "in_progress"],
  ["Manual client profile and deadline entry", "not_started"],
  ["Tax obligation library", "done"],
  ["Tax rule verification", "done"],
  ["Official source monitoring", "in_progress"],
  ["Notice proposal review and audit workflow", "not_started"],
  ["Coverage matrix", "done"],
  ["Dashboard", "in_progress"],
  ["Cloudflare beta deployment", "not_started"],
  ["GTM readiness", "blocked"],
  ["Docs and specs", "in_progress"],
  ["Feature progress page", "in_progress"],
] as const satisfies readonly (readonly [string, FeatureProgressStatus])[];

test("progress.list returns grouped Beta feature progress with derived readiness", async () => {
  const caller = appRouter.createCaller({
    auth: {} as Context["auth"],
    db: mockDb,
    firm: null,
    session: null,
  });
  const result = await caller.progress.list();
  const items = result.groups.flatMap((group) => group.items);
  const statusByFeatureName = new Map(items.map((item) => [item.name, item.status]));
  const statusSet = new Set(featureProgressStatuses);

  assert.deepEqual(result.statuses, featureProgressStatuses);
  assert.deepEqual(result.priorities, featureProgressPriorities);
  assert.equal(statusByFeatureName.size, items.length, "Feature progress names should be unique");

  for (const [featureName, expectedStatus] of expectedFeatureStatuses) {
    assert.equal(
      statusByFeatureName.get(featureName),
      expectedStatus,
      `Expected seeded progress status for ${featureName}`,
    );
  }

  for (const group of result.groups) {
    assert.ok(group.items.length > 0, `${group.category} should include feature items`);

    for (const item of group.items) {
      assert.equal(item.category, group.category);
      assert.ok(statusSet.has(item.status), `${item.name} uses an allowed status`);
      assert.match(item.specPath, /^specs\/.+\.md$/);
      assert.ok(
        existsSync(resolve(process.cwd(), item.specPath)),
        `${item.name} maps to an existing spec at ${item.specPath}`,
      );
    }

    for (const status of featureProgressStatuses) {
      assert.equal(
        group.statusCounts[status],
        group.items.filter((item) => item.status === status).length,
        `${group.category} derives ${status} count from its items`,
      );
    }
  }

  const completedCount = items.filter((item) => item.status === "done").length;
  const p0Items = items.filter((item) => item.priority === "p0");
  const p0CompletedCount = p0Items.filter((item) => item.status === "done").length;

  assert.equal(result.overall.totalCount, items.length);
  assert.equal(result.overall.completedCount, completedCount);
  assert.equal(result.overall.percentComplete, Math.round((completedCount / items.length) * 100));

  for (const status of featureProgressStatuses) {
    assert.equal(
      result.overall.statusCounts[status],
      items.filter((item) => item.status === status).length,
      `Overall ${status} count is derived from items`,
    );
  }

  assert.equal(result.p0Readiness.totalCount, p0Items.length);
  assert.equal(result.p0Readiness.completedCount, p0CompletedCount);
  assert.equal(
    result.p0Readiness.percentComplete,
    Math.round((p0CompletedCount / p0Items.length) * 100),
  );
});
