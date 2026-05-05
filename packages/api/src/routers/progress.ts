import type {
  FeatureProgressPriority,
  FeatureProgressStatus,
} from "@due-date-hq/db/schema/feature-progress";
import {
  featureProgressPriorities,
  featureProgressStatuses,
} from "@due-date-hq/db/schema/feature-progress";

import { publicProcedure, router } from "../index";

export { featureProgressStatuses };

const seedUpdatedAt = "2026-05-05T00:00:00.000Z";

export const featureProgressCategories = [
  "Auth",
  "CSV imports",
  "Manual entry",
  "Tax obligation library",
  "Tax rule verification",
  "Official source monitoring",
  "Verification queue/proposals",
  "Coverage matrix",
  "Monday triage dashboard",
  "Cloudflare deployment",
  "GTM",
  "Docs/specs",
] as const;

export type FeatureProgressCategory = (typeof featureProgressCategories)[number];

export type FeatureProgressItem = {
  id: string;
  category: FeatureProgressCategory;
  name: string;
  description: string;
  specPath: string;
  status: FeatureProgressStatus;
  priority: FeatureProgressPriority;
  updatedAt: string;
};

export type FeatureProgressSummary = {
  totalCount: number;
  completedCount: number;
  percentComplete: number;
};

export type FeatureProgressGroup = FeatureProgressSummary & {
  category: FeatureProgressCategory;
  statusCounts: Record<FeatureProgressStatus, number>;
  items: FeatureProgressItem[];
};

export type FeatureProgressList = {
  generatedAt: string;
  statuses: typeof featureProgressStatuses;
  priorities: typeof featureProgressPriorities;
  overall: FeatureProgressSummary & {
    statusCounts: Record<FeatureProgressStatus, number>;
  };
  p0Readiness: FeatureProgressSummary;
  groups: FeatureProgressGroup[];
};

const priorityRank: Record<FeatureProgressPriority, number> = {
  p0: 0,
  p1: 1,
  p2: 2,
};

export const seedFeatureProgressItems = [
  {
    id: "auth-firm-workspace",
    category: "Auth",
    name: "Auth and firm workspace",
    description: "Protected CPA workspace shell, firm ownership, and auth-ready session boundary.",
    specPath: "specs/auth.md",
    status: "done",
    priority: "p0",
    updatedAt: seedUpdatedAt,
  },
  {
    id: "csv-import-profile-review",
    category: "CSV imports",
    name: "CSV import with profile review",
    description: "Source adapter import preview, mapping, row review, and commit summary.",
    specPath: "specs/csv-imports.md",
    status: "not_started",
    priority: "p1",
    updatedAt: seedUpdatedAt,
  },
  {
    id: "manual-client-deadline-entry",
    category: "Manual entry",
    name: "Manual client profile and deadline entry",
    description: "CPA-entered client profiles and user-provided deadlines with clear trust labels.",
    specPath: "specs/manual-client-and-deadline-entry.md",
    status: "not_started",
    priority: "p1",
    updatedAt: seedUpdatedAt,
  },
  {
    id: "tax-obligation-library",
    category: "Tax obligation library",
    name: "Tax obligation library",
    description: "Known obligation coverage across jurisdiction, agency, tax category, and entity type.",
    specPath: "specs/tax-obligation-library.md",
    status: "not_started",
    priority: "p0",
    updatedAt: seedUpdatedAt,
  },
  {
    id: "tax-rule-verification",
    category: "Tax rule verification",
    name: "Tax rule verification",
    description: "Verification statuses, source evidence, and reviewer actions for trusted tax rules.",
    specPath: "specs/tax-rule-verification.md",
    status: "not_started",
    priority: "p1",
    updatedAt: seedUpdatedAt,
  },
  {
    id: "official-source-monitoring",
    category: "Official source monitoring",
    name: "Official source monitoring",
    description: "Official source snapshots and change detection without automatic workspace mutation.",
    specPath: "specs/official-source-monitoring.md",
    status: "not_started",
    priority: "p1",
    updatedAt: seedUpdatedAt,
  },
  {
    id: "notice-proposal-review",
    category: "Verification queue/proposals",
    name: "Notice proposal review and audit workflow",
    description: "Reviewer-visible proposal diffs and approval audit trail before workspace changes.",
    specPath: "specs/official-source-monitoring.md",
    status: "not_started",
    priority: "p1",
    updatedAt: seedUpdatedAt,
  },
  {
    id: "coverage-matrix",
    category: "Coverage matrix",
    name: "Coverage matrix",
    description: "Transparent obligation coverage gaps, unsupported items, and verification statuses.",
    specPath: "specs/coverage-matrix.md",
    status: "not_started",
    priority: "p1",
    updatedAt: seedUpdatedAt,
  },
  {
    id: "monday-triage-dashboard",
    category: "Monday triage dashboard",
    name: "Monday triage dashboard",
    description: "Default CPA work surface for deadline urgency, task status, and evidence scanning.",
    specPath: "specs/monday-triage-dashboard.md",
    status: "not_started",
    priority: "p0",
    updatedAt: seedUpdatedAt,
  },
  {
    id: "cloudflare-beta-deployment",
    category: "Cloudflare deployment",
    name: "Cloudflare beta deployment",
    description: "Cloudflare-hosted Beta deployment path for server, web app, and D1 resources.",
    specPath: "specs/cloudflare-deployment.md",
    status: "not_started",
    priority: "p2",
    updatedAt: seedUpdatedAt,
  },
  {
    id: "gtm-readiness",
    category: "GTM",
    name: "GTM readiness",
    description: "Beta positioning, reviewer handoff, and launch-readiness material.",
    specPath: "specs/gtm.md",
    status: "blocked",
    priority: "p2",
    updatedAt: seedUpdatedAt,
  },
  {
    id: "docs-specs",
    category: "Docs/specs",
    name: "Docs and specs",
    description: "Product and technical SDD specs for the Beta implementation path.",
    specPath: "specs/README.md",
    status: "in_progress",
    priority: "p2",
    updatedAt: seedUpdatedAt,
  },
  {
    id: "feature-progress-page",
    category: "Docs/specs",
    name: "Feature progress page",
    description: "Internal reviewer progress surface grouped by product area.",
    specPath: "specs/feature-progress-page.md",
    status: "done",
    priority: "p2",
    updatedAt: seedUpdatedAt,
  },
] as const satisfies readonly FeatureProgressItem[];

function createEmptyStatusCounts() {
  return Object.fromEntries(featureProgressStatuses.map((status) => [status, 0])) as Record<
    FeatureProgressStatus,
    number
  >;
}

function summarize(items: readonly FeatureProgressItem[]): FeatureProgressSummary {
  const totalCount = items.length;
  const completedCount = items.filter((item) => item.status === "done").length;

  return {
    totalCount,
    completedCount,
    percentComplete: totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100),
  };
}

function countStatuses(items: readonly FeatureProgressItem[]) {
  const statusCounts = createEmptyStatusCounts();

  for (const item of items) {
    statusCounts[item.status] += 1;
  }

  return statusCounts;
}

function sortItemsByReviewOrder(items: readonly FeatureProgressItem[]) {
  return [...items].sort((left, right) => {
    const priorityDifference = priorityRank[left.priority] - priorityRank[right.priority];

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    return left.name.localeCompare(right.name);
  });
}

export function listFeatureProgress(): FeatureProgressList {
  const groupsByCategory = new Map<FeatureProgressCategory, FeatureProgressGroup>();

  for (const category of featureProgressCategories) {
    const items = sortItemsByReviewOrder(
      seedFeatureProgressItems.filter((item) => item.category === category),
    );
    groupsByCategory.set(category, {
      category,
      ...summarize(items),
      statusCounts: countStatuses(items),
      items,
    });
  }

  const allItems = sortItemsByReviewOrder(seedFeatureProgressItems);
  const p0Items = allItems.filter((item) => item.priority === "p0");

  return {
    generatedAt: new Date().toISOString(),
    statuses: featureProgressStatuses,
    priorities: featureProgressPriorities,
    overall: {
      ...summarize(allItems),
      statusCounts: countStatuses(allItems),
    },
    p0Readiness: summarize(p0Items),
    groups: [...groupsByCategory.values()].filter((group) => group.items.length > 0),
  };
}

export const progressRouter = router({
  list: publicProcedure.query(() => listFeatureProgress()),
});
