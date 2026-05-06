import assert from "node:assert/strict";
import test from "node:test";

import {
  officialNotices,
  officialSources,
  type OfficialNotice,
  type OfficialSource,
} from "@due-date-hq/db/schema/monitoring";
import type { NoticeImpactProposal } from "@due-date-hq/db/schema/notice-proposals";

import type { Context } from "../context";
import { appRouter } from "./index";

function createSelectChain(selectQueue: unknown[][]) {
  const chain = {
    from: (_table: unknown) => chain,
    innerJoin: (_table: unknown, _predicate: unknown) => chain,
    where: (_predicate: unknown) => chain,
    orderBy: async (..._columns: unknown[]) => selectQueue.shift() ?? [],
    limit: async (_count: number) => selectQueue.shift() ?? [],
  };

  return chain;
}

function createCaller(selectQueue: unknown[][]) {
  const now = new Date("2026-05-05T00:00:00.000Z");
  const firm = {
    id: "firm-test",
    name: "Test Firm",
    ownerUserId: "user-test",
    createdAt: now,
    updatedAt: now,
  };

  return appRouter.createCaller({
    auth: null as unknown as Context["auth"],
    db: {
      select: () => createSelectChain(selectQueue),
    } as unknown as Context["db"],
    firm,
    session: {
      user: {
        id: "user-test",
        email: "cpa@example.com",
        name: "Test CPA",
      },
      firm,
      session: {
        expiresAt: new Date("2026-12-31T00:00:00.000Z"),
      },
    } as unknown as NonNullable<Context["session"]>,
  });
}

function makeSource(): OfficialSource {
  const now = new Date("2026-05-05T00:00:00.000Z");

  return {
    id: "source-test",
    jurisdiction: "federal",
    agencyName: "IRS",
    sourceType: "html",
    sourceUrl: "https://www.irs.gov",
    allowlistLevel: "p0",
    deadlineScope: "Disaster relief",
    monitorFrequencyHours: 24,
    active: true,
    lastCheckedAt: now,
    lastChangedAt: now,
    lastStatus: "success",
    lastErrorMessage: null,
    createdAt: now,
    updatedAt: now,
  } satisfies typeof officialSources.$inferSelect;
}

function makeNotice(overrides: Partial<OfficialNotice> = {}): OfficialNotice {
  const now = new Date("2026-05-05T00:00:00.000Z");

  return {
    id: "notice-test",
    sourceId: "source-test",
    sourceSnapshotId: null,
    noticeUrl: "https://www.irs.gov/newsroom/tax-relief-in-disaster-situations",
    noticeTitle: "IRS disaster relief postpones affected filing deadlines",
    noticePublishedAt: now,
    noticeSummary: "Affected taxpayers receive postponed filing and payment deadlines.",
    jurisdiction: "federal",
    deadlineRelevance: "high",
    confidenceLabel: "high",
    confidenceReasons: ["P0 source"],
    impactConditions: [
      {
        jurisdiction: "federal",
        taxCategories: ["Income tax"],
        entityTypes: ["c_corp"],
        deadlineKinds: ["filing"],
        dateText: "October 15, 2026",
        affectedLocation: "Gulf Coast counties",
        summary: "Affected taxpayers",
      },
    ],
    workspaceMatchHints: {
      jurisdictions: ["federal"],
      entityTypes: ["c_corp"],
      taxCategories: ["Income tax"],
    },
    alertVisibility: "workspace_alert",
    detectedAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } satisfies typeof officialNotices.$inferSelect;
}

function makeProposal(overrides: Partial<NoticeImpactProposal> = {}): NoticeImpactProposal {
  const now = new Date("2026-05-05T00:00:00.000Z");

  return {
    id: "proposal-test",
    officialNoticeId: "notice-test",
    firmId: "firm-test",
    filingProfileId: "profile-test",
    deadlineTaskId: "task-test",
    proposalType: "task_update",
    beforeState: { currentDueDate: "2026-04-15" },
    afterState: { currentDueDate: "2026-10-15" },
    confidenceLabel: "high",
    confidenceReasons: ["P0 source"],
    status: "pending",
    decidedBy: null,
    decidedAt: null,
    auditLogId: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

test("notices.list keeps low-confidence notices out of CPA workspace alerts", async () => {
  const source = makeSource();
  const caller = createCaller([
    [
      {
        notice: makeNotice({ id: "notice-high", confidenceLabel: "high" }),
        source,
        proposal: makeProposal({ id: "proposal-high", officialNoticeId: "notice-high" }),
      },
      {
        notice: makeNotice({ id: "notice-low", confidenceLabel: "low" }),
        source,
        proposal: makeProposal({ id: "proposal-low", officialNoticeId: "notice-low" }),
      },
    ],
  ]);

  const result = await caller.notices.list({ limit: 10 });

  assert.deepEqual(
    result.notices.map((notice) => notice.id),
    ["notice-high"],
  );
});
