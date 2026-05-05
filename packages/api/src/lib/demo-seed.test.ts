import assert from "node:assert/strict";
import test from "node:test";

import {
  DEMO_ACCOUNTS,
  DEMO_PASSWORD,
  buildDemoSeedPlan,
} from "./demo-seed";

test("demo seed exposes three stable CPA accounts with one documented password", () => {
  assert.deepEqual(
    DEMO_ACCOUNTS.map((account) => account.email),
    [
      "demo-triage@duedatehq.test",
      "demo-coverage@duedatehq.test",
      "demo-notices@duedatehq.test",
    ],
  );
  assert.equal(DEMO_PASSWORD, "DueDateHQ-demo-2026!");
  assert.equal(new Set(DEMO_ACCOUNTS.map((account) => account.firmId)).size, 3);
});

test("demo seed plan is deterministic and firm-scoped for idempotent reseeds", () => {
  const first = buildDemoSeedPlan({ passwordHash: "hash-one" });
  const second = buildDemoSeedPlan({ passwordHash: "hash-one" });

  assert.deepEqual(first, second);
  assert.equal(first.users.length, 3);
  assert.equal(first.firms.length, 3);
  assert.equal(first.accounts.length, 3);

  for (const firm of first.firms) {
    const firmRows = first.clientRelationships.filter((client) => client.firmId === firm.id);
    const profileRows = first.filingProfiles.filter((profile) => profile.firmId === firm.id);
    const taskRows = first.deadlineTasks.filter((task) => task.firmId === firm.id);

    assert.ok(firmRows.length >= 2, `${firm.id} should have multiple demo clients`);
    assert.ok(profileRows.length >= 2, `${firm.id} should have multiple filing profiles`);
    assert.ok(taskRows.length >= 2, `${firm.id} should have multiple deadline tasks`);
  }
});

test("demo datasets cover triage, coverage, and notice workflows", () => {
  const plan = buildDemoSeedPlan({ passwordHash: "hash-one" });
  const triage = rowsForFirm(plan, "demo-firm-triage");
  const coverage = rowsForFirm(plan, "demo-firm-coverage");
  const notices = rowsForFirm(plan, "demo-firm-notices");

  assert.ok(
    triage.deadlineTasks.filter((task) => task.sourceType === "verified_rule").length >= 4,
  );
  assert.ok(
    new Set(triage.deadlineTasks.map((task) => task.status)).has("waiting_on_client"),
  );

  assert.ok(
    coverage.filingProfiles.some((profile) => profile.coverageState === "coverage_gap"),
  );
  assert.ok(
    coverage.filingProfiles.some((profile) => profile.coverageState === "unsupported"),
  );
  assert.ok(
    coverage.deadlineTasks.some(
      (task) =>
        task.sourceType === "entered_deadline" &&
        task.enteredDeadlineReferenceNote?.includes("Reference:"),
    ),
  );
  assert.ok(
    coverage.verificationRequests.some((request) => request.requestType === "manual_deadline"),
  );

  assert.ok(
    notices.deadlineTasks.some((task) => task.sourceType === "verified_rule"),
  );
  assert.ok(
    notices.dateEvents.some((event) => event.eventType === "official_relief_change"),
  );
  assert.ok(
    notices.auditLogs.some((log) => log.sourceType === "official_notice"),
  );
  assert.ok(plan.officialNotices.length >= 1);
});

function rowsForFirm(plan: ReturnType<typeof buildDemoSeedPlan>, firmId: string) {
  return {
    auditLogs: plan.auditLogs.filter((row) => row.firmId === firmId),
    clientRelationships: plan.clientRelationships.filter((row) => row.firmId === firmId),
    dateEvents: plan.deadlineDateEvents.filter((row) => row.firmId === firmId),
    deadlineTasks: plan.deadlineTasks.filter((row) => row.firmId === firmId),
    filingProfiles: plan.filingProfiles.filter((row) => row.firmId === firmId),
    verificationRequests: plan.verificationRequests.filter((row) => row.firmId === firmId),
  };
}
