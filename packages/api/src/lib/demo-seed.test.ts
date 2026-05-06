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
  assert.ok(triage.clientRelationships.length >= 7);
  assert.ok(triage.filingProfiles.length >= 8);
  assert.ok(triage.deadlineTasks.length >= 18);
  assert.equal(triage.deadlineTasks.filter(isDueThisWeek).length, 200);
  assert.ok(triage.deadlineTasks.some((task) => task.currentDueDate < "2026-05-05"));
  assert.ok(
    triage.deadlineTasks.some(
      (task) => task.currentDueDate === "2026-05-06" && task.status === "done",
    ),
  );
  assert.ok(triage.deadlineTasks.some((task) => task.currentDueDate > "2026-05-11"));
  assert.ok(
    new Set(triage.deadlineTasks.map((task) => task.status)).has("waiting_on_client"),
  );
  assert.ok(triage.deadlineTasks.some((task) => task.sourceType === "entered_deadline"));
  assert.ok(triage.deadlineTasks.some((task) => task.taxRuleId === "rule-tx-sales-quarterly"));
  assert.ok(triage.deadlineTasks.some((task) => task.taxRuleId === "rule-ny-ct3-filing"));
  assert.ok(
    triage.deadlineTasks.some(
      (task) =>
        task.id === "demo-triage-task-barton-tx-sales" &&
        task.originalDueDate === "2026-05-05" &&
        task.currentDueDate === "2026-05-07",
    ),
  );
  assert.ok(
    triage.dateEvents.some(
      (event) =>
        event.deadlineTaskId === "demo-triage-task-barton-tx-sales" &&
        event.eventType === "official_extension" &&
        event.previousCurrentDueDate === "2026-05-05" &&
        event.newCurrentDueDate === "2026-05-07",
    ),
  );
  assert.ok(triage.updateRecords.length >= 5);
  assert.ok(
    triage.updateRecords.some(
      (record) =>
        record.deadlineTaskId === "demo-triage-task-1040" &&
        record.fieldName === "status" &&
        record.previousValue === "not_started" &&
        record.newValue === "waiting_on_client",
    ),
  );
  assert.ok(
    triage.updateRecords.some(
      (record) =>
        record.deadlineTaskId === "demo-triage-task-hawthorne-100es-q1" &&
        record.fieldName === "notes" &&
        record.newValue?.includes("Partner asked"),
    ),
  );
  assert.ok(triage.filingProfiles.some((profile) => profile.ssnLast4 === "2198"));
  assert.ok(triage.filingProfiles.filter((profile) => profile.ein).length >= 6);
  assert.ok(
    triage.filingProfiles.some((profile) => profile.coverageState === "coverage_gap"),
  );
  assert.ok(
    triage.noticeImpactProposals.some(
      (proposal) =>
        proposal.id === "demo-triage-proposal-tx-sales-review" &&
        proposal.status === "pending" &&
        proposal.officialNoticeId === "demo-notice-tx-sales-source-change",
    ),
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

function isDueThisWeek(task: ReturnType<typeof buildDemoSeedPlan>["deadlineTasks"][number]) {
  return task.status !== "done" &&
    task.currentDueDate >= "2026-05-05" &&
    task.currentDueDate <= "2026-05-11";
}

function rowsForFirm(plan: ReturnType<typeof buildDemoSeedPlan>, firmId: string) {
  return {
    auditLogs: plan.auditLogs.filter((row) => row.firmId === firmId),
    clientRelationships: plan.clientRelationships.filter((row) => row.firmId === firmId),
    dateEvents: plan.deadlineDateEvents.filter((row) => row.firmId === firmId),
    deadlineTasks: plan.deadlineTasks.filter((row) => row.firmId === firmId),
    filingProfiles: plan.filingProfiles.filter((row) => row.firmId === firmId),
    noticeImpactProposals: plan.noticeImpactProposals.filter((row) => row.firmId === firmId),
    updateRecords: plan.deadlineTaskUpdateRecords.filter((row) => row.firmId === firmId),
    verificationRequests: plan.verificationRequests.filter((row) => row.firmId === firmId),
  };
}
