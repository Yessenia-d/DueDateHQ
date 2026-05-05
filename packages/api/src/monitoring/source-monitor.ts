import { desc, eq } from "drizzle-orm";
import {
  officialNotices,
  officialSources,
  sourceCheckRuns,
  sourceSnapshots,
  type ConfidenceLabel,
  type NoticeAlertVisibility,
  type OfficialNotice,
  type SourceCheckRun,
  type SourceCheckRunStatus,
  type SourceSnapshot,
  type NewOfficialNotice,
} from "@due-date-hq/db/schema/monitoring";
import { TRPCError } from "@trpc/server";

import { extractOfficialNoticeImpactConditions } from "../ai/official-notice-extractor";
import type { Context } from "../context";
import { createContentHash } from "./hash";
import {
  getOfficialSourceDefinition,
  type OfficialSourceDefinition,
} from "./official-source-registry";

export type NoticeCandidateInput = {
  noticeUrl: string;
  noticeTitle: string;
  noticePublishedAt: Date | null;
  noticeSummary?: string | null;
  noticeText?: string | null;
};

export type RecordSourceCheckResultInput = {
  sourceId: string;
  checkedAt: Date;
  status: SourceCheckRunStatus;
  httpStatus: number | null;
  contentHash?: string | null;
  contentText?: string | null;
  snapshotUrl?: string | null;
  errorMessage?: string | null;
  notices: NoticeCandidateInput[];
};

export type SourceCheckResult = {
  checkRun: SourceCheckRun;
  snapshot: SourceSnapshot | null;
  notices: OfficialNotice[];
};

export type ContentChangeInput = {
  status: SourceCheckRunStatus;
  contentHash: string | null;
  previousContentHash: string | null;
};

export function detectSourceContentChange({
  contentHash,
  previousContentHash,
  status,
}: ContentChangeInput) {
  if (status !== "success" || !contentHash) {
    return false;
  }

  return !previousContentHash || previousContentHash !== contentHash;
}

export function getNoticeAlertVisibility({
  confidenceLabel,
  hasWorkspaceMatchHints,
}: {
  confidenceLabel: ConfidenceLabel;
  hasWorkspaceMatchHints: boolean;
}): NoticeAlertVisibility {
  if ((confidenceLabel === "high" || confidenceLabel === "medium") && hasWorkspaceMatchHints) {
    return "workspace_alert";
  }

  return "internal_queue";
}

export function assertNoticeCandidatesAllowed(
  status: SourceCheckRunStatus,
  noticeCount: number,
) {
  if (status !== "success" && noticeCount > 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notice candidates can only be recorded for successful source checks.",
    });
  }
}

export async function recordSourceCheckResult(
  db: Context["db"],
  input: RecordSourceCheckResultInput,
): Promise<SourceCheckResult> {
  const source = getOfficialSourceDefinition(input.sourceId);
  if (!source) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Official source is not in the supported allowlist.",
    });
  }
  assertNoticeCandidatesAllowed(input.status, input.notices.length);

  const now = new Date();
  const contentHash = await resolveContentHash(input);
  const previousContentHash = await getPreviousContentHash(db, source.id);
  const changedDetected = detectSourceContentChange({
    contentHash,
    previousContentHash,
    status: input.status,
  });

  await upsertOfficialSource(db, source, now);

  const [checkRun] = await db
    .insert(sourceCheckRuns)
    .values({
      id: crypto.randomUUID(),
      sourceId: source.id,
      checkedAt: input.checkedAt,
      status: input.status,
      httpStatus: input.httpStatus,
      contentHash,
      previousContentHash,
      changedDetected,
      errorMessage: normalizeErrorMessage(input.status, input.errorMessage),
    })
    .returning();

  if (!checkRun) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Source check run could not be recorded.",
    });
  }

  let snapshot: SourceSnapshot | null = null;
  if (changedDetected && contentHash) {
    const [insertedSnapshot] = await db
      .insert(sourceSnapshots)
      .values({
        id: crypto.randomUUID(),
        sourceId: source.id,
        contentHash,
        snapshotUrl: normalizeOptionalText(input.snapshotUrl),
        capturedAt: input.checkedAt,
      })
      .returning();

    snapshot = insertedSnapshot ?? null;
  }

  await db
    .update(officialSources)
    .set({
      lastCheckedAt: input.checkedAt,
      lastChangedAt: changedDetected ? input.checkedAt : undefined,
      lastStatus: input.status,
      lastErrorMessage: normalizeErrorMessage(input.status, input.errorMessage),
      updatedAt: now,
    })
    .where(eq(officialSources.id, source.id));

  const notices: OfficialNotice[] = [];
  for (const notice of input.notices) {
    notices.push(await recordOfficialNotice(db, source, notice, snapshot?.id ?? null, now));
  }

  return {
    checkRun,
    snapshot,
    notices,
  };
}

async function resolveContentHash(input: RecordSourceCheckResultInput): Promise<string | null> {
  const normalizedHash = normalizeOptionalText(input.contentHash);
  if (normalizedHash) {
    return normalizedHash.toLowerCase();
  }

  const contentText = normalizeOptionalText(input.contentText);
  if (contentText) {
    return createContentHash(contentText);
  }

  if (input.status === "success") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Successful source checks require content text or a content hash.",
    });
  }

  return null;
}

async function getPreviousContentHash(db: Context["db"], sourceId: string) {
  const [previousSnapshot] = await db
    .select({ contentHash: sourceSnapshots.contentHash })
    .from(sourceSnapshots)
    .where(eq(sourceSnapshots.sourceId, sourceId))
    .orderBy(desc(sourceSnapshots.capturedAt))
    .limit(1);

  return previousSnapshot?.contentHash ?? null;
}

async function upsertOfficialSource(
  db: Context["db"],
  source: OfficialSourceDefinition,
  now: Date,
) {
  await db
    .insert(officialSources)
    .values({
      id: source.id,
      jurisdiction: source.jurisdiction,
      agencyName: source.agencyName,
      sourceType: source.sourceType,
      sourceUrl: source.sourceUrl,
      allowlistLevel: source.allowlistLevel,
      deadlineScope: source.deadlineScope,
      monitorFrequencyHours: source.monitorFrequencyHours,
      active: source.active,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: officialSources.id,
      set: {
        jurisdiction: source.jurisdiction,
        agencyName: source.agencyName,
        sourceType: source.sourceType,
        sourceUrl: source.sourceUrl,
        allowlistLevel: source.allowlistLevel,
        deadlineScope: source.deadlineScope,
        monitorFrequencyHours: source.monitorFrequencyHours,
        active: source.active,
        updatedAt: now,
      },
    });
}

async function recordOfficialNotice(
  db: Context["db"],
  source: OfficialSourceDefinition,
  notice: NoticeCandidateInput,
  sourceSnapshotId: string | null,
  now: Date,
) {
  const extraction = extractOfficialNoticeImpactConditions({
    source,
    noticeTitle: notice.noticeTitle,
    noticeText: notice.noticeText ?? notice.noticeSummary ?? notice.noticeTitle,
    noticeSummary: notice.noticeSummary,
  });
  const alertVisibility = getNoticeAlertVisibility({
    confidenceLabel: extraction.confidenceLabel,
    hasWorkspaceMatchHints: hasWorkspaceMatchHints(extraction.workspaceMatchHints),
  });

  const noticeUpdateValues: Partial<NewOfficialNotice> = {
    noticeTitle: notice.noticeTitle,
    noticePublishedAt: notice.noticePublishedAt,
    noticeSummary: extraction.noticeSummary,
    jurisdiction: extraction.jurisdiction,
    deadlineRelevance: extraction.deadlineRelevance,
    confidenceLabel: extraction.confidenceLabel,
    confidenceReasons: extraction.confidenceReasons,
    impactConditions: extraction.impactConditions,
    workspaceMatchHints: extraction.workspaceMatchHints,
    alertVisibility,
    detectedAt: now,
    updatedAt: now,
  };
  if (sourceSnapshotId) {
    noticeUpdateValues.sourceSnapshotId = sourceSnapshotId;
  }

  const [officialNotice] = await db
    .insert(officialNotices)
    .values({
      id: crypto.randomUUID(),
      sourceId: source.id,
      sourceSnapshotId,
      noticeUrl: notice.noticeUrl,
      noticeTitle: notice.noticeTitle,
      noticePublishedAt: notice.noticePublishedAt,
      noticeSummary: extraction.noticeSummary,
      jurisdiction: extraction.jurisdiction,
      deadlineRelevance: extraction.deadlineRelevance,
      confidenceLabel: extraction.confidenceLabel,
      confidenceReasons: extraction.confidenceReasons,
      impactConditions: extraction.impactConditions,
      workspaceMatchHints: extraction.workspaceMatchHints,
      alertVisibility,
      detectedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [officialNotices.sourceId, officialNotices.noticeUrl],
      set: noticeUpdateValues,
    })
    .returning();

  if (!officialNotice) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Official notice could not be recorded.",
    });
  }

  return officialNotice;
}

function hasWorkspaceMatchHints(hints: {
  jurisdictions: string[];
  entityTypes: string[];
  taxCategories: string[];
}) {
  return (
    hints.jurisdictions.length > 0 &&
    (hints.entityTypes.length > 0 || hints.taxCategories.length > 0)
  );
}

function normalizeErrorMessage(
  status: SourceCheckRunStatus,
  errorMessage: string | null | undefined,
) {
  const normalized = normalizeOptionalText(errorMessage);
  if (status === "success") {
    return normalized;
  }

  return normalized ?? "Monitor check did not complete successfully.";
}

function normalizeOptionalText(value: string | null | undefined) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}
