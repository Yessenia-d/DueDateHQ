import { desc, eq } from "drizzle-orm";
import { officialNotices, type OfficialNotice } from "@due-date-hq/db/schema/monitoring";
import { z } from "zod";

import { requireFirmSession } from "../context";
import { publicProcedure, router } from "../index";

export type OfficialNoticeInternalResponse = {
  id: string;
  sourceId: string;
  noticeUrl: string;
  noticeTitle: string;
  noticePublishedAt: string | null;
  noticeSummary: string;
  jurisdiction: string;
  deadlineRelevance: OfficialNotice["deadlineRelevance"];
  confidenceLabel: OfficialNotice["confidenceLabel"];
  confidenceReasons: string[];
  impactConditions: OfficialNotice["impactConditions"];
  workspaceMatchHints: OfficialNotice["workspaceMatchHints"];
  alertVisibility: OfficialNotice["alertVisibility"];
  detectedAt: string;
};

export const officialNoticesRouter = router({
  listInternal: publicProcedure
    .input(
      z
        .object({
          sourceId: z.string().trim().min(1).optional(),
          limit: z.number().int().min(1).max(100).default(50),
        })
        .optional(),
    )
    .query(async ({ ctx, input }): Promise<{ notices: OfficialNoticeInternalResponse[] }> => {
      requireFirmSession(ctx);

      const limit = input?.limit ?? 50;
      const rows = input?.sourceId
        ? await ctx.db
            .select()
            .from(officialNotices)
            .where(eq(officialNotices.sourceId, input.sourceId))
            .orderBy(desc(officialNotices.detectedAt))
            .limit(limit)
        : await ctx.db
            .select()
            .from(officialNotices)
            .orderBy(desc(officialNotices.detectedAt))
            .limit(limit);

      return {
        notices: rows.map(serializeOfficialNotice),
      };
    }),
});

function serializeOfficialNotice(notice: OfficialNotice): OfficialNoticeInternalResponse {
  return {
    id: notice.id,
    sourceId: notice.sourceId,
    noticeUrl: notice.noticeUrl,
    noticeTitle: notice.noticeTitle,
    noticePublishedAt: notice.noticePublishedAt?.toISOString() ?? null,
    noticeSummary: notice.noticeSummary,
    jurisdiction: notice.jurisdiction,
    deadlineRelevance: notice.deadlineRelevance,
    confidenceLabel: notice.confidenceLabel,
    confidenceReasons: notice.confidenceReasons,
    impactConditions: notice.impactConditions,
    workspaceMatchHints: notice.workspaceMatchHints,
    alertVisibility: notice.alertVisibility,
    detectedAt: notice.detectedAt.toISOString(),
  };
}
