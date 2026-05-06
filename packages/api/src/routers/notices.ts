import { and, desc, eq, inArray } from "drizzle-orm";
import { noticeImpactProposals } from "@due-date-hq/db/schema/notice-proposals";
import {
  officialNotices,
  officialSources,
  type OfficialNotice,
  type OfficialSource,
} from "@due-date-hq/db/schema/monitoring";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { requireFirmSession, type Context } from "../context";
import { publicProcedure, router } from "../index";
import { serializeNoticeProposal, type NoticeProposalResponse } from "./noticeProposals";

export type NoticeAlertSummary = {
  id: string;
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  noticeUrl: string;
  noticeTitle: string;
  noticePublishedAt: string | null;
  noticeSummary: string;
  jurisdiction: string;
  deadlineRelevance: OfficialNotice["deadlineRelevance"];
  confidenceLabel: OfficialNotice["confidenceLabel"];
  confidenceReasons: string[];
  impactConditions: OfficialNotice["impactConditions"];
  detectedAt: string;
  affectedCount: number;
  pendingCount: number;
  decideLaterCount: number;
};

export type NoticeDetailResponse = NoticeAlertSummary & {
  proposals: NoticeProposalResponse[];
};

type NoticeSummaryRow = {
  notice: OfficialNotice;
  source: OfficialSource;
  proposal: typeof noticeImpactProposals.$inferSelect;
};

const noticeIdInput = z.object({
  noticeId: z.string().trim().min(1),
});

export const noticesRouter = router({
  list: publicProcedure
    .input(
      z
        .object({
          includeDecideLater: z.boolean().default(true),
          limit: z.number().int().min(1).max(25).default(5),
        })
        .optional(),
    )
    .query(async ({ ctx, input }): Promise<{ notices: NoticeAlertSummary[] }> => {
      const notices = await loadNoticeSummaries(ctx, {
        includeDecideLater: input?.includeDecideLater ?? true,
        limit: input?.limit ?? 5,
      });

      return { notices };
    }),

  get: publicProcedure
    .input(noticeIdInput)
    .query(async ({ ctx, input }): Promise<NoticeDetailResponse> => {
      const session = requireFirmSession(ctx);
      const rows = await ctx.db
        .select({
          notice: officialNotices,
          source: officialSources,
          proposal: noticeImpactProposals,
        })
        .from(noticeImpactProposals)
        .innerJoin(officialNotices, eq(noticeImpactProposals.officialNoticeId, officialNotices.id))
        .innerJoin(officialSources, eq(officialNotices.sourceId, officialSources.id))
        .where(
          and(
            eq(noticeImpactProposals.firmId, session.firm.id),
            eq(officialNotices.id, input.noticeId),
            eq(officialNotices.alertVisibility, "workspace_alert"),
            inArray(officialNotices.confidenceLabel, ["high", "medium"]),
          ),
        )
        .orderBy(desc(noticeImpactProposals.createdAt));

      if (!rows.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Notice was not found.",
        });
      }

      const summary = summarizeNoticeRows(rows)[0];

      if (!summary || summary.confidenceLabel === "low") {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Notice was not found.",
        });
      }

      return {
        ...summary,
        proposals: rows.map((row) => serializeNoticeProposal(row.proposal)),
      };
    }),
});

async function loadNoticeSummaries(
  ctx: Context,
  {
    includeDecideLater,
    limit,
  }: {
    includeDecideLater: boolean;
    limit: number;
  },
): Promise<NoticeAlertSummary[]> {
  const session = requireFirmSession(ctx);
  const statuses = includeDecideLater ? ["pending", "decide_later"] as const : ["pending"] as const;
  const rows = await ctx.db
    .select({
      notice: officialNotices,
      source: officialSources,
      proposal: noticeImpactProposals,
    })
    .from(noticeImpactProposals)
    .innerJoin(officialNotices, eq(noticeImpactProposals.officialNoticeId, officialNotices.id))
    .innerJoin(officialSources, eq(officialNotices.sourceId, officialSources.id))
    .where(
      and(
        eq(noticeImpactProposals.firmId, session.firm.id),
        eq(officialNotices.alertVisibility, "workspace_alert"),
        inArray(officialNotices.confidenceLabel, ["high", "medium"]),
        inArray(noticeImpactProposals.status, statuses),
      ),
    )
    .orderBy(desc(officialNotices.detectedAt));

  return summarizeNoticeRows(rows)
    .filter((notice) => notice.confidenceLabel !== "low")
    .filter((notice) => notice.pendingCount > 0 || includeDecideLater)
    .sort(compareNoticeSummaries)
    .slice(0, limit);
}

function summarizeNoticeRows(rows: NoticeSummaryRow[]): NoticeAlertSummary[] {
  const grouped = new Map<string, NoticeSummaryRow[]>();

  for (const row of rows) {
    const group = grouped.get(row.notice.id);
    if (group) {
      group.push(row);
    } else {
      grouped.set(row.notice.id, [row]);
    }
  }

  return [...grouped.values()].map((group) => {
    const first = group[0]!;

    return {
      id: first.notice.id,
      sourceId: first.notice.sourceId,
      sourceName: first.source.agencyName,
      sourceUrl: first.source.sourceUrl,
      noticeUrl: first.notice.noticeUrl,
      noticeTitle: first.notice.noticeTitle,
      noticePublishedAt: first.notice.noticePublishedAt?.toISOString() ?? null,
      noticeSummary: first.notice.noticeSummary,
      jurisdiction: first.notice.jurisdiction,
      deadlineRelevance: first.notice.deadlineRelevance,
      confidenceLabel: first.notice.confidenceLabel,
      confidenceReasons: first.notice.confidenceReasons,
      impactConditions: first.notice.impactConditions,
      detectedAt: first.notice.detectedAt.toISOString(),
      affectedCount: group.length,
      pendingCount: group.filter((row) => row.proposal.status === "pending").length,
      decideLaterCount: group.filter((row) => row.proposal.status === "decide_later").length,
    };
  });
}

function confidenceRank(label: OfficialNotice["confidenceLabel"]): number {
  switch (label) {
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
  }
}

function compareNoticeSummaries(a: NoticeAlertSummary, b: NoticeAlertSummary): number {
  return (
    b.pendingCount - a.pendingCount ||
    confidenceRank(b.confidenceLabel) - confidenceRank(a.confidenceLabel) ||
    b.detectedAt.localeCompare(a.detectedAt)
  );
}
