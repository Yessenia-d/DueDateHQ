import { desc, eq } from "drizzle-orm";
import {
  officialSources,
  sourceCheckRuns,
  sourceCheckRunStatuses,
  type OfficialSource,
  type SourceCheckRun,
} from "@due-date-hq/db/schema/monitoring";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { Context } from "../context";
import { requireFirmSession } from "../context";
import { publicProcedure, router } from "../index";
import {
  getOfficialSourceDefinition,
  listOfficialSourceDefinitions,
  type OfficialSourceDefinition,
} from "../monitoring/official-source-registry";
import { recordSourceCheckResult } from "../monitoring/source-monitor";

export type OfficialSourceListItem = OfficialSourceDefinition & {
  monitorStatus: SourceCheckRun["status"] | "not_checked";
  lastCheckedAt: string | null;
  lastChangedAt: string | null;
  lastErrorMessage: string | null;
};

export type SourceCheckRunResponse = {
  id: string;
  sourceId: string;
  checkedAt: string;
  status: SourceCheckRun["status"];
  httpStatus: number | null;
  contentHash: string | null;
  previousContentHash: string | null;
  changedDetected: boolean;
  errorMessage: string | null;
};

const sourceIdInput = z.object({
  sourceId: z.string().trim().min(1),
});

const noticeCandidateInput = z.object({
  noticeUrl: z.string().trim().url().max(2000),
  noticeTitle: z.string().trim().min(1).max(500),
  noticePublishedAt: z.coerce.date().nullable().optional(),
  noticeSummary: z.string().trim().max(2000).optional(),
  noticeText: z.string().trim().max(20000).optional(),
});

export const officialSourcesRouter = router({
  list: publicProcedure.query(async ({ ctx }): Promise<{ sources: OfficialSourceListItem[] }> => {
    const persistedSources = await ctx.db.select().from(officialSources);
    const persistedById = new Map(persistedSources.map((source) => [source.id, source]));

    return {
      sources: listOfficialSourceDefinitions().map((definition) =>
        serializeSourceDefinition(definition, persistedById.get(definition.id)),
      ),
    };
  }),

  getCheckRuns: publicProcedure
    .input(sourceIdInput.extend({ limit: z.number().int().min(1).max(100).default(25) }))
    .query(async ({ ctx, input }): Promise<{ checkRuns: SourceCheckRunResponse[] }> => {
      ensureKnownSource(input.sourceId);

      const checkRuns = await ctx.db
        .select()
        .from(sourceCheckRuns)
        .where(eq(sourceCheckRuns.sourceId, input.sourceId))
        .orderBy(desc(sourceCheckRuns.checkedAt))
        .limit(input.limit);

      return {
        checkRuns: checkRuns.map(serializeCheckRun),
      };
    }),

  enqueueCheck: publicProcedure.input(sourceIdInput).mutation(({ ctx, input }) => {
    requireFirmSession(ctx);
    const source = ensureKnownSource(input.sourceId);

    return {
      accepted: true,
      sourceId: source.id,
      queued: false,
      message:
        "Official source check accepted. Queue binding is handled by the Cloudflare deployment task; call recordCheckResult from the monitor worker.",
    };
  }),

  recordCheckResult: publicProcedure
    .input(
      z.object({
        sourceId: z.string().trim().min(1),
        checkedAt: z.coerce.date().optional(),
        status: z.enum(sourceCheckRunStatuses),
        httpStatus: z.number().int().min(100).max(599).nullable().optional(),
        contentHash: z.string().trim().regex(/^[a-f0-9]{64}$/i).optional(),
        contentText: z.string().trim().min(1).max(200000).optional(),
        snapshotUrl: z.string().trim().url().nullable().optional(),
        errorMessage: z.string().trim().max(2000).nullable().optional(),
        notices: z.array(noticeCandidateInput).default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireOfficialSourceMonitorToken(ctx);

      const result = await recordSourceCheckResult(ctx.db, {
        sourceId: input.sourceId,
        checkedAt: input.checkedAt ?? new Date(),
        status: input.status,
        httpStatus: input.httpStatus ?? null,
        contentHash: input.contentHash ?? null,
        contentText: input.contentText ?? null,
        snapshotUrl: input.snapshotUrl ?? null,
        errorMessage: input.errorMessage ?? null,
        notices: input.notices.map((notice) => ({
          noticeUrl: notice.noticeUrl,
          noticeTitle: notice.noticeTitle,
          noticePublishedAt: notice.noticePublishedAt ?? null,
          noticeSummary: notice.noticeSummary ?? null,
          noticeText: notice.noticeText ?? null,
        })),
      });

      return {
        checkRun: serializeCheckRun(result.checkRun),
        snapshot: result.snapshot
          ? {
              id: result.snapshot.id,
              sourceId: result.snapshot.sourceId,
              contentHash: result.snapshot.contentHash,
              snapshotUrl: result.snapshot.snapshotUrl,
              capturedAt: result.snapshot.capturedAt.toISOString(),
            }
          : null,
        notices: result.notices.map((notice) => ({
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
        })),
      };
    }),
});

export function requireOfficialSourceMonitorToken(
  context: Pick<Context, "officialSourceMonitorRequestToken" | "officialSourceMonitorToken">,
) {
  const configuredToken = normalizeOptionalText(context.officialSourceMonitorToken);
  if (!configuredToken) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Official source monitor token is not configured.",
    });
  }

  if (normalizeOptionalText(context.officialSourceMonitorRequestToken) !== configuredToken) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Official source monitor token is invalid.",
    });
  }
}

function ensureKnownSource(sourceId: string) {
  const source = getOfficialSourceDefinition(sourceId);
  if (!source) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Official source is not in the supported allowlist.",
    });
  }

  return source;
}

function serializeSourceDefinition(
  definition: OfficialSourceDefinition,
  persisted: OfficialSource | undefined,
): OfficialSourceListItem {
  return {
    ...definition,
    monitorStatus: persisted?.lastStatus ?? "not_checked",
    lastCheckedAt: persisted?.lastCheckedAt?.toISOString() ?? null,
    lastChangedAt: persisted?.lastChangedAt?.toISOString() ?? null,
    lastErrorMessage: persisted?.lastErrorMessage ?? null,
  };
}

function serializeCheckRun(checkRun: SourceCheckRun): SourceCheckRunResponse {
  return {
    id: checkRun.id,
    sourceId: checkRun.sourceId,
    checkedAt: checkRun.checkedAt.toISOString(),
    status: checkRun.status,
    httpStatus: checkRun.httpStatus,
    contentHash: checkRun.contentHash,
    previousContentHash: checkRun.previousContentHash,
    changedDetected: checkRun.changedDetected,
    errorMessage: checkRun.errorMessage,
  };
}

function normalizeOptionalText(value: string | null | undefined) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}
