import type {
  DueDateRule,
  KnownStatus,
  VerificationRequestStatus,
  VerificationRequestType,
  VerificationStatus,
} from "@due-date-hq/db/schema/tax-rules";
import { verificationRequests } from "@due-date-hq/db/schema/tax-rules";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { requireFirmSession, type Context } from "../context";
import { publicProcedure, router } from "../index";
import { calculateDueDates } from "../lib/due-date-engine";
import { getSeedObligations, getSeedRules } from "../lib/seed-tax-data";

// ── Response Types ──

export type CoverageObligationItem = {
  obligationId: string;
  jurisdiction: string;
  jurisdictionLevel: string;
  agencyName: string;
  taxCategory: string;
  obligationName: string;
  entityTypes: string[];
  knownStatus: KnownStatus;
  verificationStatus: VerificationStatus | null;
  ruleId: string | null;
  ruleSummary: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  lastVerifiedAt: string | null;
  sourceLastCheckedAt: string | null;
  sourceLastChangedAt: string | null;
  currentVersion: number | null;
};

export type CoverageJurisdictionGroup = {
  jurisdiction: string;
  jurisdictionLevel: string;
  agencyName: string;
  obligations: CoverageObligationItem[];
  counts: {
    total: number;
    verified: number;
    needsReview: number;
    sourceChanged: number;
    unsupported: number;
    noRule: number;
  };
};

export type CoverageMatrixResponse = {
  generatedAt: string;
  groups: CoverageJurisdictionGroup[];
  summary: {
    totalObligations: number;
    totalVerified: number;
    totalNeedsReview: number;
    totalSourceChanged: number;
    totalUnsupported: number;
    totalNoRule: number;
    jurisdictionCount: number;
  };
  supportedSources: string[];
};

export type CoverageRuleDetail = {
  obligationId: string;
  obligationName: string;
  jurisdiction: string;
  jurisdictionLevel: string;
  agencyName: string;
  taxCategory: string;
  entityTypes: string[];
  ruleId: string;
  ruleSummary: string;
  dueDateRule: DueDateRule;
  verificationStatus: VerificationStatus;
  sourceName: string | null;
  sourceUrl: string | null;
  lastVerifiedAt: string | null;
  sourceLastCheckedAt: string | null;
  sourceLastChangedAt: string | null;
  verificationNotes: string | null;
  currentVersion: number;
  /** Example calculated due dates for current + next tax year */
  exampleDueDates: Array<{
    taxYear: number;
    dueDate: string;
    extensionDate: string | null;
    quarter: number | null;
  }>;
};

// ── Helpers ──

function toISOOrNull(date: Date | null | undefined): string | null {
  return date ? date.toISOString() : null;
}

function getCoverageStatus(
  knownStatus: KnownStatus,
  rule: ReturnType<typeof getSeedRules>[number] | undefined,
): VerificationStatus | null {
  if (rule) {
    return rule.verificationStatus;
  }

  if (knownStatus === "unsupported") {
    return "unsupported";
  }

  return null;
}

function buildCoverageItems(): CoverageObligationItem[] {
  const obligations = getSeedObligations();
  const rules = getSeedRules();

  const rulesByObligation = new Map<string, (typeof rules)[number]>();
  for (const rule of rules) {
    rulesByObligation.set(rule.obligationId, rule);
  }

  return obligations.map((obl) => {
    const rule = rulesByObligation.get(obl.id);
    const verificationStatus = getCoverageStatus(obl.knownStatus, rule);

    return {
      obligationId: obl.id,
      jurisdiction: obl.jurisdiction,
      jurisdictionLevel: obl.jurisdictionLevel,
      agencyName: obl.agencyName,
      taxCategory: obl.taxCategory,
      obligationName: obl.obligationName,
      entityTypes: obl.entityTypes,
      knownStatus: obl.knownStatus,
      verificationStatus,
      ruleId: rule?.id ?? null,
      ruleSummary: rule?.ruleSummary ?? null,
      sourceName: rule?.sourceName ?? null,
      sourceUrl: rule?.sourceUrl ?? null,
      lastVerifiedAt: toISOOrNull(rule?.lastVerifiedAt),
      sourceLastCheckedAt: toISOOrNull(rule?.sourceLastCheckedAt),
      sourceLastChangedAt: toISOOrNull(rule?.sourceLastChangedAt),
      currentVersion: rule?.currentVersion ?? null,
    };
  });
}

function getActionableObligation(obligationId: string): CoverageObligationItem {
  const item = buildCoverageItems().find((obl) => obl.obligationId === obligationId);

  if (!item) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Coverage obligation was not found.",
    });
  }

  if (item.verificationStatus === "verified") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Verified obligations already have DueDateHQ coverage.",
    });
  }

  return item;
}

async function recordVerificationRequest({
  ctx,
  item,
  requestType,
  status,
  message,
}: {
  ctx: Context;
  item: CoverageObligationItem;
  requestType: VerificationRequestType;
  status: VerificationRequestStatus;
  message: string | null;
}) {
  const session = requireFirmSession(ctx);
  const now = new Date();
  const requestId = crypto.randomUUID();

  await ctx.db.insert(verificationRequests).values({
    id: requestId,
    firmId: session.firm.id,
    requestType,
    obligationId: item.obligationId,
    taxRuleId: item.ruleId,
    deadlineTaskId: null,
    status,
    message,
    createdAt: now,
    updatedAt: now,
  });

  return {
    requestId,
    status,
  };
}

// ── Router ──

export const coverageRouter = router({
  /**
   * Return all obligations grouped by jurisdiction with rule status.
   */
  matrix: publicProcedure.query((): CoverageMatrixResponse => {
    const items = buildCoverageItems();

    // Group by jurisdiction
    const groupMap = new Map<string, CoverageObligationItem[]>();
    for (const item of items) {
      const key = item.jurisdiction;
      const existing = groupMap.get(key);
      if (existing) {
        existing.push(item);
      } else {
        groupMap.set(key, [item]);
      }
    }

    const groups: CoverageJurisdictionGroup[] = [];
    let totalVerified = 0;
    let totalNeedsReview = 0;
    let totalSourceChanged = 0;
    let totalUnsupported = 0;
    let totalNoRule = 0;

    for (const [jurisdiction, oblItems] of groupMap) {
      const first = oblItems[0];
      if (!first) continue;

      let verified = 0;
      let needsReview = 0;
      let sourceChanged = 0;
      let unsupported = 0;
      let noRule = 0;

      for (const item of oblItems) {
        switch (item.verificationStatus) {
          case "verified":
            verified++;
            break;
          case "needs_review":
            needsReview++;
            break;
          case "source_changed":
            sourceChanged++;
            break;
          case "unsupported":
            unsupported++;
            break;
          default:
            noRule++;
            break;
        }
      }

      totalVerified += verified;
      totalNeedsReview += needsReview;
      totalSourceChanged += sourceChanged;
      totalUnsupported += unsupported;
      totalNoRule += noRule;

      groups.push({
        jurisdiction,
        jurisdictionLevel: first.jurisdictionLevel,
        agencyName: first.agencyName,
        obligations: oblItems,
        counts: {
          total: oblItems.length,
          verified,
          needsReview,
          sourceChanged,
          unsupported,
          noRule,
        },
      });
    }

    // Sort: federal first, then alphabetical
    groups.sort((a, b) => {
      if (a.jurisdictionLevel === "federal" && b.jurisdictionLevel !== "federal") return -1;
      if (a.jurisdictionLevel !== "federal" && b.jurisdictionLevel === "federal") return 1;
      return a.jurisdiction.localeCompare(b.jurisdiction);
    });

    return {
      generatedAt: new Date().toISOString(),
      groups,
      summary: {
        totalObligations: items.length,
        totalVerified,
        totalNeedsReview,
        totalSourceChanged,
        totalUnsupported,
        totalNoRule,
        jurisdictionCount: groups.length,
      },
      supportedSources: [
        "IRS (Internal Revenue Service)",
        "California Franchise Tax Board",
        "New York Tax Department",
        "Texas Comptroller of Public Accounts",
        "Florida Department of Revenue",
      ],
    };
  }),

  /**
   * Return detailed rule evidence for a specific rule.
   */
  getRule: publicProcedure
    .input(z.object({ ruleId: z.string() }))
    .query(({ input }): CoverageRuleDetail | null => {
      const obligations = getSeedObligations();
      const rules = getSeedRules();

      const rule = rules.find((r) => r.id === input.ruleId);
      if (!rule) return null;

      const obligation = obligations.find((o) => o.id === rule.obligationId);
      if (!obligation) return null;

      // Calculate example due dates for current and next tax year
      const currentYear = new Date().getFullYear();
      const taxYears = [currentYear, currentYear + 1];
      const exampleDueDates: CoverageRuleDetail["exampleDueDates"] = [];

      for (const taxYear of taxYears) {
        const calculated = calculateDueDates(rule.dueDateRule, taxYear);
        for (const calc of calculated) {
          exampleDueDates.push({
            taxYear,
            dueDate: calc.dueDate.toISOString(),
            extensionDate: calc.extensionDate?.toISOString() ?? null,
            quarter: calc.quarter,
          });
        }
      }

      return {
        obligationId: obligation.id,
        obligationName: obligation.obligationName,
        jurisdiction: obligation.jurisdiction,
        jurisdictionLevel: obligation.jurisdictionLevel,
        agencyName: obligation.agencyName,
        taxCategory: obligation.taxCategory,
        entityTypes: obligation.entityTypes,
        ruleId: rule.id,
        ruleSummary: rule.ruleSummary,
        dueDateRule: rule.dueDateRule,
        verificationStatus: rule.verificationStatus,
        sourceName: rule.sourceName,
        sourceUrl: rule.sourceUrl,
        lastVerifiedAt: toISOOrNull(rule.lastVerifiedAt),
        sourceLastCheckedAt: toISOOrNull(rule.sourceLastCheckedAt),
        sourceLastChangedAt: toISOOrNull(rule.sourceLastChangedAt),
        verificationNotes: rule.verificationNotes,
        currentVersion: rule.currentVersion,
        exampleDueDates,
      };
    }),

  /**
   * Create a verification/coverage request.
   */
  requestCoverage: publicProcedure
    .input(
      z.object({
        obligationId: z.string(),
        message: z.string().trim().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const item = getActionableObligation(input.obligationId);
      const recorded = await recordVerificationRequest({
        ctx,
        item,
        requestType:
          item.verificationStatus === "source_changed" ? "source_changed" : "user_requested",
        status: "open",
        message: input.message ?? null,
      });

      return {
        success: true,
        ...recorded,
        message: `Coverage request recorded for ${item.obligationName}. DueDateHQ will review.`,
      };
    }),

  /**
   * Start a user-provided deadline path from a coverage gap without creating an
   * official DueDateHQ deadline task.
   */
  addUserProvidedDeadlineFromGap: publicProcedure
    .input(z.object({ obligationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const item = getActionableObligation(input.obligationId);
      const recorded = await recordVerificationRequest({
        ctx,
        item,
        requestType: "manual_deadline",
        status: "open",
        message: `User started a user-provided deadline from coverage for ${item.obligationName}.`,
      });

      return {
        success: true,
        ...recorded,
        nextPath: `/clients/new?coverageObligationId=${encodeURIComponent(item.obligationId)}`,
        message: "Start a user-provided deadline. It will not be marked as DueDateHQ Verified.",
      };
    }),

  /**
   * Dismiss a coverage gap for now.
   */
  dismissGapForNow: publicProcedure
    .input(z.object({ obligationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const item = getActionableObligation(input.obligationId);
      const recorded = await recordVerificationRequest({
        ctx,
        item,
        requestType: "coverage_gap_dismissed",
        status: "closed",
        message: `Coverage gap dismissed for now: ${item.obligationName}.`,
      });

      return {
        success: true,
        ...recorded,
        message: `Coverage gap for ${item.obligationName} dismissed for now.`,
      };
    }),
});
