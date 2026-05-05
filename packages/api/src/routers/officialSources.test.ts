import assert from "node:assert/strict";
import test from "node:test";

import type { Context } from "../context";
import { requireOfficialSourceMonitorToken } from "./officialSources";
import { appRouter } from "./index";

function createMockDb(selectRows: unknown[] = []) {
  return {
    select: () => ({
      from: async (_table: unknown) => selectRows,
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

function createCaller(selectRows: unknown[] = [], session: Context["session"] = null) {
  return appRouter.createCaller({
    auth: null as unknown as Context["auth"],
    db: createMockDb(selectRows),
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

test("officialSources.enqueueCheck accepts only allowlisted sources", async () => {
  const caller = createCaller([], firmSession);

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
