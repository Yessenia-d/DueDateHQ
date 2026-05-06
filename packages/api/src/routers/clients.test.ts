import assert from "node:assert/strict";
import test from "node:test";

import {
  type ClientRelationship,
  type DeadlineTask,
  type FilingProfile,
} from "@due-date-hq/db/schema/deadline-domain";

import type { Context } from "../context";
import { appRouter } from "./index";

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

function createMockDb(selectQueue: unknown[][]) {
  return {
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

function createCaller(selectQueue: unknown[][]) {
  return appRouter.createCaller({
    auth: null as unknown as Context["auth"],
    db: createMockDb(selectQueue),
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
    sourceClientId: null,
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

function makeDeadline(overrides: Partial<DeadlineTask> = {}): DeadlineTask {
  const now = new Date("2026-05-05T00:00:00.000Z");

  return {
    id: "deadline-test",
    firmId: "firm-test",
    clientRelationshipId: "client-test",
    filingProfileId: "profile-test",
    taxRuleId: "rule-test",
    title: "Form 568 Filing",
    jurisdiction: "CA",
    taxCategory: "Franchise tax",
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

test("clients.getYearCalendar returns selected-year deadlines grouped by month with trust state", async () => {
  const caller = createCaller([
    [makeClient()],
    [
      makeProfile({ id: "profile-a", displayName: "Acme federal profile" }),
      makeProfile({ id: "profile-b", displayName: "Acme CA profile" }),
    ],
    [
      { currentDueDate: "2025-04-15" },
      { currentDueDate: "2026-01-15" },
      { currentDueDate: "2027-04-15" },
    ],
    [
      makeDeadline({
        id: "deadline-entered",
        filingProfileId: "profile-b",
        title: "CA estimate",
        currentDueDate: "2026-01-15",
        originalDueDate: null,
        firmTargetDate: "2026-01-10",
        taxRuleId: null,
        sourceType: "entered_deadline",
        createdVia: "manual",
        enteredDeadlineReferenceNote: "CPA calendar note.",
      }),
      makeDeadline({
        id: "deadline-official",
        filingProfileId: "profile-a",
        title: "Form 568 Filing",
        currentDueDate: "2026-04-15",
      }),
    ],
  ]);

  const result = await caller.clients.getYearCalendar({
    clientId: "client-test",
    year: 2026,
  });

  assert.equal(result.client.id, "client-test");
  assert.equal(result.year, 2026);
  assert.equal(result.months.length, 12);
  assert.deepEqual(result.availableYears, [2025, 2026, 2027]);
  assert.equal(result.deadlines.length, 2);
  assert.deepEqual(
    result.deadlines.map((deadline) => deadline.id),
    ["deadline-entered", "deadline-official"],
  );

  const january = result.months[0];
  const april = result.months[3];

  assert.equal(january?.count, 1);
  assert.equal(april?.count, 1);
  assert.equal(january?.deadlines[0]?.month, 1);
  assert.equal(january?.deadlines[0]?.day, 15);
  assert.equal(january?.deadlines[0]?.profileDisplayName, "Acme CA profile");
  assert.equal(january?.deadlines[0]?.isOfficial, false);
  assert.equal(january?.deadlines[0]?.trustLabel, "Entered deadline - Not verified by DueDateHQ");
  assert.equal(january?.deadlines[0]?.referenceNote, "CPA calendar note.");
  assert.equal(january?.deadlines[0]?.firmTargetDate, "2026-01-10");
  assert.equal(april?.deadlines[0]?.isOfficial, true);
});
