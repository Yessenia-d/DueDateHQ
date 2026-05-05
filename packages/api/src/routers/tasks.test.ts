import assert from "node:assert/strict";
import test from "node:test";

import { auditLogs } from "@due-date-hq/db/schema/audit";
import {
  deadlineDateEvents,
  type DeadlineTask,
} from "@due-date-hq/db/schema/deadline-domain";

import type { Context } from "../context";
import { appRouter } from "./index";

type Write = {
  table: unknown;
  row: Record<string, unknown>;
};

function createSelectChain(selectQueue: unknown[][]) {
  const chain = {
    from: (_table: unknown) => chain,
    innerJoin: (_table: unknown, _predicate: unknown) => chain,
    leftJoin: (_table: unknown, _predicate: unknown) => chain,
    where: (_predicate: unknown) => chain,
    orderBy: async (..._columns: unknown[]) => selectQueue.shift() ?? [],
    limit: async (_count: number) => selectQueue.shift() ?? [],
  };

  return chain;
}

function createMockDb({
  selectQueue,
  updateRows,
  writes,
}: {
  selectQueue: unknown[][];
  updateRows: unknown[];
  writes: Write[];
}) {
  return {
    insert: (table: unknown) => ({
      values: async (row: Record<string, unknown>) => {
        writes.push({ table, row });
      },
    }),
    select: () => createSelectChain(selectQueue),
    update: (_table: unknown) => ({
      set: (_values: Record<string, unknown>) => ({
        where: (_predicate: unknown) => ({
          returning: async () => updateRows,
        }),
      }),
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
  writes = [],
}: {
  selectQueue?: unknown[][];
  updateRows?: unknown[];
  writes?: Write[];
} = {}) {
  return appRouter.createCaller({
    auth: null as unknown as Context["auth"],
    db: createMockDb({ selectQueue, updateRows, writes }),
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
    title: "Form 1120-S Filing",
    jurisdiction: "federal",
    taxCategory: "Income Tax",
    currentDueDate: "2026-05-15",
    originalDueDate: "2026-03-15",
    firmTargetDate: null,
    recurrenceKey: "annual",
    status: "not_started",
    priority: "normal",
    sourceType: "verified_rule",
    createdVia: "system_rule",
    userProvidedSourceNote: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

test("tasks.updateStatus records an audit log without mutating official due dates", async () => {
  const writes: Write[] = [];
  const updatedTask = makeTask({ status: "done" });
  const caller = createCaller({
    selectQueue: [[makeTask()]],
    updateRows: [updatedTask],
    writes,
  });

  const result = await caller.tasks.updateStatus({
    taskId: "task-test",
    status: "done",
  });

  assert.equal(result.status, "done");
  assert.equal(writes.length, 1);
  assert.equal(writes[0]?.table, auditLogs);
  assert.equal(writes[0]?.row.action, "deadline_task.update_status");
  assert.equal((writes[0]?.row.metadata as Record<string, unknown>).officialDueDateMutated, false);
});

test("tasks.updateFirmTargetDate records firm target date history separately", async () => {
  const writes: Write[] = [];
  const updatedTask = makeTask({ firmTargetDate: "2026-05-01" });
  const caller = createCaller({
    selectQueue: [[makeTask()]],
    updateRows: [updatedTask],
    writes,
  });

  const result = await caller.tasks.updateFirmTargetDate({
    taskId: "task-test",
    firmTargetDate: "2026-05-01",
  });

  assert.equal(result.firmTargetDate, "2026-05-01");

  const auditWrite = writes.find((write) => write.table === auditLogs);
  const eventWrite = writes.find((write) => write.table === deadlineDateEvents);

  assert.equal(auditWrite?.row.action, "deadline_task.update_firm_target_date");
  assert.equal(eventWrite?.row.eventType, "firm_target_change");
  assert.equal(eventWrite?.row.previousCurrentDueDate, null);
  assert.equal(eventWrite?.row.newCurrentDueDate, null);
  assert.equal(eventWrite?.row.newFirmTargetDate, "2026-05-01");
});

test("tasks.bulkUpdateStatus updates each selected task", async () => {
  const writes: Write[] = [];
  const caller = createCaller({
    selectQueue: [[makeTask({ id: "task-a" })], [makeTask({ id: "task-b" })]],
    updateRows: [makeTask({ status: "waiting_on_client" })],
    writes,
  });

  const result = await caller.tasks.bulkUpdateStatus({
    taskIds: ["task-a", "task-b"],
    status: "waiting_on_client",
  });

  assert.equal(result.updatedCount, 2);
  assert.equal(writes.filter((write) => write.table === auditLogs).length, 2);
});

test("tasks.getEvidence returns source and date event history", async () => {
  const task = makeTask();
  const event = {
    id: "event-test",
    firmId: "firm-test",
    deadlineTaskId: "task-test",
    eventType: "official_extension",
    previousCurrentDueDate: "2026-03-15",
    newCurrentDueDate: "2026-09-15",
    previousFirmTargetDate: null,
    newFirmTargetDate: null,
    sourceName: "IRS",
    sourceUrl: "https://www.irs.gov",
    sourceSnapshotId: null,
    createdBy: "user-test",
    auditLogId: null,
    createdAt: new Date("2026-04-01T00:00:00.000Z"),
    notes: "Official extension recorded.",
  };
  const caller = createCaller({
    selectQueue: [
      [task],
      [
        {
          task,
          client: { id: "client-test", displayName: "Acme LLC" },
          profile: { id: "profile-test", displayName: "Acme federal", entityType: "s_corp" },
          rule: {
            id: "rule-test",
            ruleSummary: "S Corporation return due March 15.",
            verificationStatus: "verified",
            sourceName: "IRS",
            sourceUrl: "https://www.irs.gov",
            lastVerifiedAt: new Date("2026-04-01T00:00:00.000Z"),
            sourceLastCheckedAt: new Date("2026-04-01T00:00:00.000Z"),
            sourceLastChangedAt: null,
            verificationNotes: "Verified from official source.",
            currentVersion: 1,
          },
        },
      ],
      [event],
    ],
    updateRows: [],
  });

  const result = await caller.tasks.getEvidence({ taskId: "task-test" });

  assert.equal(result.task.originalDueDate, "2026-03-15");
  assert.equal(result.rule?.verificationStatus, "verified");
  assert.equal(result.dateEvents.length, 1);
  assert.equal(result.dateEvents[0]?.eventType, "official_extension");
});
