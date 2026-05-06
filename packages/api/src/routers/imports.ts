import { and, asc, eq } from "drizzle-orm";
import { auditLogs } from "@due-date-hq/db/schema/audit";
import {
  clientRelationships,
  deadlineDateEvents,
  deadlineTasks,
  filingProfileEntityTypes,
  filingProfiles,
  fiscalYearTypes,
  type ClientRelationship,
  type FilingProfileEntityType,
  type FiscalYearType,
} from "@due-date-hq/db/schema/deadline-domain";
import {
  duplicateCandidateActions,
  duplicateCandidates,
  importBatches,
  type ImportColumnMapping,
  importReviewItems,
  importSourceSystems,
  relationshipSuggestions as relationshipSuggestionsTable,
  type DuplicateCandidate,
  type DuplicateCandidateResolution,
  type ImportCanonicalProfile,
  type ImportReviewItem,
  type RelationshipSuggestion,
  type RelationshipSuggestionStatus,
} from "@due-date-hq/db/schema/imports";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { requireFirmSession, type Context } from "../context";
import { parseWithSourceAdapter } from "../imports/adapters/source-adapters";
import {
  buildImportReview,
  buildReviewGroups,
  summarizeProfileCoverage,
  type CoverageIssue,
  type ImportReviewItemDraft,
  type ReviewProblemGroup,
} from "../imports/review/review";
import { normalizeStateCode } from "../imports/state-normalization";
import {
  generateDeadlineTasks,
  getTaskGenerationTaxYears,
  matchProfileToRules,
} from "../lib/profile-rule-matcher";
import { getSeedObligations, getSeedRules } from "../lib/seed-tax-data";
import { publicProcedure, router } from "../index";

const csvTextSchema = z.string().trim().min(1).max(2_000_000);
const optionalTextCorrectionSchema = z.string().trim().max(200).nullable().optional();
const relationshipDecisionStatusSchema = z.enum(["accepted", "rejected"]);
const previewInsertChunkSize = 8;

const profileCorrectionSchema = z.object({
  clientName: z.string().trim().min(1).max(200).optional(),
  filingProfileName: optionalTextCorrectionSchema,
  ein: optionalTextCorrectionSchema,
  ssnLast4: optionalTextCorrectionSchema,
  state: optionalTextCorrectionSchema,
  states: z.array(z.string().trim().min(1).max(32)).max(20).optional(),
  entityType: z.enum(filingProfileEntityTypes).nullable().optional(),
  county: optionalTextCorrectionSchema,
  fiscalYearType: z.enum(fiscalYearTypes).nullable().optional(),
});

const commitInputSchema = z.object({
  batchId: z.string().trim().min(1),
  rowCorrections: z
    .array(
      z.object({
        reviewItemId: z.string().trim().min(1),
        profile: profileCorrectionSchema,
      }),
    )
    .default([]),
  duplicateResolutions: z
    .array(
      z.object({
        duplicateCandidateId: z.string().trim().min(1),
        resolution: z.enum(duplicateCandidateActions),
      }),
    )
    .default([]),
  relationshipSuggestionDecisions: z
    .array(
      z.object({
        suggestionId: z.string().trim().min(1),
        status: relationshipDecisionStatusSchema,
      }),
    )
    .default([]),
});

export type ImportReviewRowResponse = {
  id: string;
  sourceRowId: string;
  rowIndex: number;
  status: ImportReviewItemDraft["status"];
  problemTypes: ImportReviewItemDraft["problemTypes"];
  canonicalProfile: ImportCanonicalProfile;
  sourceFields: Record<string, string>;
  messages: string[];
};

export type ImportDuplicateCandidateResponse = {
  id: string;
  incomingReviewItemId: string;
  existingClientRelationshipId: string | null;
  matchedFields: string[];
  differingFields: Record<string, { incoming: string | null; existing: string | null }>;
  suggestedAction: DuplicateCandidate["suggestedAction"];
  resolution: DuplicateCandidateResolution;
};

export type ImportRelationshipSuggestionResponse = {
  id: string;
  incomingReviewItemId: string;
  suggestedClientRelationshipId: string | null;
  reason: string;
  suggestedAction: RelationshipSuggestion["suggestedAction"];
  status: RelationshipSuggestionStatus;
};

export type ImportPreviewResponse = {
  batchId: string;
  sourceSystem: (typeof importSourceSystems)[number];
  detectedSourceProfile: string;
  adapterVersion: string;
  headerDetection: {
    headerDetected: boolean;
    totalRows: number;
  };
  columnMapping: ImportColumnMapping[];
  recognizedFields: string[];
  unmappedColumns: string[];
  mappingConfidence: number;
  acceptedProfileRows: ImportReviewRowResponse[];
  reviewRows: ImportReviewRowResponse[];
  duplicateCandidates: ImportDuplicateCandidateResponse[];
  relationshipSuggestions: ImportRelationshipSuggestionResponse[];
  reviewGroups: ReviewProblemGroup[];
  validationMessages: string[];
  summary: {
    totalRows: number;
    readyProfiles: number;
    reviewProfiles: number;
    newClientRelationships: number;
    matchedClientRelationships: number;
    filingProfiles: number;
    generatedVerifiedTasks: number;
    duplicateCandidates: number;
    relationshipSuggestions: number;
  };
};

export type ImportCommitResponse = {
  batchId: string;
  status: "committed";
  readyProfileCount: number;
  createdClientRelationshipCount: number;
  matchedClientRelationshipCount: number;
  createdFilingProfileCount: number;
  createdVerifiedTaskCount: number;
  updatedDuplicateCount: number;
  skippedDuplicateCount: number;
  profileReviewItemCount: number;
  needsReviewObligationCount: number;
  coverageGapCount: number;
  unsupportedObligationCount: number;
  relationshipSuggestions: {
    accepted: number;
    rejected: number;
    pending: number;
  };
  summary: string;
  profileResults: Array<{
    reviewItemId: string;
    clientRelationshipId: string;
    filingProfileId: string;
    clientName: string;
    generatedVerifiedTaskCount: number;
    needsReviewObligations: CoverageIssue[];
    coverageGapObligations: CoverageIssue[];
    unsupportedObligations: CoverageIssue[];
  }>;
};

type FirmSession = ReturnType<typeof requireFirmSession>;

function serializeReviewItem(item: ImportReviewItemDraft): ImportReviewRowResponse {
  return {
    id: item.id,
    sourceRowId: item.sourceRowId,
    rowIndex: item.rowIndex,
    status: item.status,
    problemTypes: item.problemTypes,
    canonicalProfile: item.canonicalProfile,
    sourceFields: item.sourceFields,
    messages: item.messages,
  };
}

function chunkArray<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function normalizeText(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeStates(states: readonly string[]): string[] {
  return [
    ...new Set(
      states
        .flatMap((state) => state.split(/[;|,]/))
        .map((state) => normalizeStateCode(state))
        .filter((state): state is string => Boolean(state)),
    ),
  ];
}

function normalizeSsnLast4(value: string | null): string | null {
  const digits = value?.replace(/\D/g, "") ?? "";
  return digits.length >= 4 ? digits.slice(-4) : null;
}

function normalizeTaxId(value: string | null): string | null {
  const normalized = value?.replace(/\D/g, "") ?? "";
  return normalized || normalizeText(value);
}

function normalizeSourceClientKey(
  sourceSystem: string,
  sourceClientId: string | null | undefined,
): string | null {
  const normalized = normalizeText(sourceClientId)?.toLowerCase();
  return normalized ? `${sourceSystem}:${normalized}` : null;
}

function createSourceClientIdMap(
  clients: readonly ClientRelationship[],
): Map<string, ClientRelationship> {
  const bySourceClientId = new Map<string, ClientRelationship>();

  for (const client of clients) {
    const key = normalizeSourceClientKey(client.sourceSystem, client.sourceClientId);
    if (key) {
      bySourceClientId.set(key, client);
    }
  }

  return bySourceClientId;
}

function countGeneratedVerifiedTasks(profile: ImportCanonicalProfile): number {
  if (!profile.entityType) return 0;

  const obligations = getSeedObligations();
  const rules = getSeedRules();
  const matchedRules = matchProfileToRules(
    {
      id: profile.sourceRowId,
      firmId: "preview",
      entityType: profile.entityType,
      jurisdictions: ["federal", ...profile.states],
    },
    obligations,
    rules,
  );

  return generateDeadlineTasks(
    {
      id: profile.sourceRowId,
      firmId: "preview",
      entityType: profile.entityType,
      jurisdictions: ["federal", ...profile.states],
    },
    matchedRules,
    getTaskGenerationTaxYears(),
  ).length;
}

function buildPreviewSummaryDetails({
  existingClientRelationships,
  items,
}: {
  existingClientRelationships: readonly ClientRelationship[];
  items: readonly ImportReviewItemDraft[];
}) {
  const existingBySourceClientId = createSourceClientIdMap(existingClientRelationships);
  const batchSourceClientIds = new Set<string>();
  let newClientRelationships = 0;
  let matchedClientRelationships = 0;
  let generatedVerifiedTasks = 0;

  for (const item of items) {
    const profile = item.canonicalProfile;
    generatedVerifiedTasks += countGeneratedVerifiedTasks(profile);

    if (!profile.clientName || !profile.entityType) continue;

    const sourceClientKey = normalizeSourceClientKey(
      profile.sourceSystem,
      profile.sourceClientId,
    );

    if (!sourceClientKey) {
      newClientRelationships++;
      continue;
    }

    if (existingBySourceClientId.has(sourceClientKey) || batchSourceClientIds.has(sourceClientKey)) {
      matchedClientRelationships++;
      continue;
    }

    batchSourceClientIds.add(sourceClientKey);
    newClientRelationships++;
  }

  return {
    newClientRelationships,
    matchedClientRelationships,
    filingProfiles: items.length,
    generatedVerifiedTasks,
  };
}

function applyProfileCorrection(
  profile: ImportCanonicalProfile,
  correction: z.infer<typeof profileCorrectionSchema> | undefined,
): ImportCanonicalProfile {
  if (!correction) {
    return profile;
  }

  const correctedStates =
    correction.states !== undefined
      ? normalizeStates(correction.states)
      : correction.state !== undefined
        ? normalizeStates(correction.state ? [correction.state] : [])
        : profile.states;
  const correctedEntityType =
    correction.entityType === undefined ? profile.entityType : correction.entityType;
  const correctedEin =
    correction.ein === undefined ? profile.ein : normalizeTaxId(correction.ein);
  const correctedSsnLast4 =
    correction.ssnLast4 === undefined
      ? profile.ssnLast4
      : normalizeSsnLast4(correction.ssnLast4);

  return {
    ...profile,
    clientName:
      correction.clientName === undefined ? profile.clientName : normalizeText(correction.clientName),
    filingProfileName:
      correction.filingProfileName === undefined
        ? profile.filingProfileName
        : normalizeText(correction.filingProfileName),
    ein: correctedEntityType === "individual" ? null : correctedEin,
    ssnLast4:
      correctedEntityType === "individual"
        ? correctedSsnLast4 ?? normalizeSsnLast4(correctedEin)
        : null,
    state:
      correction.state !== undefined || correction.states !== undefined
        ? correctedStates[0] ?? null
        : profile.state,
    states: correctedStates,
    entityType: correctedEntityType,
    county: correction.county === undefined ? profile.county : normalizeText(correction.county),
    fiscalYearType:
      correction.fiscalYearType === undefined ? profile.fiscalYearType : correction.fiscalYearType,
  };
}

function isProfileReadyForCommit({
  duplicateResolution,
  pendingRelationshipCount,
  profile,
}: {
  duplicateResolution: DuplicateCandidateResolution | null;
  pendingRelationshipCount: number;
  profile: ImportCanonicalProfile;
}) {
  if (!profile.clientName || !profile.entityType) return false;
  if (duplicateResolution === "pending") return false;
  if (pendingRelationshipCount > 0) return false;

  return true;
}

function relationshipTypeFromEntity(entityType: FilingProfileEntityType) {
  return entityType === "individual" ? "individual" : "business";
}

function getProfileCoverageState(summary: ReturnType<typeof summarizeProfileCoverage>) {
  if (summary.coverageGapObligations.length > 0) return "coverage_gap";
  if (summary.unsupportedObligations.length > 0 && summary.verifiedRuleCount === 0) {
    return "unsupported";
  }
  if (summary.verifiedRuleCount > 0) return "ready";
  return "needs_review";
}

function formatDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function buildCommitSummary(response: Omit<ImportCommitResponse, "summary">): string {
  return [
    `${pluralize(response.createdClientRelationshipCount, "client relationship")} created.`,
    `${pluralize(response.matchedClientRelationshipCount + response.updatedDuplicateCount, "client relationship")} matched or updated.`,
    `${pluralize(response.createdFilingProfileCount, "filing profile")} created.`,
    `${pluralize(response.readyProfileCount, "filing profile")} ready for deadline work.`,
    `${pluralize(response.createdVerifiedTaskCount, "verified deadline task")} generated from DueDateHQ Verified rules.`,
    `${pluralize(response.profileReviewItemCount, "profile")} still need review.`,
    `${pluralize(response.needsReviewObligationCount, "needs-review obligation")} visible but not official tasks.`,
    `${pluralize(response.coverageGapCount, "coverage gap")} and ${pluralize(response.unsupportedObligationCount, "unsupported obligation")} were kept visible without verified styling.`,
  ].join(" ");
}

async function requirePreviewBatch({
  batchId,
  ctx,
  firmId,
}: {
  batchId: string;
  ctx: Context;
  firmId: string;
}) {
  const [batch] = await ctx.db
    .select()
    .from(importBatches)
    .where(and(eq(importBatches.firmId, firmId), eq(importBatches.id, batchId)))
    .limit(1);

  if (!batch) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Import batch was not found.",
    });
  }

  if (batch.status !== "previewed") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Only previewed import batches can be committed.",
    });
  }

  return batch;
}

async function recordImportAuditLog({
  auditLogId,
  batchId,
  ctx,
  response,
  session,
}: {
  auditLogId: string;
  batchId: string;
  ctx: Context;
  response: Omit<ImportCommitResponse, "summary">;
  session: FirmSession;
}) {
  await ctx.db.insert(auditLogs).values({
    id: auditLogId,
    firmId: session.firm.id,
    actorType: "user",
    actorUserId: session.user.id,
    action: "import.commit",
    entityType: "import_batch",
    entityId: batchId,
    beforeState: null,
    afterState: {
      readyProfileCount: response.readyProfileCount,
      createdClientRelationshipCount: response.createdClientRelationshipCount,
      matchedClientRelationshipCount: response.matchedClientRelationshipCount,
      createdFilingProfileCount: response.createdFilingProfileCount,
      createdVerifiedTaskCount: response.createdVerifiedTaskCount,
      profileReviewItemCount: response.profileReviewItemCount,
      coverageGapCount: response.coverageGapCount,
      unsupportedObligationCount: response.unsupportedObligationCount,
    },
    sourceType: "csv_import",
    sourceId: batchId,
    metadata: {
      relationshipSuggestions: response.relationshipSuggestions,
      duplicateHandling: {
        updated: response.updatedDuplicateCount,
        skipped: response.skippedDuplicateCount,
      },
    },
    createdAt: new Date(),
  });

  return auditLogId;
}

async function updateDuplicateResolutions({
  ctx,
  duplicateRows,
  inputResolutions,
}: {
  ctx: Context;
  duplicateRows: DuplicateCandidate[];
  inputResolutions: ReadonlyMap<string, Exclude<DuplicateCandidateResolution, "pending">>;
}) {
  const now = new Date();
  const resolved = new Map<string, DuplicateCandidateResolution>();

  for (const duplicate of duplicateRows) {
    const resolution = inputResolutions.get(duplicate.id) ?? duplicate.resolution;
    resolved.set(duplicate.id, resolution);

    if (resolution !== duplicate.resolution) {
      await ctx.db
        .update(duplicateCandidates)
        .set({ resolution, updatedAt: now })
        .where(
          and(
            eq(duplicateCandidates.firmId, duplicate.firmId),
            eq(duplicateCandidates.batchId, duplicate.batchId),
            eq(duplicateCandidates.id, duplicate.id),
          ),
        )
        .returning();
    }
  }

  return resolved;
}

async function updateRelationshipDecisions({
  ctx,
  inputDecisions,
  suggestionRows,
}: {
  ctx: Context;
  inputDecisions: ReadonlyMap<string, Exclude<RelationshipSuggestionStatus, "pending">>;
  suggestionRows: RelationshipSuggestion[];
}) {
  const now = new Date();
  const decided = new Map<string, RelationshipSuggestionStatus>();

  for (const suggestion of suggestionRows) {
    const status = inputDecisions.get(suggestion.id) ?? suggestion.status;
    decided.set(suggestion.id, status);

    if (status !== suggestion.status) {
      await ctx.db
        .update(relationshipSuggestionsTable)
        .set({ status, updatedAt: now })
        .where(
          and(
            eq(relationshipSuggestionsTable.firmId, suggestion.firmId),
            eq(relationshipSuggestionsTable.batchId, suggestion.batchId),
            eq(relationshipSuggestionsTable.id, suggestion.id),
          ),
        )
        .returning();
    }
  }

  return decided;
}

export const importsRouter = router({
  preview: publicProcedure
    .input(z.object({ sourceSystem: z.enum(importSourceSystems), csvText: csvTextSchema }))
    .mutation(async ({ ctx, input }): Promise<ImportPreviewResponse> => {
      const session = requireFirmSession(ctx);
      const adapterResult = parseWithSourceAdapter(input.sourceSystem, input.csvText);
      const existingClientRelationships = await ctx.db
        .select()
        .from(clientRelationships)
        .where(eq(clientRelationships.firmId, session.firm.id))
        .orderBy(asc(clientRelationships.displayName));
      const existingFilingProfiles = await ctx.db
        .select()
        .from(filingProfiles)
        .where(eq(filingProfiles.firmId, session.firm.id))
        .orderBy(asc(filingProfiles.displayName));
      const review = buildImportReview({
        rows: adapterResult.rows,
        existingClientRelationships,
        existingFilingProfiles,
      });
      const acceptedRows = review.items.filter((item) => item.status === "accepted");
      const reviewRows = review.items.filter((item) => item.status === "needs_review");
      const previewSummaryDetails = buildPreviewSummaryDetails({
        existingClientRelationships,
        items: review.items,
      });
      const now = new Date();
      const batchId = crypto.randomUUID();

      await ctx.db.insert(importBatches).values({
        id: batchId,
        firmId: session.firm.id,
        sourceSystem: input.sourceSystem,
        status: "previewed",
        adapterProfile: adapterResult.detectedSourceProfile,
        adapterVersion: adapterResult.adapterVersion,
        totalRows: review.items.length,
        acceptedRows: acceptedRows.length,
        reviewRows: reviewRows.length,
        duplicateRows: review.duplicateCandidates.length,
        headerDetected: adapterResult.headerDetected,
        mappingConfidence: adapterResult.mappingConfidence,
        columnMapping: adapterResult.columnMapping,
        recognizedFields: adapterResult.recognizedFields,
        unmappedColumns: adapterResult.unmappedColumns,
        validationMessages: adapterResult.validationMessages,
        createdAt: now,
        committedAt: null,
      }).returning();

      if (review.items.length > 0) {
        for (const chunk of chunkArray(review.items, previewInsertChunkSize)) {
          await ctx.db
            .insert(importReviewItems)
            .values(
              chunk.map((item) => ({
                id: item.id,
                firmId: session.firm.id,
                batchId,
                sourceRowId: item.sourceRowId,
                rowIndex: item.rowIndex,
                status: item.status,
                problemTypes: item.problemTypes,
                canonicalProfile: item.canonicalProfile,
                sourceFields: item.sourceFields,
                messages: item.messages,
                createdAt: now,
              })),
            )
            .returning();
        }
      }

      if (review.duplicateCandidates.length > 0) {
        for (const chunk of chunkArray(review.duplicateCandidates, previewInsertChunkSize)) {
          await ctx.db
            .insert(duplicateCandidates)
            .values(
              chunk.map((candidate) => ({
                id: candidate.id,
                firmId: session.firm.id,
                batchId,
                incomingReviewItemId: candidate.incomingReviewItemId,
                existingClientRelationshipId: candidate.existingClientRelationshipId,
                matchedFields: candidate.matchedFields,
                differingFields: candidate.differingFields,
                suggestedAction: candidate.suggestedAction,
                resolution: candidate.resolution,
                createdAt: now,
                updatedAt: now,
              })),
            )
            .returning();
        }
      }

      if (review.relationshipSuggestions.length > 0) {
        for (const chunk of chunkArray(review.relationshipSuggestions, previewInsertChunkSize)) {
          await ctx.db
            .insert(relationshipSuggestionsTable)
            .values(
              chunk.map((suggestion) => ({
                id: suggestion.id,
                firmId: session.firm.id,
                batchId,
                incomingReviewItemId: suggestion.incomingReviewItemId,
                suggestedClientRelationshipId: suggestion.suggestedClientRelationshipId,
                reason: suggestion.reason,
                suggestedAction: suggestion.suggestedAction,
                status: suggestion.status,
                createdAt: now,
                updatedAt: now,
              })),
            )
            .returning();
        }
      }

      return {
        batchId,
        sourceSystem: input.sourceSystem,
        detectedSourceProfile: adapterResult.detectedSourceProfile,
        adapterVersion: adapterResult.adapterVersion,
        headerDetection: {
          headerDetected: adapterResult.headerDetected,
          totalRows: review.items.length,
        },
        columnMapping: adapterResult.columnMapping,
        recognizedFields: adapterResult.recognizedFields,
        unmappedColumns: adapterResult.unmappedColumns,
        mappingConfidence: adapterResult.mappingConfidence,
        acceptedProfileRows: acceptedRows.map(serializeReviewItem),
        reviewRows: reviewRows.map(serializeReviewItem),
        duplicateCandidates: review.duplicateCandidates,
        relationshipSuggestions: review.relationshipSuggestions,
        reviewGroups: buildReviewGroups(review.items),
        validationMessages: adapterResult.validationMessages,
        summary: {
          totalRows: review.items.length,
          readyProfiles: acceptedRows.length,
          reviewProfiles: reviewRows.length,
          newClientRelationships: previewSummaryDetails.newClientRelationships,
          matchedClientRelationships: previewSummaryDetails.matchedClientRelationships,
          filingProfiles: previewSummaryDetails.filingProfiles,
          generatedVerifiedTasks: previewSummaryDetails.generatedVerifiedTasks,
          duplicateCandidates: review.duplicateCandidates.length,
          relationshipSuggestions: review.relationshipSuggestions.length,
        },
      };
    }),

  commit: publicProcedure
    .input(commitInputSchema)
    .mutation(async ({ ctx, input }): Promise<ImportCommitResponse> => {
      const session = requireFirmSession(ctx);
      const batch = await requirePreviewBatch({
        batchId: input.batchId,
        ctx,
        firmId: session.firm.id,
      });
      const reviewRows = await ctx.db
        .select()
        .from(importReviewItems)
        .where(and(eq(importReviewItems.firmId, session.firm.id), eq(importReviewItems.batchId, batch.id)))
        .orderBy(asc(importReviewItems.rowIndex));
      const duplicateRows = await ctx.db
        .select()
        .from(duplicateCandidates)
        .where(and(eq(duplicateCandidates.firmId, session.firm.id), eq(duplicateCandidates.batchId, batch.id)))
        .orderBy(asc(duplicateCandidates.createdAt));
      const suggestionRows = await ctx.db
        .select()
        .from(relationshipSuggestionsTable)
        .where(and(eq(relationshipSuggestionsTable.firmId, session.firm.id), eq(relationshipSuggestionsTable.batchId, batch.id)))
        .orderBy(asc(relationshipSuggestionsTable.createdAt));
      const existingTasks = await ctx.db
        .select()
        .from(deadlineTasks)
        .where(eq(deadlineTasks.firmId, session.firm.id))
        .orderBy(asc(deadlineTasks.createdAt));
      const existingClientRelationships = await ctx.db
        .select()
        .from(clientRelationships)
        .where(eq(clientRelationships.firmId, session.firm.id))
        .orderBy(asc(clientRelationships.displayName));
      const correctionByItemId = new Map(
        input.rowCorrections.map((correction) => [correction.reviewItemId, correction.profile]),
      );
      const duplicateResolutionById = new Map(
        input.duplicateResolutions.map((resolution) => [
          resolution.duplicateCandidateId,
          resolution.resolution,
        ]),
      );
      const relationshipDecisionById = new Map(
        input.relationshipSuggestionDecisions.map((decision) => [
          decision.suggestionId,
          decision.status,
        ]),
      );
      const duplicateResolutions = await updateDuplicateResolutions({
        ctx,
        duplicateRows,
        inputResolutions: duplicateResolutionById,
      });
      const relationshipDecisions = await updateRelationshipDecisions({
        ctx,
        inputDecisions: relationshipDecisionById,
        suggestionRows,
      });
      const pendingDuplicateCount = duplicateRows.filter((candidate) => {
        const resolution = duplicateResolutions.get(candidate.id) ?? candidate.resolution;
        return resolution === "pending";
      }).length;
      const pendingRelationshipCount = suggestionRows.filter((suggestion) => {
        const status = relationshipDecisions.get(suggestion.id) ?? suggestion.status;
        return status === "pending";
      }).length;

      if (pendingDuplicateCount > 0 || pendingRelationshipCount > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Resolve every duplicate candidate and relationship suggestion before committing this import.",
        });
      }
      const duplicateByItemId = new Map(
        duplicateRows.map((candidate) => [candidate.incomingReviewItemId, candidate]),
      );
      const suggestionsByItemId = new Map<string, RelationshipSuggestion[]>();

      for (const suggestion of suggestionRows) {
        const current = suggestionsByItemId.get(suggestion.incomingReviewItemId) ?? [];
        current.push(suggestion);
        suggestionsByItemId.set(suggestion.incomingReviewItemId, current);
      }

      const obligations = getSeedObligations();
      const rules = getSeedRules();
      const taxYears = getTaskGenerationTaxYears();
      const existingTaskKeys = new Set(
        existingTasks
          .map((task) => task.recurrenceKey)
          .filter((key): key is string => Boolean(key)),
      );
      const sourceClientIdToRelationshipId = new Map(
        [...createSourceClientIdMap(existingClientRelationships)].map(([key, client]) => [
          key,
          client.id,
        ]),
      );
      const existingClientRelationshipById = new Map(
        existingClientRelationships.map((client) => [client.id, client]),
      );
      const profileResults: ImportCommitResponse["profileResults"] = [];
      let readyProfileCount = 0;
      let createdClientRelationshipCount = 0;
      let matchedClientRelationshipCount = 0;
      let createdFilingProfileCount = 0;
      let createdVerifiedTaskCount = 0;
      let updatedDuplicateCount = 0;
      let skippedDuplicateCount = 0;
      let profileReviewItemCount = 0;
      let needsReviewObligationCount = 0;
      let coverageGapCount = 0;
      let unsupportedObligationCount = 0;
      const now = new Date();
      const importAuditLogId = crypto.randomUUID();

      for (const reviewRow of reviewRows) {
        const profile = applyProfileCorrection(
          reviewRow.canonicalProfile,
          correctionByItemId.get(reviewRow.id),
        );
        const duplicate = duplicateByItemId.get(reviewRow.id) ?? null;
        const duplicateResolution = duplicate
          ? duplicateResolutions.get(duplicate.id) ?? duplicate.resolution
          : null;
        const rowSuggestions = suggestionsByItemId.get(reviewRow.id) ?? [];
        const pendingRelationshipCount = rowSuggestions.filter((suggestion) => {
          const status = relationshipDecisions.get(suggestion.id) ?? suggestion.status;
          return status === "pending";
        }).length;

        if (duplicateResolution === "skip") {
          skippedDuplicateCount++;
          await markReviewRow(ctx, reviewRow, "skipped", profile);
          continue;
        }

        if (
          !isProfileReadyForCommit({
            duplicateResolution,
            pendingRelationshipCount,
            profile,
          })
        ) {
          profileReviewItemCount++;
          await markReviewRow(ctx, reviewRow, "needs_review", profile);
          continue;
        }

        const clientName = profile.clientName;
        const entityType = profile.entityType;
        if (!clientName || !entityType) {
          profileReviewItemCount++;
          await markReviewRow(ctx, reviewRow, "needs_review", profile);
          continue;
        }

        const fiscalYearType: FiscalYearType = profile.fiscalYearType ?? "calendar_year";
        let clientRelationshipId = duplicate?.existingClientRelationshipId ?? null;
        const sourceClientKey = normalizeSourceClientKey(batch.sourceSystem, profile.sourceClientId);

        if (duplicateResolution === "update_existing" && clientRelationshipId) {
          updatedDuplicateCount++;
          if (sourceClientKey) {
            sourceClientIdToRelationshipId.set(sourceClientKey, clientRelationshipId);
            const existingClient = existingClientRelationshipById.get(clientRelationshipId);
            const existingSourceClientKey = existingClient
              ? normalizeSourceClientKey(existingClient.sourceSystem, existingClient.sourceClientId)
              : null;

            if (!existingSourceClientKey && profile.sourceClientId) {
              await ctx.db
                .update(clientRelationships)
                .set({
                  sourceSystem: batch.sourceSystem,
                  sourceClientId: profile.sourceClientId,
                  updatedAt: now,
                })
                .where(
                  and(
                    eq(clientRelationships.firmId, session.firm.id),
                    eq(clientRelationships.id, clientRelationshipId),
                  ),
                )
                .returning();

              if (existingClient) {
                existingClientRelationshipById.set(clientRelationshipId, {
                  ...existingClient,
                  sourceSystem: batch.sourceSystem,
                  sourceClientId: profile.sourceClientId,
                  updatedAt: now,
                });
              }
            }
          }
        } else if (sourceClientKey && sourceClientIdToRelationshipId.has(sourceClientKey)) {
          clientRelationshipId = sourceClientIdToRelationshipId.get(sourceClientKey) ?? null;
          matchedClientRelationshipCount++;
        } else {
          const [client] = await ctx.db
            .insert(clientRelationships)
            .values({
              id: crypto.randomUUID(),
              firmId: session.firm.id,
              displayName: clientName,
              relationshipType: relationshipTypeFromEntity(entityType),
              notes: null,
              sourceSystem: batch.sourceSystem,
              sourceClientId: profile.sourceClientId,
              createdVia: "csv_import",
              createdAt: now,
              updatedAt: now,
            })
            .returning();

          if (!client) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Imported client relationship could not be created.",
            });
          }

          clientRelationshipId = client.id;
          createdClientRelationshipCount++;
          if (sourceClientKey) {
            sourceClientIdToRelationshipId.set(sourceClientKey, clientRelationshipId);
          }
        }

        if (!clientRelationshipId) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Imported client relationship could not be matched or created.",
          });
        }

        const coverage = summarizeProfileCoverage(profile, obligations, rules);
        needsReviewObligationCount += coverage.needsReviewObligations.length;
        coverageGapCount += coverage.coverageGapObligations.length;
        unsupportedObligationCount += coverage.unsupportedObligations.length;

        const [filingProfile] = await ctx.db
          .insert(filingProfiles)
          .values({
            id: crypto.randomUUID(),
            firmId: session.firm.id,
            clientRelationshipId,
            displayName: profile.filingProfileName ?? clientName,
            ein: profile.ein,
            ssnLast4: profile.ssnLast4,
            entityType,
            states: profile.states,
            county: profile.county,
            fiscalYearType,
            coverageState: getProfileCoverageState(coverage),
            notes: null,
            sourceSystem: batch.sourceSystem,
            sourceRowId: profile.sourceRowId,
            createdVia: "csv_import",
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        if (!filingProfile) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Imported filing profile could not be created.",
          });
        }

        createdFilingProfileCount++;

        const matchedRules = matchProfileToRules(
          {
            id: filingProfile.id,
            firmId: session.firm.id,
            entityType,
            jurisdictions: ["federal", ...profile.states],
          },
          obligations,
          rules,
        );
        const generatedTasks = generateDeadlineTasks(
          {
            id: filingProfile.id,
            firmId: session.firm.id,
            entityType,
            jurisdictions: ["federal", ...profile.states],
          },
          matchedRules,
          taxYears,
        );
        let generatedVerifiedTaskCount = 0;

        for (const generated of generatedTasks) {
          if (existingTaskKeys.has(generated.uniquenessKey)) {
            continue;
          }

          const rule = rules.find((candidate) => candidate.id === generated.taxRuleId);
          const [deadline] = await ctx.db
            .insert(deadlineTasks)
            .values({
              id: crypto.randomUUID(),
              firmId: session.firm.id,
              clientRelationshipId,
              filingProfileId: filingProfile.id,
              taxRuleId: generated.taxRuleId,
              title: generated.title,
              jurisdiction: generated.jurisdiction,
              taxCategory: generated.taxCategory,
              currentDueDate: formatDate(generated.currentDueDate),
              originalDueDate: formatDate(generated.originalDueDate),
              firmTargetDate: null,
              recurrenceKey: generated.uniquenessKey,
              status: "not_started",
              priority: "normal",
              sourceType: "verified_rule",
              createdVia: "system_rule",
              enteredDeadlineReferenceNote: null,
              createdAt: now,
              updatedAt: now,
            })
            .returning();

          if (!deadline) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Verified deadline task could not be created for the imported profile.",
            });
          }

          existingTaskKeys.add(generated.uniquenessKey);
          generatedVerifiedTaskCount++;
          createdVerifiedTaskCount++;

          await ctx.db.insert(deadlineDateEvents).values({
            id: crypto.randomUUID(),
            firmId: session.firm.id,
            deadlineTaskId: deadline.id,
            eventType: "official_original_due_date",
            previousCurrentDueDate: null,
            newCurrentDueDate: deadline.currentDueDate,
            previousFirmTargetDate: null,
            newFirmTargetDate: null,
            sourceName: rule?.sourceName ?? "DueDateHQ Verified tax rule",
            sourceUrl: rule?.sourceUrl ?? null,
            sourceSnapshotId: rule?.id ?? generated.taxRuleId,
            createdBy: session.user.id,
            auditLogId: null,
            createdAt: now,
            notes: "Official due date created during CSV import commit from a DueDateHQ Verified rule.",
          }).returning();
        }

        readyProfileCount++;
        await markReviewRow(ctx, reviewRow, "committed", profile);
        profileResults.push({
          reviewItemId: reviewRow.id,
          clientRelationshipId,
          filingProfileId: filingProfile.id,
          clientName,
          generatedVerifiedTaskCount,
          needsReviewObligations: coverage.needsReviewObligations,
          coverageGapObligations: coverage.coverageGapObligations,
          unsupportedObligations: coverage.unsupportedObligations,
        });
      }

      const relationshipCounts = getRelationshipDecisionCounts(
        suggestionRows,
        relationshipDecisions,
      );
      const responseWithoutSummary: Omit<ImportCommitResponse, "summary"> = {
        batchId: batch.id,
        status: "committed",
        readyProfileCount,
        createdClientRelationshipCount,
        matchedClientRelationshipCount,
        createdFilingProfileCount,
        createdVerifiedTaskCount,
        updatedDuplicateCount,
        skippedDuplicateCount,
        profileReviewItemCount,
        needsReviewObligationCount,
        coverageGapCount,
        unsupportedObligationCount,
        relationshipSuggestions: relationshipCounts,
        profileResults,
      };
      await recordImportAuditLog({
        auditLogId: importAuditLogId,
        batchId: batch.id,
        ctx,
        response: responseWithoutSummary,
        session,
      });

      await ctx.db
        .update(importBatches)
        .set({
          status: "committed",
          acceptedRows: readyProfileCount,
          reviewRows: profileReviewItemCount,
          duplicateRows: duplicateRows.length,
          committedAt: now,
        })
        .where(and(eq(importBatches.firmId, session.firm.id), eq(importBatches.id, batch.id)))
        .returning();

      return {
        ...responseWithoutSummary,
        summary: buildCommitSummary(responseWithoutSummary),
      };
    }),
});

async function markReviewRow(
  ctx: Context,
  reviewRow: ImportReviewItem,
  status: ImportReviewItemDraft["status"],
  profile: ImportCanonicalProfile,
) {
  await ctx.db
    .update(importReviewItems)
    .set({ status, canonicalProfile: profile })
    .where(
      and(
        eq(importReviewItems.firmId, reviewRow.firmId),
        eq(importReviewItems.batchId, reviewRow.batchId),
        eq(importReviewItems.id, reviewRow.id),
      ),
    )
    .returning();
}

function getRelationshipDecisionCounts(
  suggestionRows: readonly RelationshipSuggestion[],
  relationshipDecisions: ReadonlyMap<string, RelationshipSuggestionStatus>,
) {
  let accepted = 0;
  let rejected = 0;
  let pending = 0;

  for (const suggestion of suggestionRows) {
    const status = relationshipDecisions.get(suggestion.id) ?? suggestion.status;
    if (status === "accepted") accepted++;
    if (status === "rejected") rejected++;
    if (status === "pending") pending++;
  }

  return { accepted, rejected, pending };
}
