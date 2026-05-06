import assert from "node:assert/strict";
import test from "node:test";

import {
  DEMO_ACCOUNTS,
  DEMO_ACCOUNT_AVATAR_URL,
  DEMO_PASSWORD,
  adaptDemoSeedPlanForDeadlineTaskStatusCompatibility,
  buildDemoSeedPlan,
  needsReadyToWorkStatusCompatibilityPatch,
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

  const triageUser = first.users.find((row) => row.email === "demo-triage@duedatehq.test");
  const triageAccount = first.accounts.find((row) => row.userId === "demo-user-triage");
  const triageFirm = first.firms.find((row) => row.id === "demo-firm-triage");
  assert.equal(triageUser?.createdAt.toISOString(), "2026-02-03T12:00:00.000Z");
  assert.equal(triageAccount?.createdAt.toISOString(), "2026-02-03T12:00:00.000Z");
  assert.equal(triageFirm?.createdAt.toISOString(), "2026-02-03T12:00:00.000Z");

  for (const demoUser of first.users) {
    assert.equal(demoUser.image, DEMO_ACCOUNT_AVATAR_URL);
  }

  for (const firm of first.firms.filter((row) => row.id !== "demo-firm-triage")) {
    assert.equal(firm.createdAt.toISOString(), "2026-05-05T12:00:00.000Z");
  }

  for (const firm of first.firms) {
    const firmRows = first.clientRelationships.filter((client) => client.firmId === firm.id);
    const profileRows = first.filingProfiles.filter((profile) => profile.firmId === firm.id);
    const taskRows = first.deadlineTasks.filter((task) => task.firmId === firm.id);

    assert.ok(firmRows.length >= 2, `${firm.id} should have multiple demo clients`);
    assert.ok(profileRows.length >= 2, `${firm.id} should have multiple filing profiles`);
    assert.ok(taskRows.length >= 2, `${firm.id} should have multiple deadline tasks`);
  }
});

test("demo seed detects stale local D1 deadline task status constraints", () => {
  assert.equal(
    needsReadyToWorkStatusCompatibilityPatch(
      `CREATE TABLE "deadline_tasks" (
        CONSTRAINT "deadline_tasks_status_check" CHECK("status" in ('not_started', 'in_progress', 'waiting_on_client', 'done'))
      )`,
    ),
    true,
  );

  assert.equal(
    needsReadyToWorkStatusCompatibilityPatch(
      `CREATE TABLE "deadline_tasks" (
        CONSTRAINT "deadline_tasks_status_check" CHECK("status" in ('not_started', 'waiting_on_client', 'ready_to_work', 'in_progress', 'done'))
      )`,
    ),
    false,
  );
});

test("demo seed adapts ready_to_work tasks for legacy local D1 schemas", () => {
  const plan = buildDemoSeedPlan({ passwordHash: "hash-one" });
  const adapted = adaptDemoSeedPlanForDeadlineTaskStatusCompatibility(plan, {
    readyToWorkSupported: false,
  });

  assert.ok(plan.deadlineTasks.some((task) => task.status === "ready_to_work"));
  assert.equal(adapted.deadlineTasks.some((task) => task.status === "ready_to_work"), false);
  assert.ok(adapted.deadlineTasks.some((task) => task.status === "in_progress"));
  assert.equal(plan.deadlineTasks.some((task) => task.status === "ready_to_work"), true);
  assert.equal(
    adapted.deadlineTaskUpdateRecords.some((record) => record.newValue === "ready_to_work"),
    false,
  );
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
  const triageCompletedTasks = triage.deadlineTasks.filter((task) => task.status === "done");
  const triageProfilesById = new Map(
    triage.filingProfiles.map((profile) => [profile.id, profile]),
  );
  const completedJurisdictions = new Set(
    triageCompletedTasks.map((task) =>
      task.jurisdiction.toLowerCase() === "federal" ? "Federal" : task.jurisdiction,
    ),
  );
  const completedTaxCategories = new Set(
    triageCompletedTasks.map((task) => task.taxCategory),
  );
  const completedEntityTypes = new Set(
    triageCompletedTasks.map((task) => triageProfilesById.get(task.filingProfileId)?.entityType),
  );

  assert.ok(triageCompletedTasks.length >= 9);
  for (const jurisdiction of ["Federal", "CA", "NY", "TX", "FL"]) {
    assert.ok(
      completedJurisdictions.has(jurisdiction),
      `completed triage tasks should include ${jurisdiction}`,
    );
  }
  for (const taxCategory of ["Income tax", "Estimated tax", "Franchise tax", "Sales tax"]) {
    assert.ok(
      completedTaxCategories.has(taxCategory),
      `completed triage tasks should include ${taxCategory}`,
    );
  }
  for (const entityType of [
    "individual",
    "s_corp",
    "c_corp",
    "partnership",
    "llc",
    "trust_estate",
  ] as const) {
    assert.ok(
      completedEntityTypes.has(entityType),
      `completed triage tasks should include ${entityType}`,
    );
  }
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
  assert.ok(
    new Set(triage.deadlineTasks.map((task) => task.status)).has("ready_to_work"),
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
