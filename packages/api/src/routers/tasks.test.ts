import assert from "node:assert/strict";
import test from "node:test";

import { auditLogs } from "@due-date-hq/db/schema/audit";
import {
  deadlineDateEvents,
  deadlineTaskUpdateRecords,
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
    orderBy: async (..._columns: unknown[]) => nextSelectResult(selectQueue),
    limit: async (_count: number) => nextSelectResult(selectQueue),
  };

  return chain;
}

function nextSelectResult(selectQueue: unknown[][]): unknown[] {
  const next = selectQueue.shift();

  if (next instanceof Error) {
    throw next;
  }

  return next ?? [];
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
    enteredDeadlineReferenceNote: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

test("tasks.updateStatus records audit and field-level status history", async () => {
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
  const auditWrite = writes.find((write) => write.table === auditLogs);
  const updateWrite = writes.find((write) => write.table === deadlineTaskUpdateRecords);

  assert.equal(auditWrite?.row.action, "deadline_task.update_status");
  assert.equal((auditWrite?.row.metadata as Record<string, unknown>).officialDueDateMutated, false);
  assert.equal(updateWrite?.row.fieldName, "status");
  assert.equal(updateWrite?.row.previousValue, "not_started");
  assert.equal(updateWrite?.row.newValue, "done");
  assert.equal(updateWrite?.row.action, "deadline_task.update_status");
});

test("tasks.updateStatus skips update records when status is unchanged", async () => {
  const writes: Write[] = [];
  const caller = createCaller({
    selectQueue: [[makeTask({ status: "done" })]],
    updateRows: [],
    writes,
  });

  const result = await caller.tasks.updateStatus({
    taskId: "task-test",
    status: "done",
  });

  assert.equal(result.status, "done");
  assert.equal(writes.length, 0);
});

test("tasks.updateFirmTargetDate records date event and field-level history separately", async () => {
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
  const updateWrite = writes.find((write) => write.table === deadlineTaskUpdateRecords);

  assert.equal(auditWrite?.row.action, "deadline_task.update_firm_target_date");
  assert.equal(eventWrite?.row.eventType, "firm_target_change");
  assert.equal(eventWrite?.row.previousCurrentDueDate, null);
  assert.equal(eventWrite?.row.newCurrentDueDate, null);
  assert.equal(eventWrite?.row.newFirmTargetDate, "2026-05-01");
  assert.equal(updateWrite?.row.fieldName, "firmTargetDate");
  assert.equal(updateWrite?.row.previousValue, null);
  assert.equal(updateWrite?.row.newValue, "2026-05-01");
});

test("tasks.markExtended records official extension and field-level due date history", async () => {
  const writes: Write[] = [];
  const updatedTask = makeTask({
    currentDueDate: "2026-09-15",
    originalDueDate: "2026-05-15",
  });
  const caller = createCaller({
    selectQueue: [[makeTask({ currentDueDate: "2026-05-15", originalDueDate: null })]],
    updateRows: [updatedTask],
    writes,
  });

  const result = await caller.tasks.markExtended({
    taskId: "task-test",
    newCurrentDueDate: "2026-09-15",
  });

  assert.equal(result.currentDueDate, "2026-09-15");
  assert.equal(result.originalDueDate, "2026-05-15");

  const auditWrite = writes.find((write) => write.table === auditLogs);
  const eventWrite = writes.find((write) => write.table === deadlineDateEvents);
  const updateWrites = writes.filter((write) => write.table === deadlineTaskUpdateRecords);

  assert.equal(auditWrite?.row.action, "deadline_task.mark_extended");
  assert.equal((auditWrite?.row.metadata as Record<string, unknown>).officialDueDateMutated, true);
  assert.equal(eventWrite?.row.eventType, "official_extension");
  assert.equal(eventWrite?.row.previousCurrentDueDate, "2026-05-15");
  assert.equal(eventWrite?.row.newCurrentDueDate, "2026-09-15");
  assert.equal(eventWrite?.row.sourceName, "CPA-recorded extension");
  assert.deepEqual(
    updateWrites.map((write) => write.row.fieldName).sort(),
    ["currentDueDate", "originalDueDate"],
  );
  assert.ok(
    updateWrites.some(
      (write) =>
        write.row.fieldName === "currentDueDate" &&
        write.row.previousValue === "2026-05-15" &&
        write.row.newValue === "2026-09-15",
    ),
  );
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
  assert.equal(writes.filter((write) => write.table === deadlineTaskUpdateRecords).length, 2);
});

test("tasks.getEvidence returns source, date event history, and task update history", async () => {
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
  const updateRecord = {
    id: "update-test",
    firmId: "firm-test",
    deadlineTaskId: "task-test",
    fieldName: "status",
    previousValue: "not_started",
    newValue: "done",
    action: "deadline_task.update_status",
    auditLogId: "audit-test",
    actorUserId: "user-test",
    createdAt: new Date("2026-04-02T00:00:00.000Z"),
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
      [{ version: 1 }],
      [event],
      [updateRecord],
    ],
    updateRows: [],
  });

  const result = await caller.tasks.getEvidence({ taskId: "task-test" });

  assert.equal(result.task.originalDueDate, "2026-03-15");
  assert.equal(result.rule?.verificationStatus, "verified");
  assert.equal(result.rule?.previousVersion, 1);
  assert.equal(result.dateEvents.length, 1);
  assert.equal(result.dateEvents[0]?.eventType, "official_extension");
  assert.equal(result.dateEvents[0]?.sourceUrl, "https://www.irs.gov");
  assert.equal(result.updateRecords.length, 1);
  assert.equal(result.updateRecords[0]?.fieldName, "status");
  assert.equal(result.updateRecords[0]?.previousValue, "not_started");
  assert.equal(result.updateRecords[0]?.newValue, "done");
});

test("tasks.getEvidence tolerates local databases missing task update records table", async () => {
  const task = makeTask();
  const caller = createCaller({
    selectQueue: [
      [task],
      [
        {
          task,
          client: { id: "client-test", displayName: "Acme LLC" },
          profile: { id: "profile-test", displayName: "Acme federal", entityType: "s_corp" },
          rule: null,
        },
      ],
      [],
      new Error("D1_ERROR: no such table: deadline_task_update_records") as unknown as unknown[],
    ],
    updateRows: [],
  });

  const result = await caller.tasks.getEvidence({ taskId: "task-test" });

  assert.deepEqual(result.updateRecords, []);
});
