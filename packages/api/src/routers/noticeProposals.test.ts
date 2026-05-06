import assert from "node:assert/strict";
import test from "node:test";

import { auditLogs } from "@due-date-hq/db/schema/audit";
import {
  deadlineDateEvents,
  deadlineTaskUpdateRecords,
  deadlineTasks,
  type DeadlineTask,
  filingProfiles,
  type FilingProfile,
} from "@due-date-hq/db/schema/deadline-domain";
import { officialNotices, officialSources } from "@due-date-hq/db/schema/monitoring";
import {
  noticeProposalActions,
  type NoticeImpactProposal,
} from "@due-date-hq/db/schema/notice-proposals";

import type { Context } from "../context";
import { appRouter } from "./index";

type Write = {
  table: unknown;
  row: Record<string, unknown>;
};

type Update = {
  table: unknown;
  values: Record<string, unknown>;
};

function createSelectChain(selectQueue: unknown[][]) {
  const chain = {
    from: (_table: unknown) => chain,
    innerJoin: (_table: unknown, _predicate: unknown) => chain,
    leftJoin: (_table: unknown, _predicate: unknown) => chain,
    where: (_predicate: unknown) => chain,
    orderBy: async (..._columns: unknown[]) => nextSelectResult(selectQueue),
    limit: async (_count: number) => nextSelectResult(selectQueue),
  };

  return chain;
}

function nextSelectResult(selectQueue: unknown[][]): unknown[] {
  return selectQueue.shift() ?? [];
}

function createMockDb({
  selectQueue,
  updateRows,
  updates,
  writes,
}: {
  selectQueue: unknown[][];
  updateRows: unknown[][];
  updates: Update[];
  writes: Write[];
}) {
  return {
    insert: (table: unknown) => ({
      values: async (row: Record<string, unknown>) => {
        writes.push({ table, row });
      },
    }),
    select: () => createSelectChain(selectQueue),
    update: (table: unknown) => ({
      set: (values: Record<string, unknown>) => {
        updates.push({ table, values });

        return {
          where: (_predicate: unknown) => ({
            returning: async () => updateRows.shift() ?? [],
          }),
        };
      },
    }),
  } as unknown as Context["db"];
}

const mockSession = {
  user: {
    id: "user-test",
    email: "cpa@example.com",
    name: "Test CPA",
  },
  firm: {
    id: "firm-test",
    name: "Test Firm",
    ownerUserId: "user-test",
  },
  session: {
    expiresAt: new Date("2026-12-31T00:00:00.000Z"),
  },
} as unknown as NonNullable<Context["session"]>;

function createCaller({
  selectQueue = [],
  updateRows = [],
  updates = [],
  writes = [],
}: {
  selectQueue?: unknown[][];
  updateRows?: unknown[][];
  updates?: Update[];
  writes?: Write[];
} = {}) {
  return appRouter.createCaller({
    auth: null as unknown as Context["auth"],
    db: createMockDb({ selectQueue, updateRows, updates, writes }),
    firm: mockSession.firm,
    session: mockSession,
  });
}

function makeTask(overrides: Partial<DeadlineTask> = {}): DeadlineTask {
  const now = new Date("2026-05-05T00:00:00.000Z");

  return {
    id: "task-test",
    firmId: "firm-test",
    clientRelationshipId: "client-test",
    filingProfileId: "profile-test",
    taxRuleId: "rule-test",
    title: "Form 1120 Filing",
    jurisdiction: "federal",
    taxCategory: "Income tax",
    currentDueDate: "2026-04-15",
    originalDueDate: "2026-04-15",
    firmTargetDate: null,
    recurrenceKey: "annual",
    status: "not_started",
    priority: "normal",
    sourceType: "verified_rule",
    createdVia: "system_rule",
    enteredDeadlineReferenceNote: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeProposal(overrides: Partial<NoticeImpactProposal> = {}): NoticeImpactProposal {
  const now = new Date("2026-05-05T00:00:00.000Z");

  return {
    id: "proposal-test",
    officialNoticeId: "notice-test",
    firmId: "firm-test",
    filingProfileId: "profile-test",
    deadlineTaskId: "task-test",
    proposalType: "task_update",
    beforeState: {
      currentDueDate: "2026-04-15",
      originalDueDate: "2026-04-15",
      status: "not_started",
    },
    afterState: {
      currentDueDate: "2026-10-15",
      originalDueDate: "2026-04-15",
      status: "in_progress",
    },
    confidenceLabel: "high",
    confidenceReasons: ["P0 source", "Workspace match"],
    status: "pending",
    decidedBy: null,
    decidedAt: null,
    auditLogId: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeProfile(overrides: Partial<FilingProfile> = {}): FilingProfile {
  const now = new Date("2026-05-05T00:00:00.000Z");

  return {
    id: "profile-test",
    firmId: "firm-test",
    clientRelationshipId: "client-test",
    displayName: "Gulf Coast 1120",
    entityType: "c_corp",
    states: ["federal"],
    county: null,
    fiscalYearType: "calendar_year",
    ein: "12-3456789",
    ssnLast4: null,
    coverageState: "ready",
    notes: null,
    sourceSystem: "manual",
    sourceRowId: null,
    createdVia: "manual",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeDecisionRow(proposal: NoticeImpactProposal = makeProposal()) {
  const now = new Date("2026-05-05T00:00:00.000Z");

  return {
    proposal,
    notice: {
      id: "notice-test",
      sourceId: "source-test",
      sourceSnapshotId: null,
      noticeUrl: "https://www.irs.gov/newsroom/tax-relief-in-disaster-situations",
      noticeTitle: "IRS disaster relief postpones affected filing deadlines",
      noticePublishedAt: now,
      noticeSummary: "Affected taxpayers receive postponed filing and payment deadlines.",
      jurisdiction: "federal",
      deadlineRelevance: "high",
      confidenceLabel: "high",
      confidenceReasons: ["P0 source"],
      impactConditions: [],
      workspaceMatchHints: {
        jurisdictions: ["federal"],
        entityTypes: ["c_corp"],
        taxCategories: ["Income tax"],
      },
      alertVisibility: "workspace_alert",
      detectedAt: now,
      createdAt: now,
      updatedAt: now,
    } satisfies typeof officialNotices.$inferSelect,
    source: {
      id: "source-test",
      jurisdiction: "federal",
      agencyName: "IRS",
      sourceType: "html",
      sourceUrl: "https://www.irs.gov",
      allowlistLevel: "p0",
      deadlineScope: "Disaster relief",
      monitorFrequencyHours: 24,
      active: true,
      lastCheckedAt: now,
      lastChangedAt: now,
      lastStatus: "success",
      lastErrorMessage: null,
      createdAt: now,
      updatedAt: now,
    } satisfies typeof officialSources.$inferSelect,
  };
}

test("noticeProposals.reject records audit and action without mutating workspace state", async () => {
  const writes: Write[] = [];
  const updates: Update[] = [];
  const updatedProposal = makeProposal({
    status: "rejected",
    decidedBy: "user-test",
    decidedAt: new Date("2026-05-05T01:00:00.000Z"),
    auditLogId: "audit-test",
  });
  const caller = createCaller({
    selectQueue: [[makeDecisionRow()]],
    updateRows: [[updatedProposal]],
    updates,
    writes,
  });

  const result = await caller.noticeProposals.reject({ proposalId: "proposal-test" });

  assert.equal(result.proposal.status, "rejected");
  assert.equal(updates.some((update) => update.table === deadlineTasks), false);
  assert.equal(writes.some((write) => write.table === deadlineDateEvents), false);
  assert.equal(writes.some((write) => write.table === deadlineTaskUpdateRecords), false);
  assert.equal(writes.find((write) => write.table === auditLogs)?.row.action, "notice_proposal.reject");
  assert.equal(writes.find((write) => write.table === noticeProposalActions)?.row.action, "reject");
});

test("noticeProposals.approve applies task update and records row-level audit history", async () => {
  const writes: Write[] = [];
  const updates: Update[] = [];
  const updatedTask = makeTask({
    currentDueDate: "2026-10-15",
    originalDueDate: "2026-04-15",
    status: "in_progress",
  });
  const updatedProposal = makeProposal({
    status: "approved",
    decidedBy: "user-test",
    decidedAt: new Date("2026-05-05T01:00:00.000Z"),
    auditLogId: "audit-test",
  });
  const caller = createCaller({
    selectQueue: [[makeDecisionRow()], [makeTask()]],
    updateRows: [[updatedTask], [updatedProposal]],
    updates,
    writes,
  });

  const result = await caller.noticeProposals.approve({ proposalId: "proposal-test" });

  assert.equal(result.proposal.status, "approved");
  assert.ok(
    updates.some(
      (update) =>
        update.table === deadlineTasks &&
        update.values.currentDueDate === "2026-10-15" &&
        update.values.status === "in_progress",
    ),
  );
  assert.equal(writes.find((write) => write.table === auditLogs)?.row.action, "notice_proposal.approve");
  assert.equal(writes.find((write) => write.table === deadlineDateEvents)?.row.eventType, "official_relief_change");
  assert.deepEqual(
    writes
      .filter((write) => write.table === deadlineTaskUpdateRecords)
      .map((write) => write.row.fieldName)
      .sort(),
    ["currentDueDate", "status"],
  );
  assert.equal(writes.find((write) => write.table === noticeProposalActions)?.row.action, "approve");
});

test("noticeProposals.decideLater records audit and action without mutating workspace state", async () => {
  const writes: Write[] = [];
  const updates: Update[] = [];
  const updatedProposal = makeProposal({
    status: "decide_later",
    decidedBy: "user-test",
    decidedAt: new Date("2026-05-05T01:00:00.000Z"),
    auditLogId: "audit-test",
  });
  const caller = createCaller({
    selectQueue: [[makeDecisionRow()]],
    updateRows: [[updatedProposal]],
    updates,
    writes,
  });

  const result = await caller.noticeProposals.decideLater({ proposalId: "proposal-test" });

  assert.equal(result.proposal.status, "decide_later");
  assert.equal(updates.some((update) => update.table === deadlineTasks), false);
  assert.equal(writes.some((write) => write.table === deadlineDateEvents), false);
  assert.equal(writes.some((write) => write.table === deadlineTaskUpdateRecords), false);
  assert.equal(
    writes.find((write) => write.table === auditLogs)?.row.action,
    "notice_proposal.decide_later",
  );
  assert.equal(
    writes.find((write) => write.table === noticeProposalActions)?.row.action,
    "decide_later",
  );
});

test("noticeProposals.approve rejects low-confidence internal queue proposals", async () => {
  const writes: Write[] = [];
  const updates: Update[] = [];
  const lowConfidenceRow = makeDecisionRow(
    makeProposal({ confidenceLabel: "low" }),
  );
  const caller = createCaller({
    selectQueue: [
      [
        {
          ...lowConfidenceRow,
          notice: {
            ...lowConfidenceRow.notice,
            alertVisibility: "internal_queue",
            confidenceLabel: "low",
          },
        },
      ],
    ],
    updates,
    writes,
  });

  await assert.rejects(
    caller.noticeProposals.approve({ proposalId: "proposal-test" }),
    /Notice proposal was not found/,
  );
  assert.equal(updates.length, 0);
  assert.equal(writes.length, 0);
});

test("noticeProposals.approve applies coverage review status proposals", async () => {
  const writes: Write[] = [];
  const updates: Update[] = [];
  const proposal = makeProposal({
    deadlineTaskId: null,
    proposalType: "coverage_review_status_update",
    beforeState: { coverageState: "ready" },
    afterState: { coverageState: "needs_review" },
  });
  const updatedProfile = makeProfile({ coverageState: "needs_review" });
  const updatedProposal = {
    ...proposal,
    status: "approved",
    decidedBy: "user-test",
    decidedAt: new Date("2026-05-05T01:00:00.000Z"),
    auditLogId: "audit-test",
  } satisfies NoticeImpactProposal;
  const caller = createCaller({
    selectQueue: [[makeDecisionRow(proposal)], [makeProfile()]],
    updateRows: [[updatedProfile], [updatedProposal]],
    updates,
    writes,
  });

  const result = await caller.noticeProposals.approve({ proposalId: "proposal-test" });

  assert.equal(result.proposal.status, "approved");
  assert.ok(
    updates.some(
      (update) =>
        update.table === filingProfiles && update.values.coverageState === "needs_review",
    ),
  );
  assert.equal(writes.some((write) => write.table === deadlineDateEvents), false);
  assert.equal(writes.find((write) => write.table === auditLogs)?.row.entityType, "filing_profile");
});

test("noticeProposals.bulkReject writes a shared bulk action id on each action row", async () => {
  const writes: Write[] = [];
  const updates: Update[] = [];
  const caller = createCaller({
    selectQueue: [
      [makeDecisionRow(makeProposal({ id: "proposal-one" }))],
      [makeDecisionRow(makeProposal({ id: "proposal-two" }))],
    ],
    updateRows: [
      [makeProposal({ id: "proposal-one", status: "rejected", decidedBy: "user-test", decidedAt: new Date() })],
      [makeProposal({ id: "proposal-two", status: "rejected", decidedBy: "user-test", decidedAt: new Date() })],
    ],
    updates,
    writes,
  });

  const result = await caller.noticeProposals.bulkReject({
    proposalIds: ["proposal-one", "proposal-two"],
  });
  const actionWrites = writes.filter((write) => write.table === noticeProposalActions);
  const bulkActionIds = new Set(actionWrites.map((write) => write.row.bulkActionId));

  assert.equal(result.updatedCount, 2);
  assert.equal(actionWrites.length, 2);
  assert.equal(bulkActionIds.size, 1);
  assert.equal(result.bulkActionId, actionWrites[0]?.row.bulkActionId);
});
