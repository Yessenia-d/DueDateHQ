import assert from "node:assert/strict";
import test from "node:test";

import type { Context } from "../context";
import { appRouter } from "./index";

test("officialNotices.listInternal rejects unauthenticated callers", async () => {
  const caller = appRouter.createCaller({
    auth: null as unknown as Context["auth"],
    db: {} as Context["db"],
    firm: null,
    session: null,
  });

  await assert.rejects(() => caller.officialNotices.listInternal(), /Sign in/);
});
