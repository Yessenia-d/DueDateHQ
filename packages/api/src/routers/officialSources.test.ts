import assert from "node:assert/strict";
import test from "node:test";

import type { Context } from "../context";
import { requireOfficialSourceMonitorToken } from "./officialSources";
import { appRouter } from "./index";

type MockDbState = {
  selectRows?: unknown[];
  writtenSources?: unknown[];
};

function createMockDb({ selectRows = [], writtenSources = [] }: MockDbState = {}) {
  return {
    select: () => ({
      from: async (_table: unknown) => selectRows,
    }),
    insert: (_table: unknown) => ({
      values: (row: unknown) => {
        writtenSources.push(row);

        return {
          onConflictDoUpdate: async (_config: unknown) => undefined,
        };
      },
    }),
  } as unknown as Context["db"];
}

const firmSession = {
  firm: {
    id: "firm-1",
    name: "North Star CPA",
    ownerUserId: "user-1",
    createdAt: new Date("2026-05-05T00:00:00.000Z"),
    updatedAt: new Date("2026-05-05T00:00:00.000Z"),
  },
  session: {
    id: "session-1",
    token: "token-1",
    userId: "user-1",
    expiresAt: new Date("2026-06-05T00:00:00.000Z"),
    ipAddress: null,
    userAgent: null,
    createdAt: new Date("2026-05-05T00:00:00.000Z"),
    updatedAt: new Date("2026-05-05T00:00:00.000Z"),
  },
  user: {
    id: "user-1",
    email: "cpa@example.com",
    emailVerified: false,
    name: "Casey CPA",
    createdAt: new Date("2026-05-05T00:00:00.000Z"),
    updatedAt: new Date("2026-05-05T00:00:00.000Z"),
    image: null,
  },
} satisfies NonNullable<Context["session"]>;

function createCaller({
  selectRows = [],
  session = null,
  writtenSources = [],
}: MockDbState & { session?: Context["session"] } = {}) {
  return appRouter.createCaller({
    auth: null as unknown as Context["auth"],
    db: createMockDb({ selectRows, writtenSources }),
    firm: session?.firm ?? null,
    session,
  });
}

test("officialSources.list returns explicit P0 official source allowlist", async () => {
  const caller = createCaller();
  const result = await caller.officialSources.list();

  assert.equal(result.sources.length, 5);
  assert.ok(result.sources.some((source) => source.jurisdiction === "federal"));
  assert.ok(result.sources.some((source) => source.jurisdiction === "CA"));
  assert.ok(result.sources.some((source) => source.jurisdiction === "NY"));
  assert.ok(result.sources.some((source) => source.jurisdiction === "TX"));
  assert.ok(result.sources.some((source) => source.jurisdiction === "FL"));
  assert.equal(result.sources.every((source) => source.monitorStatus === "not_checked"), true);
});

test("officialSources.list exposes persisted active state", async () => {
  const caller = createCaller({
    selectRows: [
      {
        id: "irs-federal-deadlines-relief",
        active: false,
        lastCheckedAt: new Date("2026-05-05T10:00:00.000Z"),
        lastChangedAt: new Date("2026-05-05T10:05:00.000Z"),
        lastStatus: "failed",
        lastErrorMessage: "Fetch failed",
      },
    ],
  });

  const result = await caller.officialSources.list();
  const irs = result.sources.find((source) => source.id === "irs-federal-deadlines-relief");

  assert.ok(irs);
  assert.equal(irs.active, false);
  assert.equal(irs.monitorStatus, "failed");
  assert.equal(irs.lastErrorMessage, "Fetch failed");
});

test("officialSources.enqueueCheck accepts only allowlisted sources", async () => {
  const caller = createCaller({ session: firmSession });

  const accepted = await caller.officialSources.enqueueCheck({
    sourceId: "irs-federal-deadlines-relief",
  });

  assert.equal(accepted.accepted, true);
  assert.equal(accepted.queued, false);

  await assert.rejects(
    () => caller.officialSources.enqueueCheck({ sourceId: "unsupported" }),
    /Official source is not in the supported allowlist/,
  );
});

test("officialSources.enqueueCheck rejects inactive sources", async () => {
  const caller = createCaller({
    selectRows: [{ id: "irs-federal-deadlines-relief", active: false }],
    session: firmSession,
  });

  await assert.rejects(
    () =>
      caller.officialSources.enqueueCheck({
        sourceId: "irs-federal-deadlines-relief",
      }),
    /inactive/,
  );
});

test("officialSources.enqueueCheck requires a firm session", async () => {
  const caller = createCaller();

  await assert.rejects(
    () =>
      caller.officialSources.enqueueCheck({
        sourceId: "irs-federal-deadlines-relief",
      }),
    /Sign in/,
  );
});

test("officialSources.setActive persists monitor active state", async () => {
  const writtenSources: unknown[] = [];
  const caller = createCaller({ session: firmSession, writtenSources });

  const result = await caller.officialSources.setActive({
    sourceId: "irs-federal-deadlines-relief",
    active: false,
  });

  assert.equal(result.active, false);
  assert.equal(writtenSources.length, 1);
  assert.equal(
    (writtenSources[0] as { id: string; active: boolean }).id,
    "irs-federal-deadlines-relief",
  );
  assert.equal((writtenSources[0] as { active: boolean }).active, false);
});

test("requireOfficialSourceMonitorToken enforces platform monitor token", () => {
  assert.doesNotThrow(() =>
    requireOfficialSourceMonitorToken({
      officialSourceMonitorRequestToken: " secret ",
      officialSourceMonitorToken: "secret",
    }),
  );
  assert.throws(
    () =>
      requireOfficialSourceMonitorToken({
        officialSourceMonitorRequestToken: "secret",
        officialSourceMonitorToken: null,
      }),
    /not configured/,
  );
  assert.throws(
    () =>
      requireOfficialSourceMonitorToken({
        officialSourceMonitorRequestToken: "wrong",
        officialSourceMonitorToken: "secret",
      }),
    /invalid/,
  );
});
