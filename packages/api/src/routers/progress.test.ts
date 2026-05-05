import assert from "node:assert/strict";
import test from "node:test";

import { appRouter } from "./index";
import { featureProgressStatuses } from "./progress";

const requiredFeatureNames = [
  "Auth and firm workspace",
  "CSV import with profile review",
  "Manual client profile and deadline entry",
  "Tax obligation library",
  "Tax rule verification",
  "Official source monitoring",
  "Notice proposal review and audit workflow",
  "Coverage matrix",
  "Monday triage dashboard",
  "Cloudflare beta deployment",
  "GTM readiness",
  "Docs and specs",
] as const;

test("progress.list returns grouped Beta feature progress with derived readiness", async () => {
  const caller = appRouter.createCaller({ auth: null, session: null });
  const result = await caller.progress.list();
  const items = result.groups.flatMap((group) => group.items);
  const statusSet = new Set(featureProgressStatuses);

  for (const featureName of requiredFeatureNames) {
    assert.ok(
      items.some((item) => item.name === featureName),
      `Expected seeded progress item for ${featureName}`,
    );
  }

  for (const group of result.groups) {
    assert.ok(group.items.length > 0, `${group.category} should include feature items`);

    for (const item of group.items) {
      assert.equal(item.category, group.category);
      assert.ok(statusSet.has(item.status), `${item.name} uses an allowed status`);
      assert.match(item.specPath, /^specs\/.+\.md$/);
    }
  }

  const completedCount = items.filter((item) => item.status === "done").length;
  const p0Items = items.filter((item) => item.priority === "p0");
  const p0CompletedCount = p0Items.filter((item) => item.status === "done").length;

  assert.equal(result.overall.totalCount, items.length);
  assert.equal(result.overall.completedCount, completedCount);
  assert.equal(result.overall.percentComplete, Math.round((completedCount / items.length) * 100));
  assert.equal(result.p0Readiness.totalCount, p0Items.length);
  assert.equal(result.p0Readiness.completedCount, p0CompletedCount);
  assert.equal(
    result.p0Readiness.percentComplete,
    Math.round((p0CompletedCount / p0Items.length) * 100),
  );
});
