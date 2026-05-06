import type {
  ClientRelationship,
  FilingProfile,
} from "@due-date-hq/db/schema/deadline-domain";
import {
  importReviewProblemTypes,
  type DuplicateCandidateAction,
  type DuplicateCandidateResolution,
  type ImportCanonicalProfile,
  type ImportReviewProblemType,
  type ImportReviewStatus,
  type RelationshipSuggestionAction,
  type RelationshipSuggestionStatus,
} from "@due-date-hq/db/schema/imports";
import type {
  TaxObligation,
  TaxRule,
  VerificationStatus,
} from "@due-date-hq/db/schema/tax-rules";

import type { CanonicalImportRow } from "../adapters/types";

export type ImportReviewItemDraft = {
  id: string;
  sourceRowId: string;
  rowIndex: number;
  status: ImportReviewStatus;
  problemTypes: ImportReviewProblemType[];
  canonicalProfile: ImportCanonicalProfile;
  sourceFields: Record<string, string>;
  messages: string[];
};

export type DuplicateCandidateDraft = {
  id: string;
  incomingReviewItemId: string;
  existingClientRelationshipId: string | null;
  matchedFields: string[];
  differingFields: Record<string, { incoming: string | null; existing: string | null }>;
  suggestedAction: DuplicateCandidateAction;
  resolution: DuplicateCandidateResolution;
};

export type RelationshipSuggestionDraft = {
  id: string;
  incomingReviewItemId: string;
  suggestedClientRelationshipId: string | null;
  reason: string;
  suggestedAction: RelationshipSuggestionAction;
  status: RelationshipSuggestionStatus;
};

export type ImportReviewBuildResult = {
  items: ImportReviewItemDraft[];
  duplicateCandidates: DuplicateCandidateDraft[];
  relationshipSuggestions: RelationshipSuggestionDraft[];
};

export type ReviewProblemGroup = {
  problemType: ImportReviewProblemType;
  label: string;
  count: number;
  profiles: Array<{
    reviewItemId: string;
    clientName: string | null;
    sourceRowId: string;
    messages: string[];
  }>;
};

export type CoverageIssue = {
  obligationId: string;
  obligationName: string;
  jurisdiction: string;
  taxCategory: string;
  verificationStatus: VerificationStatus | "coverage_gap";
};

export type ProfileCoverageSummary = {
  verifiedRuleCount: number;
  generatedJurisdictions: string[];
  needsReviewObligations: CoverageIssue[];
  coverageGapObligations: CoverageIssue[];
  unsupportedObligations: CoverageIssue[];
};

const problemLabels: Record<ImportReviewProblemType, string> = {
  missing_client_name: "Missing client name",
  missing_entity_type: "Missing entity type",
  fuzzy_entity_type: "Fuzzy entity type",
  missing_state: "Missing state",
  missing_tax_id: "Missing tax ID",
  duplicate_candidate: "Likely duplicate",
  relationship_suggestion: "Relationship suggestion",
  coverage_gap: "Coverage gap",
  unsupported_obligation: "Unsupported obligation",
};

function normalizeKey(value: string | null | undefined): string {
  return value?.trim().toLowerCase().replace(/\s+/g, " ") ?? "";
}

function normalizeTaxId(value: string | null | undefined): string {
  return value?.replace(/\D/g, "") ?? "";
}

function appendProblem(
  item: ImportReviewItemDraft,
  problemType: ImportReviewProblemType,
  message: string,
) {
  if (!item.problemTypes.includes(problemType)) {
    item.problemTypes.push(problemType);
  }
  if (!item.messages.includes(message)) {
    item.messages.push(message);
  }
  item.status = "needs_review";
}

function getExistingClientMaps(existingClientRelationships: readonly ClientRelationship[]) {
  const byId = new Map<string, ClientRelationship>();
  const byName = new Map<string, ClientRelationship>();
  const bySourceClientId = new Map<string, ClientRelationship>();

  for (const client of existingClientRelationships) {
    byId.set(client.id, client);
    byName.set(normalizeKey(client.displayName), client);
    if (client.sourceClientId) {
      bySourceClientId.set(
        `${client.sourceSystem}:${normalizeKey(client.sourceClientId)}`,
        client,
      );
    }
  }

  return { byId, byName, bySourceClientId };
}

function findDuplicateCandidate({
  clientById,
  clientByName,
  clientBySourceClientId,
  existingFilingProfiles,
  profile,
}: {
  clientById: ReadonlyMap<string, ClientRelationship>;
  clientByName: ReadonlyMap<string, ClientRelationship>;
  clientBySourceClientId: ReadonlyMap<string, ClientRelationship>;
  existingFilingProfiles: readonly FilingProfile[];
  profile: ImportCanonicalProfile;
}) {
  const matchedFields: string[] = [];
  let matchedProfile: FilingProfile | null = null;
  let matchedClient: ClientRelationship | null = null;

  if (
    profile.sourceClientId &&
    clientBySourceClientId.has(
      `${profile.sourceSystem}:${normalizeKey(profile.sourceClientId)}`,
    )
  ) {
    return null;
  }

  const clientNameKey = normalizeKey(profile.clientName);
  const existingClient = clientNameKey ? clientByName.get(clientNameKey) : undefined;
  if (existingClient) {
    matchedFields.push("client_name");
    matchedClient = existingClient;
  }

  const ein = normalizeTaxId(profile.ein);
  if (ein) {
    matchedProfile =
      existingFilingProfiles.find((existing) => normalizeTaxId(existing.ein) === ein) ?? null;
    if (matchedProfile) {
      matchedFields.push("ein");
      matchedClient = clientById.get(matchedProfile.clientRelationshipId) ?? matchedClient;
    }
  }

  const ssnLast4 = normalizeTaxId(profile.ssnLast4);
  if (ssnLast4) {
    matchedProfile =
      existingFilingProfiles.find((existing) => normalizeTaxId(existing.ssnLast4) === ssnLast4) ??
      matchedProfile;
    if (matchedProfile && !matchedFields.includes("ssn_last4")) {
      matchedFields.push("ssn_last4");
      matchedClient = clientById.get(matchedProfile.clientRelationshipId) ?? matchedClient;
    }
  }

  if (!matchedClient || matchedFields.length === 0) {
    return null;
  }

  const differingFields: DuplicateCandidateDraft["differingFields"] = {};
  if (profile.clientName && profile.clientName !== matchedClient.displayName) {
    differingFields.client_name = {
      incoming: profile.clientName,
      existing: matchedClient.displayName,
    };
  }
  if (matchedProfile && profile.entityType && profile.entityType !== matchedProfile.entityType) {
    differingFields.entity_type = {
      incoming: profile.entityType,
      existing: matchedProfile.entityType,
    };
  }
  if (matchedProfile && profile.states.join(",") !== matchedProfile.states.join(",")) {
    differingFields.states = {
      incoming: profile.states.join(", ") || null,
      existing: matchedProfile.states.join(", ") || null,
    };
  }

  return {
    existingClientRelationshipId: matchedClient.id,
    matchedFields,
    differingFields,
  };
}

export function buildImportReview({
  rows,
  existingClientRelationships,
  existingFilingProfiles,
}: {
  rows: readonly CanonicalImportRow[];
  existingClientRelationships: readonly ClientRelationship[];
  existingFilingProfiles: readonly FilingProfile[];
}): ImportReviewBuildResult {
  const clientMaps = getExistingClientMaps(existingClientRelationships);
  const rowByClientName = new Map<string, CanonicalImportRow>();
  const items = rows.map((row): ImportReviewItemDraft => {
    if (row.profile.clientName) {
      rowByClientName.set(normalizeKey(row.profile.clientName), row);
    }

    return {
      id: row.reviewItemId,
      sourceRowId: row.sourceRowId,
      rowIndex: row.rowIndex,
      status: row.problemTypes.length > 0 ? "needs_review" : "accepted",
      problemTypes: [...row.problemTypes],
      canonicalProfile: row.profile,
      sourceFields: row.sourceFields,
      messages: [...row.messages],
    };
  });
  const itemById = new Map(items.map((item) => [item.id, item]));
  const duplicateCandidates: DuplicateCandidateDraft[] = [];
  const relationshipSuggestions: RelationshipSuggestionDraft[] = [];

  for (const row of rows) {
    const item = itemById.get(row.reviewItemId);
    if (!item) continue;

    const duplicate = findDuplicateCandidate({
      clientById: clientMaps.byId,
      clientByName: clientMaps.byName,
      clientBySourceClientId: clientMaps.bySourceClientId,
      existingFilingProfiles,
      profile: row.profile,
    });

    if (duplicate) {
      duplicateCandidates.push({
        id: crypto.randomUUID(),
        incomingReviewItemId: row.reviewItemId,
        existingClientRelationshipId: duplicate.existingClientRelationshipId,
        matchedFields: duplicate.matchedFields,
        differingFields: duplicate.differingFields,
        suggestedAction: "update_existing",
        resolution: "pending",
      });
      appendProblem(
        item,
        "duplicate_candidate",
        "Likely duplicate found. Choose create, update existing, or skip before commit.",
      );
    }

    const relationshipKey = normalizeKey(row.relationshipName);
    if (relationshipKey) {
      const existingClient = clientMaps.byName.get(relationshipKey);
      const batchTarget = rowByClientName.get(relationshipKey);
      const targetName = existingClient?.displayName ?? batchTarget?.profile.clientName ?? row.relationshipName;
      const suggestedAction: RelationshipSuggestionAction =
        existingClient || batchTarget ? "confirm_relationship" : "keep_separate";

      relationshipSuggestions.push({
        id: crypto.randomUUID(),
        incomingReviewItemId: row.reviewItemId,
        suggestedClientRelationshipId: existingClient?.id ?? null,
        reason: `${row.profile.clientName ?? "Imported profile"} is linked to ${targetName}; CPA confirmation is required before relationship handling.`,
        suggestedAction,
        status: "pending",
      });
      appendProblem(
        item,
        "relationship_suggestion",
        "Source export linked this profile to another client relationship. Confirm or reject the suggestion.",
      );
    }
  }

  return { items, duplicateCandidates, relationshipSuggestions };
}

export function buildReviewGroups(items: readonly ImportReviewItemDraft[]): ReviewProblemGroup[] {
  const groups: ReviewProblemGroup[] = [];

  for (const problemType of importReviewProblemTypes) {
    const profiles = items
      .filter((item) => item.problemTypes.includes(problemType))
      .map((item) => ({
        reviewItemId: item.id,
        clientName: item.canonicalProfile.clientName,
        sourceRowId: item.sourceRowId,
        messages: item.messages,
      }));

    if (profiles.length > 0) {
      groups.push({
        problemType,
        label: problemLabels[problemType],
        count: profiles.length,
        profiles,
      });
    }
  }

  return groups;
}

export function summarizeProfileCoverage(
  profile: {
    entityType: string | null;
    states: readonly string[];
  },
  obligations: readonly TaxObligation[],
  rules: readonly TaxRule[],
): ProfileCoverageSummary {
  const jurisdictions = ["federal", ...profile.states];
  const generatedJurisdictions = new Set<string>();
  const needsReviewObligations: CoverageIssue[] = [];
  const coverageGapObligations: CoverageIssue[] = [];
  const unsupportedObligations: CoverageIssue[] = [];
  let verifiedRuleCount = 0;

  if (!profile.entityType) {
    return {
      verifiedRuleCount,
      generatedJurisdictions: [],
      needsReviewObligations,
      coverageGapObligations,
      unsupportedObligations,
    };
  }

  for (const obligation of obligations) {
    if (!jurisdictions.includes(obligation.jurisdiction)) continue;
    if (!obligation.entityTypes.includes(profile.entityType)) continue;

    const obligationRules = rules.filter((rule) => rule.obligationId === obligation.id);
    const verifiedRules = obligationRules.filter(
      (rule) => rule.verificationStatus === "verified",
    );

    if (verifiedRules.length > 0) {
      verifiedRuleCount += verifiedRules.length;
      generatedJurisdictions.add(obligation.jurisdiction);
      continue;
    }

    if (
      obligation.knownStatus === "unsupported" ||
      obligationRules.some((rule) => rule.verificationStatus === "unsupported")
    ) {
      unsupportedObligations.push(toCoverageIssue(obligation, "unsupported"));
      continue;
    }

    if (obligationRules.length === 0) {
      coverageGapObligations.push(toCoverageIssue(obligation, "coverage_gap"));
      continue;
    }

    needsReviewObligations.push(
      toCoverageIssue(obligation, obligationRules[0]?.verificationStatus ?? "needs_review"),
    );
  }

  return {
    verifiedRuleCount,
    generatedJurisdictions: [...generatedJurisdictions],
    needsReviewObligations,
    coverageGapObligations,
    unsupportedObligations,
  };
}

function toCoverageIssue(
  obligation: TaxObligation,
  verificationStatus: VerificationStatus | "coverage_gap",
): CoverageIssue {
  return {
    obligationId: obligation.id,
    obligationName: obligation.obligationName,
    jurisdiction: obligation.jurisdiction,
    taxCategory: obligation.taxCategory,
    verificationStatus,
  };
}
