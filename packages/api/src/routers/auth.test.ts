import assert from "node:assert/strict";
import test from "node:test";

import type { Context } from "../context";
import { appRouter } from "./index";

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

test("auth.session returns the firm-scoped Better Auth session", async () => {
  const caller = appRouter.createCaller({
    auth: {} as Context["auth"],
    firm: firmSession.firm,
    session: firmSession,
  });

  const result = await caller.auth.session();

  assert.equal(result?.user.email, "cpa@example.com");
  assert.equal(result?.firm.name, "North Star CPA");
  assert.equal(result?.firm.ownerUserId, "user-1");
});

test("auth.workspace rejects unauthenticated business access", async () => {
  const caller = appRouter.createCaller({
    auth: {} as Context["auth"],
    firm: null,
    session: null,
  });

  await assert.rejects(() => caller.auth.workspace(), /Sign in/);
});
