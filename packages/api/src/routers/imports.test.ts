import assert from "node:assert/strict";
import test from "node:test";

import { auditLogs } from "@due-date-hq/db/schema/audit";
import {
  clientRelationships,
  deadlineDateEvents,
  deadlineTasks,
  filingProfiles,
} from "@due-date-hq/db/schema/deadline-domain";
import {
  duplicateCandidates,
  importBatches,
  importReviewItems,
  relationshipSuggestions,
  type DuplicateCandidate,
  type ImportBatch,
  type ImportReviewItem,
  type RelationshipSuggestion,
} from "@due-date-hq/db/schema/imports";

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
    values: (rows: Record<string, unknown> | Array<Record<string, unknown>>) => {
      const normalizedRows = Array.isArray(rows) ? rows : [rows];
      for (const row of normalizedRows) {
        rowSink.push({ table, row });
      }

      return {
        returning: async () => normalizedRows,
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
  updates = [],
  writes = [],
}: {
  selectQueue?: unknown[][];
  updates?: UpdateWrite[];
  writes?: InsertWrite[];
} = {}) {
  return {
    insert: (table: unknown) => createReturningInsert(writes, table),
    select: () => createSelectChain(selectQueue),
    update: (table: unknown) => ({
      set: (values: Record<string, unknown>) => ({
        where: (_predicate: unknown) => ({
          returning: async () => {
            updates.push({ table, values });
            return [values];
          },
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
  selectQueue,
  updates,
  writes,
}: {
  selectQueue?: unknown[][];
  updates?: UpdateWrite[];
  writes?: InsertWrite[];
} = {}) {
  return appRouter.createCaller({
    auth: null as unknown as Context["auth"],
    db: createMockDb({ selectQueue, updates, writes }),
    firm: mockSession.firm,
    session: mockSession,
  });
}

const now = new Date("2026-05-05T00:00:00.000Z");

function makeBatch(overrides: Partial<ImportBatch> = {}): ImportBatch {
  return {
    id: "batch-test",
    firmId: "firm-test",
    sourceSystem: "taxdome",
    status: "previewed",
    adapterProfile: "taxdome_accounts_v1",
    adapterVersion: "2026.05.csv-import-v1",
    totalRows: 1,
    acceptedRows: 1,
    reviewRows: 0,
    duplicateRows: 0,
    headerDetected: true,
    mappingConfidence: 100,
    columnMapping: [],
    recognizedFields: [],
    unmappedColumns: [],
    validationMessages: [],
    createdAt: now,
    committedAt: null,
    ...overrides,
  };
}

function makeReviewItem(overrides: Partial<ImportReviewItem> = {}): ImportReviewItem {
  return {
    id: "review-test",
    firmId: "firm-test",
    batchId: "batch-test",
    sourceRowId: "taxdome-row-1",
    rowIndex: 1,
    status: "accepted",
    problemTypes: [],
    canonicalProfile: {
      clientName: "Acme Advisors LLC",
      ein: "123456789",
      ssnLast4: null,
      state: "CA",
      states: ["CA"],
      entityType: "c_corp",
      county: null,
      fiscalYearType: "calendar_year",
      sourceSystem: "taxdome",
      sourceRowId: "taxdome-row-1",
    },
    sourceFields: {},
    messages: [],
    createdAt: now,
    ...overrides,
  };
}

function makeRelationshipSuggestion(
  overrides: Partial<RelationshipSuggestion> = {},
): RelationshipSuggestion {
  return {
    id: "suggestion-test",
    firmId: "firm-test",
    batchId: "batch-test",
    incomingReviewItemId: "review-test",
    suggestedClientRelationshipId: null,
    reason: "Source export linked this profile to another client relationship.",
    suggestedAction: "confirm_relationship",
    status: "pending",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeDuplicateCandidate(overrides: Partial<DuplicateCandidate> = {}): DuplicateCandidate {
  return {
    id: "duplicate-test",
    firmId: "firm-test",
    batchId: "batch-test",
    incomingReviewItemId: "review-test",
    existingClientRelationshipId: "client-existing",
    matchedFields: ["client_name"],
    differingFields: {},
    suggestedAction: "update_existing",
    resolution: "pending",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

test("imports.preview stores auditable mapping and review metadata without raw CSV", async () => {
  const writes: InsertWrite[] = [];
  const caller = createCaller({ selectQueue: [[], []], writes });

  const result = await caller.imports.preview({
    sourceSystem: "taxdome",
    csvText: [
      "Account Name,Entity Type,State,EIN,Linked Contacts,Custom Field",
      "Acme Advisors LLC,S Corporation,CA,12-3456789,Jane Owner,Value",
    ].join("\n"),
  });

  assert.equal(result.sourceSystem, "taxdome");
  assert.equal(result.detectedSourceProfile, "taxdome_accounts_v1");
  assert.equal(result.headerDetection.headerDetected, true);
  assert.equal(result.summary.totalRows, 1);
  assert.equal(result.summary.readyProfiles, 0);
  assert.equal(result.summary.reviewProfiles, 1);
  assert.equal(result.relationshipSuggestions.length, 1);
  assert.ok(result.reviewGroups.some((group) => group.problemType === "relationship_suggestion"));

  const batchWrite = writes.find((write) => write.table === importBatches);
  const itemWrite = writes.find((write) => write.table === importReviewItems);
  const suggestionWrite = writes.find((write) => write.table === relationshipSuggestions);

  assert.ok(batchWrite);
  assert.ok(itemWrite);
  assert.ok(suggestionWrite);
  assert.equal("rawCsv" in batchWrite.row, false);
  assert.equal("csvText" in batchWrite.row, false);
});

test("imports.commit creates client relationships, filing profiles, and verified-rule tasks only", async () => {
  const writes: InsertWrite[] = [];
  const updates: UpdateWrite[] = [];
  const caller = createCaller({
    selectQueue: [[makeBatch()], [makeReviewItem()], [], [], []],
    updates,
    writes,
  });

  const result = await caller.imports.commit({ batchId: "batch-test" });

  assert.equal(result.readyProfileCount, 1);
  assert.equal(result.createdClientRelationshipCount, 1);
  assert.equal(result.createdFilingProfileCount, 1);
  assert.ok(result.createdVerifiedTaskCount > 0);
  assert.equal(result.profileReviewItemCount, 0);
  assert.match(result.summary, /1 filing profile/);
  assert.match(result.summary, /verified deadline tasks/);

  const clientWrites = writes.filter((write) => write.table === clientRelationships);
  const profileWrites = writes.filter((write) => write.table === filingProfiles);
  const taskWrites = writes.filter((write) => write.table === deadlineTasks);
  const dateEventWrites = writes.filter((write) => write.table === deadlineDateEvents);
  const auditWrites = writes.filter((write) => write.table === auditLogs);

  assert.equal(clientWrites.length, 1);
  assert.equal(profileWrites.length, 1);
  assert.equal(taskWrites.length, result.createdVerifiedTaskCount);
  assert.equal(dateEventWrites.length, result.createdVerifiedTaskCount);
  assert.equal(auditWrites.length, 1);
  assert.equal(taskWrites.every((write) => write.row.sourceType === "verified_rule"), true);
  assert.equal(taskWrites.every((write) => write.row.createdVia === "system_rule"), true);
  assert.equal(taskWrites.every((write) => typeof write.row.taxRuleId === "string"), true);
  assert.equal(
    dateEventWrites.every((write) => write.row.eventType === "official_original_due_date"),
    true,
  );
  assert.ok(updates.some((update) => update.table === importBatches));
  assert.ok(updates.some((update) => update.table === importReviewItems));
});

test("imports.commit rejects unresolved relationship suggestions before finalizing the batch", async () => {
  const writes: InsertWrite[] = [];
  const updates: UpdateWrite[] = [];
  const caller = createCaller({
    selectQueue: [[makeBatch()], [makeReviewItem()], [], [makeRelationshipSuggestion()], []],
    updates,
    writes,
  });

  await assert.rejects(
    caller.imports.commit({ batchId: "batch-test" }),
    /Resolve every duplicate candidate and relationship suggestion/,
  );

  assert.equal(writes.some((write) => write.table === clientRelationships), false);
  assert.equal(updates.some((update) => update.table === importBatches), false);
});

test("imports.commit rejects unresolved duplicate candidates before finalizing the batch", async () => {
  const writes: InsertWrite[] = [];
  const updates: UpdateWrite[] = [];
  const caller = createCaller({
    selectQueue: [[makeBatch()], [makeReviewItem()], [makeDuplicateCandidate()], [], []],
    updates,
    writes,
  });

  await assert.rejects(
    caller.imports.commit({ batchId: "batch-test" }),
    /Resolve every duplicate candidate and relationship suggestion/,
  );

  assert.equal(writes.some((write) => write.table === clientRelationships), false);
  assert.equal(updates.some((update) => update.table === importBatches), false);
  assert.equal(updates.some((update) => update.table === duplicateCandidates), false);
});

test("imports.commit applies full state name corrections before creating filing profiles", async () => {
  const writes: InsertWrite[] = [];
  const caller = createCaller({
    selectQueue: [[makeBatch()], [makeReviewItem()], [], [], []],
    writes,
  });

  await caller.imports.commit({
    batchId: "batch-test",
    rowCorrections: [
      {
        reviewItemId: "review-test",
        profile: {
          state: "New Jersey",
        },
      },
    ],
  });

  const profileWrite = writes.find((write) => write.table === filingProfiles);

  assert.ok(profileWrite);
  assert.deepEqual(profileWrite.row.states, ["NJ"]);
});
