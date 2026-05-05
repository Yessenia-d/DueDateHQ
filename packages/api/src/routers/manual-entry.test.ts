import assert from "node:assert/strict";
import test from "node:test";

import { auditLogs } from "@due-date-hq/db/schema/audit";
import {
  clientRelationships,
  deadlineDateEvents,
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
  writes = [],
}: {
  selectQueue?: unknown[][];
  writes?: InsertWrite[];
} = {}) {
  return {
    insert: (table: unknown) => createReturningInsert(writes, table),
    select: () => createSelectChain(selectQueue),
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
  writes,
}: {
  selectQueue?: unknown[][];
  writes?: InsertWrite[];
} = {}) {
  return appRouter.createCaller({
    auth: null as unknown as Context["auth"],
    db: createMockDb({ selectQueue, writes }),
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
    sourceType: "user_provided",
    createdVia: "manual",
    userProvidedSourceNote: "CPA provided from organizer notes.",
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

test("deadlineTasks.createManual keeps manual deadlines user-provided and not verified", async () => {
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
    sourceNote: "CPA provided from organizer notes.",
  });

  assert.equal(result.deadline.sourceType, "user_provided");
  assert.equal(result.deadline.createdVia, "manual");
  assert.equal(result.deadline.taxRuleId, null);
  assert.equal(result.deadline.originalDueDate, null);
  assert.equal(result.deadline.firmTargetDate, "2026-04-01");
  assert.equal(result.deadline.trustLabel, "User provided - Not verified by DueDateHQ");
  assert.equal(result.deadline.recurrenceLabel, "Recurring user-provided deadline");

  const deadlineWrite = writes.find((write) => write.table === deadlineTasks);
  const auditWrite = writes.find((write) => write.table === auditLogs);
  const dateEventWrite = writes.find((write) => write.table === deadlineDateEvents);

  assert.equal(deadlineWrite?.row.sourceType, "user_provided");
  assert.equal(deadlineWrite?.row.createdVia, "manual");
  assert.equal(deadlineWrite?.row.taxRuleId, null);
  assert.equal(auditWrite?.row.action, "deadline_task.create_manual");
  assert.equal(dateEventWrite?.row.eventType, "firm_target_change");
  assert.equal(dateEventWrite?.row.newFirmTargetDate, "2026-04-01");
});

test("clients.get returns manual profiles and user-provided deadline trust state", async () => {
  const caller = createCaller({
    selectQueue: [[makeClient()], [makeProfile()], [makeDeadline()]],
  });

  const result = await caller.clients.get({ clientId: "client-test" });

  assert.equal(result.client.id, "client-test");
  assert.equal(result.profiles.length, 1);
  assert.equal(result.profiles[0]?.displayName, "Acme federal profile");
  assert.equal(result.profiles[0]?.coverageState, "needs_review");
  assert.equal(result.deadlines.length, 1);
  assert.equal(result.deadlines[0]?.sourceType, "user_provided");
  assert.equal(result.deadlines[0]?.taxRuleId, null);
  assert.equal(result.deadlines[0]?.trustLabel, "User provided - Not verified by DueDateHQ");
  assert.equal(result.deadlines[0]?.recurrenceLabel, "Recurring user-provided deadline");
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
    /Only user-provided manual deadlines/,
  );

  assert.equal(writes.length, 0);
});
