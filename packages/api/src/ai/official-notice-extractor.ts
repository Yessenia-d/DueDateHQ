import type {
  ConfidenceLabel,
  NoticeImpactCondition,
  NoticeWorkspaceMatchHints,
} from "@due-date-hq/db/schema/monitoring";

import type { OfficialSourceDefinition } from "../monitoring/official-source-registry";

export type OfficialNoticeExtractionInput = {
  source: OfficialSourceDefinition;
  noticeTitle: string;
  noticeText: string;
  noticeSummary?: string | null;
};

export type OfficialNoticeExtraction = {
  noticeSummary: string;
  jurisdiction: string;
  deadlineRelevance: ConfidenceLabel;
  confidenceLabel: ConfidenceLabel;
  confidenceReasons: string[];
  impactConditions: NoticeImpactCondition[];
  workspaceMatchHints: NoticeWorkspaceMatchHints;
};

const monthDatePattern =
  /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+\d{1,2}(?:,\s*\d{4})?\b/i;

export function extractOfficialNoticeImpactConditions({
  source,
  noticeTitle,
  noticeText,
  noticeSummary,
}: OfficialNoticeExtractionInput): OfficialNoticeExtraction {
  const combinedText = `${noticeTitle}\n${noticeSummary ?? ""}\n${noticeText}`;
  const normalizedText = combinedText.toLowerCase();
  const taxCategories = detectTaxCategories(normalizedText);
  const entityTypes = detectEntityTypes(normalizedText, source.jurisdiction);
  const deadlineKinds = detectDeadlineKinds(normalizedText);
  const dateText = monthDatePattern.exec(combinedText)?.[0] ?? null;
  const affectedLocation = detectAffectedLocation(combinedText, source.jurisdiction);
  const confidenceReasons = buildConfidenceReasons({
    dateText,
    deadlineKinds,
    entityTypes,
    source,
    taxCategories,
  });
  const confidenceLabel = getConfidenceLabel(confidenceReasons, deadlineKinds, dateText);
  const workspaceMatchHints = {
    jurisdictions: [source.jurisdiction],
    entityTypes,
    taxCategories,
  };

  return {
    noticeSummary: summarizeNotice(noticeSummary, noticeText, noticeTitle),
    jurisdiction: source.jurisdiction,
    deadlineRelevance: confidenceLabel,
    confidenceLabel,
    confidenceReasons,
    impactConditions: [
      {
        jurisdiction: source.jurisdiction,
        taxCategories,
        entityTypes,
        deadlineKinds,
        dateText,
        affectedLocation,
        summary: buildConditionSummary(source, deadlineKinds, taxCategories, dateText),
      },
    ],
    workspaceMatchHints,
  };
}

function detectTaxCategories(normalizedText: string): string[] {
  const categories = new Set<string>();

  if (normalizedText.includes("income tax") || normalizedText.includes("return")) {
    categories.add("income_tax");
  }
  if (normalizedText.includes("estimated tax")) {
    categories.add("estimated_tax");
  }
  if (normalizedText.includes("sales") || normalizedText.includes("use tax")) {
    categories.add("sales_use_tax");
  }
  if (normalizedText.includes("franchise")) {
    categories.add("franchise_tax");
  }
  if (normalizedText.includes("reemployment") || normalizedText.includes("unemployment")) {
    categories.add("reemployment_tax");
  }
  if (normalizedText.includes("disaster") || normalizedText.includes("relief")) {
    categories.add("disaster_tax_relief");
  }

  return categories.size > 0 ? [...categories] : ["tax_deadline"];
}

function detectEntityTypes(normalizedText: string, jurisdiction: string): string[] {
  const entityTypes = new Set<string>();

  if (
    normalizedText.includes("individual") ||
    normalizedText.includes("personal income") ||
    normalizedText.includes("form 1040")
  ) {
    entityTypes.add("individual");
  }
  if (
    normalizedText.includes("corporation") ||
    normalizedText.includes("corporate") ||
    normalizedText.includes("business") ||
    normalizedText.includes("franchise")
  ) {
    entityTypes.add("c_corp");
    entityTypes.add("s_corp");
  }
  if (normalizedText.includes("partnership")) {
    entityTypes.add("partnership");
  }
  if (normalizedText.includes("llc")) {
    entityTypes.add("llc");
  }
  if (normalizedText.includes("trust") || normalizedText.includes("estate")) {
    entityTypes.add("trust_estate");
  }

  if (entityTypes.size === 0 && jurisdiction !== "federal") {
    entityTypes.add("individual");
    entityTypes.add("c_corp");
    entityTypes.add("s_corp");
    entityTypes.add("partnership");
    entityTypes.add("llc");
  }

  return [...entityTypes];
}

function detectDeadlineKinds(normalizedText: string): string[] {
  const kinds = new Set<string>();

  if (normalizedText.includes("filing") || normalizedText.includes("return")) {
    kinds.add("filing");
  }
  if (normalizedText.includes("payment") || normalizedText.includes("pay ")) {
    kinds.add("payment");
  }
  if (normalizedText.includes("extension") || normalizedText.includes("extended")) {
    kinds.add("extension");
  }
  if (normalizedText.includes("estimated tax")) {
    kinds.add("estimated_tax");
  }
  if (
    normalizedText.includes("relief") ||
    normalizedText.includes("disaster") ||
    normalizedText.includes("postponed")
  ) {
    kinds.add("relief");
  }

  return [...kinds];
}

function detectAffectedLocation(text: string, fallbackJurisdiction: string): string | null {
  const countyMatch = /\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)*)\s+County\b/.exec(text);
  if (countyMatch?.[0]) {
    return countyMatch[0];
  }

  return fallbackJurisdiction === "federal" ? null : fallbackJurisdiction;
}

function buildConfidenceReasons({
  dateText,
  deadlineKinds,
  entityTypes,
  source,
  taxCategories,
}: {
  dateText: string | null;
  deadlineKinds: string[];
  entityTypes: string[];
  source: OfficialSourceDefinition;
  taxCategories: string[];
}) {
  const reasons = ["Official source is in the P0 allowlist."];

  if (deadlineKinds.length > 0) {
    reasons.push("Notice text contains deadline, filing, payment, extension, or relief language.");
  }
  if (taxCategories.length > 0) {
    reasons.push("Tax category hints were extracted from official notice text.");
  }
  if (entityTypes.length > 0) {
    reasons.push("Affected taxpayer or entity type hints were extracted locally.");
  }
  if (dateText) {
    reasons.push("A date or deadline reference was found in the notice text.");
  }
  if (source.jurisdiction !== "federal") {
    reasons.push(`Jurisdiction is scoped to ${source.jurisdiction}.`);
  }

  return reasons;
}

function getConfidenceLabel(
  confidenceReasons: string[],
  deadlineKinds: string[],
  dateText: string | null,
): ConfidenceLabel {
  if (deadlineKinds.length > 0 && dateText && confidenceReasons.length >= 4) {
    return "high";
  }

  if (deadlineKinds.length > 0 || confidenceReasons.length >= 3) {
    return "medium";
  }

  return "low";
}

function summarizeNotice(
  noticeSummary: string | null | undefined,
  noticeText: string,
  noticeTitle: string,
) {
  const summary = noticeSummary?.trim();
  if (summary) {
    return summary;
  }

  const compactText = noticeText.replace(/\s+/g, " ").trim();
  if (compactText) {
    return compactText.slice(0, 500);
  }

  return noticeTitle;
}

function buildConditionSummary(
  source: OfficialSourceDefinition,
  deadlineKinds: string[],
  taxCategories: string[],
  dateText: string | null,
) {
  const kindText = deadlineKinds.length > 0 ? deadlineKinds.join(", ") : "tax deadline";
  const categoryText = taxCategories.length > 0 ? taxCategories.join(", ") : "tax";
  const dateSuffix = dateText ? ` around ${dateText}` : "";

  return `${source.agencyName} notice may affect ${categoryText} ${kindText}${dateSuffix}.`;
}
