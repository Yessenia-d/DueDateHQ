import type { TaxObligation, TaxRule } from "@due-date-hq/db/schema/tax-rules";

import { calculateDueDates } from "./due-date-engine";

export type FilingProfileForMatching = {
  id: string;
  firmId: string;
  entityType: string;
  /** Jurisdictions derived from the profile: ["federal"] + profile.states */
  jurisdictions: string[];
};

export type MatchedRule = {
  obligation: TaxObligation;
  rule: TaxRule;
};

export type GeneratedTask = {
  filingProfileId: string;
  firmId: string;
  taxRuleId: string;
  title: string;
  jurisdiction: string;
  taxCategory: string;
  currentDueDate: Date;
  originalDueDate: Date;
  extensionDate: Date | null;
  taxYear: number;
  quarter: number | null;
  sourceType: "verified_rule";
  createdVia: "system_rule";
  /** Composite uniqueness key for deduplication */
  uniquenessKey: string;
};

/**
 * Match a filing profile against obligations and rules by jurisdiction x entityType.
 * Only verified rules are returned.
 */
export function matchProfileToRules(
  profile: FilingProfileForMatching,
  obligations: readonly TaxObligation[],
  rules: readonly TaxRule[],
): MatchedRule[] {
  const matched: MatchedRule[] = [];

  for (const obligation of obligations) {
    // Check jurisdiction match
    if (!profile.jurisdictions.includes(obligation.jurisdiction)) {
      continue;
    }

    // Check entity type match
    if (!obligation.entityTypes.includes(profile.entityType)) {
      continue;
    }

    // Find verified rules for this obligation
    const verifiedRules = rules.filter(
      (r) => r.obligationId === obligation.id && r.verificationStatus === "verified",
    );

    for (const rule of verifiedRules) {
      matched.push({ obligation, rule });
    }
  }

  return matched;
}

/**
 * Build a composite uniqueness key for deduplication.
 */
function buildUniquenessKey(
  filingProfileId: string,
  taxRuleId: string,
  taxYear: number,
  quarter: number | null,
): string {
  const parts = [filingProfileId, taxRuleId, String(taxYear)];
  if (quarter !== null) {
    parts.push(`Q${quarter}`);
  }
  return parts.join("::");
}

/**
 * Generate deadline tasks from matched rules for the given tax years.
 * Only verified rules produce tasks. Returns tasks with composite uniqueness keys
 * for deduplication against existing tasks.
 */
export function generateDeadlineTasks(
  profile: FilingProfileForMatching,
  matchedRules: readonly MatchedRule[],
  taxYears: readonly number[],
): GeneratedTask[] {
  const tasks: GeneratedTask[] = [];

  for (const taxYear of taxYears) {
    for (const { obligation, rule } of matchedRules) {
      const dueDates = calculateDueDates(rule.dueDateRule, taxYear);

      for (const calculated of dueDates) {
        const quarterLabel = calculated.quarter !== null ? ` Q${calculated.quarter}` : "";
        const title = `${obligation.obligationName}${quarterLabel} - TY${taxYear}`;

        tasks.push({
          filingProfileId: profile.id,
          firmId: profile.firmId,
          taxRuleId: rule.id,
          title,
          jurisdiction: obligation.jurisdiction,
          taxCategory: obligation.taxCategory,
          currentDueDate: calculated.dueDate,
          originalDueDate: calculated.dueDate,
          extensionDate: calculated.extensionDate,
          taxYear,
          quarter: calculated.quarter,
          sourceType: "verified_rule",
          createdVia: "system_rule",
          uniquenessKey: buildUniquenessKey(profile.id, rule.id, taxYear, calculated.quarter),
        });
      }
    }
  }

  return tasks;
}

/**
 * Determine which tax years to generate tasks for.
 * Current tax year + next tax year.
 *
 * Per the technical plan: "if today is 2026-05-05, the generation window
 * covers 2026 and 2027."
 */
export function getTaskGenerationTaxYears(today: Date = new Date()): [number, number] {
  const currentYear = today.getFullYear();
  return [currentYear, currentYear + 1];
}
