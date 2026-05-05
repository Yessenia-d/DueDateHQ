import assert from "node:assert/strict";
import test from "node:test";

import { auditLogs } from "@due-date-hq/db/schema/audit";
import {
  clientRelationships,
  deadlineDateEvents,
  deadlineTaskUpdateRecords,
  deadlineTasks,
  filingProfiles,
  type ClientRelationship,
  type DeadlineTask,
  type FilingProfile,
} from "@due-date-hq/db/schema/deadline-domain";
import { verificationRequests } from "@due-date-hq/db/schema/tax-rules";

import type { Context } from "../context";
import { appRouter } from "./index";

type InsertWrite = {
  table: unknown;
  row: Record<string, unknown>;
};

type UpdateWrite = {
  table: unknown;
  values: Record<string, unknown>;
};

function createReturningInsert(rowSink: InsertWrite[], table: unknown) {
  return {
    values: (row: Record<string, unknown>) => {
      rowSink.push({ table, row });
      return {
        returning: async () => [row],
      };
    },
  };
}

function createReturningUpdate(
  rowSink: UpdateWrite[],
  table: unknown,
  updateQueue: unknown[][],
) {
  return {
    set: (values: Record<string, unknown>) => {
      rowSink.push({ table, values });
      return {
        where: (_predicate: unknown) => ({
          returning: async () => updateQueue.shift() ?? [],
        }),
      };
    },
  };
}

function createSelectChain(selectQueue: unknown[][]) {
  return {
    from: (_table: unknown) => ({
      where: (_predicate: unknown) => ({
        limit: async (_count: number) => selectQueue.shift() ?? [],
        orderBy: async (..._columns: unknown[]) => selectQueue.shift() ?? [],
      }),
    }),
  };
}

function createMockDb({
  selectQueue = [],
  updateQueue = [],
  updateWrites = [],
  writes = [],
}: {
  selectQueue?: unknown[][];
  updateQueue?: unknown[][];
  updateWrites?: UpdateWrite[];
  writes?: InsertWrite[];
} = {}) {
  return {
    insert: (table: unknown) => createReturningInsert(writes, table),
    select: () => createSelectChain(selectQueue),
    update: (table: unknown) => createReturningUpdate(updateWrites, table, updateQueue),
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
  selectQueue,
  updateQueue,
  updateWrites,
  writes,
}: {
  selectQueue?: unknown[][];
  updateQueue?: unknown[][];
  updateWrites?: UpdateWrite[];
  writes?: InsertWrite[];
} = {}) {
  return appRouter.createCaller({
    auth: null as unknown as Context["auth"],
    db: createMockDb({ selectQueue, updateQueue, updateWrites, writes }),
    firm: mockSession.firm,
    session: mockSession,
  });
}

function makeClient(overrides: Partial<ClientRelationship> = {}): ClientRelationship {
  const now = new Date("2026-05-05T00:00:00.000Z");

  return {
    id: "client-test",
    firmId: "firm-test",
    displayName: "Acme LLC",
    relationshipType: "business",
    notes: null,
    sourceSystem: "manual",
    createdVia: "manual",
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
    displayName: "Acme federal profile",
    ein: null,
    ssnLast4: null,
    entityType: "llc",
    states: ["CA"],
    county: null,
    fiscalYearType: "calendar_year",
    coverageState: "needs_review",
    notes: null,
    sourceSystem: "manual",
    sourceRowId: null,
    createdVia: "manual",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeDeadline(overrides: Partial<DeadlineTask> = {}): DeadlineTask {
  const now = new Date("2026-05-05T00:00:00.000Z");

  return {
    id: "deadline-test",
    firmId: "firm-test",
    clientRelationshipId: "client-test",
    filingProfileId: "profile-test",
    taxRuleId: null,
    title: "Form 568 Filing",
    jurisdiction: "CA",
    taxCategory: "Franchise tax",
    currentDueDate: "2026-04-15",
    originalDueDate: null,
    firmTargetDate: "2026-04-01",
    recurrenceKey: "annual",
    status: "not_started",
    priority: "normal",
    sourceType: "entered_deadline",
    createdVia: "manual",
    enteredDeadlineReferenceNote: "CPA provided from organizer notes.",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

test("clients.createRelationship creates a manual firm-owned relationship", async () => {
  const writes: InsertWrite[] = [];
  const caller = createCaller({ writes });

  const result = await caller.clients.createRelationship({
    displayName: "Acme LLC",
    relationshipType: "business",
    notes: "Special handling",
  });

  assert.equal(result.client.displayName, "Acme LLC");
  assert.equal(result.client.createdVia, "manual");
  assert.equal(writes.length, 1);
  assert.equal(writes[0]?.table, clientRelationships);
  assert.equal(writes[0]?.row.firmId, "firm-test");
  assert.equal(writes[0]?.row.createdVia, "manual");
  assert.equal(writes[0]?.row.sourceSystem, "manual");
});

test("clients.updateNotes updates firm-owned relationship notes and clears empty notes", async () => {
  const writes: InsertWrite[] = [];
  const updateWrites: UpdateWrite[] = [];
  const caller = createCaller({
    selectQueue: [[makeClient({ notes: "Special handling" })], [makeDeadline()]],
    updateQueue: [
      [
        makeClient({
          notes: null,
          updatedAt: new Date("2026-05-05T12:00:00.000Z"),
        }),
      ],
    ],
    updateWrites,
    writes,
  });

  const result = await caller.clients.updateNotes({
    clientRelationshipId: "client-test",
    notes: "   ",
  });

  assert.equal(result.client.id, "client-test");
  assert.equal(result.client.notes, null);
  assert.equal(updateWrites.length, 1);
  assert.equal(updateWrites[0]?.table, clientRelationships);
  assert.equal(updateWrites[0]?.values.notes, null);
  assert.ok(updateWrites[0]?.values.updatedAt instanceof Date);

  const updateRecordWrite = writes.find((write) => write.table === deadlineTaskUpdateRecords);
  assert.equal(updateRecordWrite?.row.deadlineTaskId, "deadline-test");
  assert.equal(updateRecordWrite?.row.fieldName, "notes");
  assert.equal(updateRecordWrite?.row.previousValue, "Special handling");
  assert.equal(updateRecordWrite?.row.newValue, null);
});

test("clients.list returns firm-owned relationships with profile and deadline counts", async () => {
  const caller = createCaller({
    selectQueue: [
      [
        makeClient({
          id: "client-alpha",
          displayName: "Alpha Dental",
          relationshipType: "business",
        }),
        makeClient({
          id: "client-beta",
          displayName: "Beta Family",
          relationshipType: "household",
        }),
      ],
      [
        { clientRelationshipId: "client-alpha" },
        { clientRelationshipId: "client-alpha" },
        { clientRelationshipId: "client-beta" },
      ],
      [
        { clientRelationshipId: "client-alpha" },
        { clientRelationshipId: "client-beta" },
        { clientRelationshipId: "client-beta" },
      ],
    ],
  });

  const result = await caller.clients.list();

  assert.deepEqual(
    result.clients.map((client) => ({
      id: client.id,
      displayName: client.displayName,
      relationshipType: client.relationshipType,
      filingProfileCount: client.filingProfileCount,
      deadlineTaskCount: client.deadlineTaskCount,
    })),
    [
      {
        id: "client-alpha",
        displayName: "Alpha Dental",
        relationshipType: "business",
        filingProfileCount: 2,
        deadlineTaskCount: 1,
      },
      {
        id: "client-beta",
        displayName: "Beta Family",
        relationshipType: "household",
        filingProfileCount: 1,
        deadlineTaskCount: 2,
      },
    ],
  );
});

test("filingProfiles.createManual attaches a manual tax profile to the client", async () => {
  const writes: InsertWrite[] = [];
  const caller = createCaller({ selectQueue: [[makeClient()]], writes });

  const result = await caller.filingProfiles.createManual({
    clientRelationshipId: "client-test",
    displayName: "Acme California profile",
    entityType: "llc",
    states: ["ca", "CA"],
    county: "Alameda",
    fiscalYearType: "calendar_year",
    notes: "California franchise tax profile",
  });

  assert.equal(result.profile.displayName, "Acme California profile");
  assert.deepEqual(result.profile.states, ["CA"]);
  assert.equal(result.profile.coverageState, "needs_review");
  assert.equal(writes.length, 1);
  assert.equal(writes[0]?.table, filingProfiles);
  assert.equal(writes[0]?.row.createdVia, "manual");
  assert.equal(writes[0]?.row.sourceSystem, "manual");
});

test("deadlineTasks.createManual stores entered deadlines internally and marks them not verified", async () => {
  const writes: InsertWrite[] = [];
  const caller = createCaller({ selectQueue: [[makeClient()], [makeProfile()]], writes });

  const result = await caller.deadlineTasks.createManual({
    clientRelationshipId: "client-test",
    filingProfileId: "profile-test",
    taxCategory: "Franchise tax",
    jurisdiction: "CA",
    formOrObligation: "Form 568",
    deadlineKind: "filing",
    currentDueDate: "2026-04-15",
    firmTargetDate: "2026-04-01",
    priority: "high",
    recurrence: "annual",
    referenceNote: "CPA provided from organizer notes.",
  });

  assert.equal(result.deadline.sourceType, "entered_deadline");
  assert.equal(result.deadline.createdVia, "manual");
  assert.equal(result.deadline.taxRuleId, null);
  assert.equal(result.deadline.originalDueDate, null);
  assert.equal(result.deadline.firmTargetDate, "2026-04-01");
  assert.equal(result.deadline.trustLabel, "Entered deadline - Not verified by DueDateHQ");
  assert.equal(result.deadline.referenceLabel, "Reference");
  assert.equal(result.deadline.referenceNote, "CPA provided from organizer notes.");
  assert.equal(result.deadline.recurrenceLabel, "Recurring entered deadline");

  const deadlineWrite = writes.find((write) => write.table === deadlineTasks);
  const auditWrite = writes.find((write) => write.table === auditLogs);
  const dateEventWrite = writes.find((write) => write.table === deadlineDateEvents);

  assert.equal(deadlineWrite?.row.sourceType, "entered_deadline");
  assert.equal(deadlineWrite?.row.createdVia, "manual");
  assert.equal(deadlineWrite?.row.taxRuleId, null);
  assert.equal(auditWrite?.row.action, "deadline_task.create_manual");
  assert.equal(dateEventWrite?.row.eventType, "firm_target_change");
  assert.equal(dateEventWrite?.row.newFirmTargetDate, "2026-04-01");
});

test("clients.get returns manual profiles and entered deadline trust state", async () => {
  const caller = createCaller({
    selectQueue: [[makeClient()], [makeProfile()], [makeDeadline()]],
  });

  const result = await caller.clients.get({ clientId: "client-test" });

  assert.equal(result.client.id, "client-test");
  assert.equal(result.profiles.length, 1);
  assert.equal(result.profiles[0]?.displayName, "Acme federal profile");
  assert.equal(result.profiles[0]?.coverageState, "needs_review");
  assert.equal(result.deadlines.length, 1);
  assert.equal(result.deadlines[0]?.sourceType, "entered_deadline");
  assert.equal(result.deadlines[0]?.taxRuleId, null);
  assert.equal(result.deadlines[0]?.trustLabel, "Entered deadline - Not verified by DueDateHQ");
  assert.equal(result.deadlines[0]?.referenceLabel, "Reference");
  assert.equal(result.deadlines[0]?.referenceNote, "CPA provided from organizer notes.");
  assert.equal(result.deadlines[0]?.recurrenceLabel, "Recurring entered deadline");
});

test("deadlineTasks.requestVerification records a request without mutating the manual task", async () => {
  const writes: InsertWrite[] = [];
  const caller = createCaller({ selectQueue: [[makeDeadline()]], writes });

  const result = await caller.deadlineTasks.requestVerification({
    deadlineTaskId: "deadline-test",
    message: "Please verify Form 568.",
  });

  assert.equal(result.success, true);
  assert.equal(result.status, "open");

  const requestWrite = writes.find((write) => write.table === verificationRequests);
  const auditWrite = writes.find((write) => write.table === auditLogs);

  assert.equal(requestWrite?.row.requestType, "manual_deadline");
  assert.equal(requestWrite?.row.deadlineTaskId, "deadline-test");
  assert.equal(requestWrite?.row.status, "open");
  assert.equal(auditWrite?.row.action, "deadline_task.request_verification");
  assert.equal(
    (auditWrite?.row.metadata as Record<string, unknown>).originalTaskMutated,
    false,
  );
  assert.equal(writes.some((write) => write.table === deadlineTasks), false);
});

test("deadlineTasks.requestVerification rejects official system tasks", async () => {
  const writes: InsertWrite[] = [];
  const caller = createCaller({
    selectQueue: [
      [
        makeDeadline({
          sourceType: "verified_rule",
          createdVia: "system_rule",
          taxRuleId: "rule-test",
        }),
      ],
    ],
    writes,
  });

  await assert.rejects(
    () =>
      caller.deadlineTasks.requestVerification({
        deadlineTaskId: "deadline-test",
        message: "Please verify this task.",
      }),
    /Only entered deadlines/,
  );

  assert.equal(writes.length, 0);
});
