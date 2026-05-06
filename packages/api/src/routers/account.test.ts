import assert from "node:assert/strict";
import test from "node:test";

import type { Context } from "../context";
import { appRouter } from "./index";
import { createAchievementMetrics, getInclusiveUsageDay } from "./account";

const firm = {
  id: "firm-1",
  name: "North Star CPA",
  createdAt: new Date("2026-05-01T15:30:00.000Z"),
};

function createSelectChain(selectQueue: unknown[][]) {
  const chain = {
    from: (_table: unknown) => chain,
    innerJoin: (_table: unknown, _predicate: unknown) => chain,
    where: async (_predicate: unknown) => selectQueue.shift() ?? [],
  };

  return chain;
}

function createMockDb(selectQueue: unknown[][]) {
  return {
    select: () => createSelectChain(selectQueue),
  } as unknown as Context["db"];
}

function createUpdateDb(updateLog: unknown[]) {
  return {
    update: (_table: unknown) => ({
      set: (values: unknown) => ({
        where: async (_predicate: unknown) => {
          updateLog.push(values);
          return [];
        },
      }),
    }),
  } as unknown as Context["db"];
}

const mockSession = {
  user: {
    id: "user-1",
    email: "cpa@example.com",
    name: "Casey CPA",
  },
  firm: {
    ...firm,
    ownerUserId: "user-1",
    updatedAt: new Date("2026-05-01T15:30:00.000Z"),
  },
  session: {
    expiresAt: new Date("2026-06-01T00:00:00.000Z"),
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

function createUpdateCaller(updateLog: unknown[]) {
  return appRouter.createCaller({
    auth: null as unknown as Context["auth"],
    db: createUpdateDb(updateLog),
    firm: mockSession.firm,
    session: mockSession,
  });
}

test("achievement metrics use the firm creation date as inclusive day one", () => {
  const result = createAchievementMetrics({
    firm,
    tasks: [
      {
        entityType: "individual",
        jurisdiction: "federal",
        states: ["CA"],
        status: "done",
        taxCategory: "Income tax",
      },
      {
        entityType: "s_corp",
        jurisdiction: "NY",
        states: ["NY", "NJ"],
        status: "done",
        taxCategory: "Franchise tax",
      },
      {
        entityType: "llc",
        jurisdiction: "TX",
        states: ["TX"],
        status: "waiting_on_client",
        taxCategory: "Sales tax",
      },
      {
        entityType: "partnership",
        jurisdiction: "federal",
        states: ["CA"],
        status: "not_started",
        taxCategory: "Income tax",
      },
    ],
    today: new Date("2026-05-06T10:00:00.000Z"),
    totalClientRelationships: 3,
  });

  assert.equal(result.workspace.usageStartDate, "2026-05-01");
  assert.equal(result.metrics.totalUsageDays, 6);
  assert.equal(result.metrics.currentUsageDay, 6);
  assert.equal(result.metrics.totalClientRelationships, 3);
  assert.equal(result.metrics.totalDeadlineTasks, 4);
  assert.equal(result.metrics.completedDeadlineTasks, 2);
  assert.equal(result.metrics.remainingDeadlineTasks, 2);
  assert.equal(result.metrics.averageCompletedTasksPerDay, 0.3);
  assert.equal(result.metrics.handledStateCount, 4);
  assert.equal(result.metrics.handledTaxCategoryCount, 2);
  assert.equal(result.metrics.handledEntityTypeCount, 2);
  assert.deepEqual(result.completedWork.states, [
    { label: "CA", count: 1, percent: 25 },
    { label: "Federal", count: 1, percent: 25 },
    { label: "NJ", count: 1, percent: 25 },
    { label: "NY", count: 1, percent: 25 },
  ]);
  assert.deepEqual(result.completedWork.taxCategories, [
    { label: "Franchise tax", count: 1, percent: 50 },
    { label: "Income tax", count: 1, percent: 50 },
  ]);
  assert.deepEqual(result.completedWork.entityTypes, [
    { label: "individual", count: 1, percent: 50 },
    { label: "s_corp", count: 1, percent: 50 },
  ]);
});

test("account.updateAvatar stores the signed-in user avatar URL", async () => {
  const updates: unknown[] = [];
  const caller = createUpdateCaller(updates);

  const result = await caller.account.updateAvatar({
    image: "https://example.com/casey.png",
  });

  assert.equal(result.image, "https://example.com/casey.png");
  assert.equal(updates.length, 1);
  assert.equal((updates[0] as { image: string }).image, "https://example.com/casey.png");
  assert.ok((updates[0] as { updatedAt: Date }).updatedAt instanceof Date);
});

test("achievement metrics report first-day usage as day one", () => {
  assert.equal(
    getInclusiveUsageDay(
      new Date("2026-05-06T23:00:00.000Z"),
      new Date("2026-05-06T00:30:00.000Z"),
    ),
    1,
  );
});

test("achievement metrics handle zero tasks without a misleading average", () => {
  const result = createAchievementMetrics({
    firm,
    tasks: [],
    today: new Date("2026-05-06T10:00:00.000Z"),
    totalClientRelationships: 0,
  });

  assert.equal(result.metrics.totalDeadlineTasks, 0);
  assert.equal(result.metrics.completedDeadlineTasks, 0);
  assert.equal(result.metrics.remainingDeadlineTasks, 0);
  assert.equal(result.metrics.averageCompletedTasksPerDay, 0);
  assert.equal(result.metrics.handledStateCount, 0);
  assert.equal(result.metrics.handledTaxCategoryCount, 0);
  assert.equal(result.metrics.handledEntityTypeCount, 0);
  assert.deepEqual(result.completedWork.states, []);
  assert.deepEqual(result.completedWork.taxCategories, []);
  assert.deepEqual(result.completedWork.entityTypes, []);
});

test("account.achievements returns firm workspace counts and completed-work breakdowns", async () => {
  const caller = createCaller([
    [{ id: "client-a" }, { id: "client-b" }],
    [
      {
        entityType: "individual",
        jurisdiction: "federal",
        states: ["CA"],
        status: "done",
        taxCategory: "Income tax",
      },
      {
        entityType: "llc",
        jurisdiction: "TX",
        states: ["TX"],
        status: "done",
        taxCategory: "Sales tax",
      },
      {
        entityType: "s_corp",
        jurisdiction: "CA",
        states: ["CA"],
        status: "waiting_on_client",
        taxCategory: "Franchise tax",
      },
    ],
  ]);

  const result = await caller.account.achievements();

  assert.equal(result.workspace.id, "firm-1");
  assert.equal(result.metrics.totalClientRelationships, 2);
  assert.equal(result.metrics.totalDeadlineTasks, 3);
  assert.equal(result.metrics.completedDeadlineTasks, 2);
  assert.equal(result.metrics.remainingDeadlineTasks, 1);
  assert.deepEqual(result.completedWork.states, [
    { label: "CA", count: 1, percent: 33 },
    { label: "Federal", count: 1, percent: 33 },
    { label: "TX", count: 1, percent: 33 },
  ]);
  assert.deepEqual(result.completedWork.taxCategories, [
    { label: "Income tax", count: 1, percent: 50 },
    { label: "Sales tax", count: 1, percent: 50 },
  ]);
  assert.deepEqual(result.completedWork.entityTypes, [
    { label: "individual", count: 1, percent: 50 },
    { label: "llc", count: 1, percent: 50 },
  ]);
});
