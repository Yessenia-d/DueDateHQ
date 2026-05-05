import { and, asc, eq, inArray } from "drizzle-orm";
import {
  clientRelationships,
  deadlineDateEvents,
  deadlineTaskPriorities,
  deadlineTaskStatuses,
  deadlineTasks,
  filingProfileEntityTypes,
  filingProfiles,
  type ClientRelationship,
  type DeadlineDateEvent,
  type DeadlineTask,
  type FilingProfile,
} from "@due-date-hq/db/schema/deadline-domain";
import { taxRules, type TaxRule } from "@due-date-hq/db/schema/tax-rules";
import { z } from "zod";

import { requireFirmSession, type Context } from "../context";
import { publicProcedure, router } from "../index";
import {
  ENTERED_DEADLINE_LABEL,
  ENTERED_DEADLINE_REFERENCE_LABEL,
  ENTERED_DEADLINE_TRUST_LABEL,
} from "../lib/deadline-labels";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const dashboardHorizonValues = [
  "all",
  "overdue",
  "due_this_week",
  "this_month",
  "long_range",
] as const;

export const dashboardSortValues = [
  "smart_priority",
  "due_date",
  "client",
  "priority",
] as const;

export const dashboardVerificationStatuses = [
  "verified",
  "needs_review",
  "source_changed",
  "unsupported",
  "entered_deadline",
] as const;

export type DashboardHorizon = (typeof dashboardHorizonValues)[number];
export type DashboardTaskHorizon = Exclude<DashboardHorizon, "all">;
export type DashboardSort = (typeof dashboardSortValues)[number];
export type DashboardVerificationStatus = (typeof dashboardVerificationStatuses)[number];
export type DashboardUrgency =
  | "overdue"
  | "due_today"
  | "due_this_week"
  | "due_this_month"
  | "long_range";

export const dateStringSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format.")
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(`${value}T00:00:00.000Z`);

    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() + 1 === month &&
      date.getUTCDate() === day
    );
  }, "Use a real calendar date.");

export const dashboardSummaryFiltersSchema = z.object({
  horizon: z.enum(dashboardHorizonValues).default("all"),
  clientRelationshipId: z.string().trim().min(1).optional(),
  filingProfileId: z.string().trim().min(1).optional(),
  obligation: z.string().trim().min(1).optional(),
  jurisdiction: z.string().trim().min(1).optional(),
  entityType: z.enum(filingProfileEntityTypes).optional(),
  taxCategory: z.string().trim().min(1).optional(),
  taskStatus: z.enum(deadlineTaskStatuses).optional(),
  verificationStatus: z.enum(dashboardVerificationStatuses).optional(),
  sort: z.enum(dashboardSortValues).default("smart_priority"),
  today: dateStringSchema.optional(),
});

export type DashboardSummaryInput = z.infer<typeof dashboardSummaryFiltersSchema>;

export type DashboardTaskRow = {
  id: string;
  clientRelationship: {
    id: string;
    displayName: string;
    relationshipType: ClientRelationship["relationshipType"];
  };
  filingProfile: {
    id: string;
    displayName: string;
    entityType: FilingProfile["entityType"];
    states: string[];
  };
  title: string;
  jurisdiction: string;
  taxCategory: string;
  currentDueDate: string;
  originalDueDate: string | null;
  firmTargetDate: string | null;
  hasOriginalDueDate: boolean;
  hasDateHistory: boolean;
  isExtended: boolean;
  daysRemaining: number;
  status: DeadlineTask["status"];
  priority: DeadlineTask["priority"];
  sourceType: DeadlineTask["sourceType"];
  verificationStatus: DashboardVerificationStatus;
  verificationLabel: string;
  urgency: DashboardUrgency;
  horizon: DashboardTaskHorizon;
  smartPriorityScore: number;
  sourceName: string | null;
  sourceUrl: string | null;
  enteredDeadlineReferenceNote: string | null;
  lastVerifiedAt: string | null;
  sourceLastCheckedAt: string | null;
  sourceLastChangedAt: string | null;
};

export type DashboardSection = {
  id: DashboardTaskHorizon;
  label: string;
  count: number;
  tasks: DashboardTaskRow[];
};

export type DashboardSummaryResponse = {
  generatedAt: string;
  today: string;
  filters: DashboardSummaryInput;
  sections: DashboardSection[];
  allTasks: DashboardTaskRow[];
  summary: {
    total: number;
    overdue: number;
    dueToday: number;
    dueThisWeek: number;
    dueThisMonth: number;
    longRange: number;
    done: number;
    verified: number;
    sourceChanged: number;
    enteredDeadline: number;
  };
  filterOptions: {
    clientRelationships: Array<{ id: string; label: string }>;
    filingProfiles: Array<{ id: string; label: string; clientRelationshipId: string }>;
    obligations: string[];
    jurisdictions: string[];
    entityTypes: FilingProfile["entityType"][];
    taxCategories: string[];
    taskStatuses: typeof deadlineTaskStatuses;
    verificationStatuses: typeof dashboardVerificationStatuses;
  };
};

type DashboardJoinedRow = {
  task: DeadlineTask;
  client: ClientRelationship;
  profile: FilingProfile;
  rule: TaxRule | null;
};

function normalizeDashboardInput(input: DashboardSummaryInput | undefined): DashboardSummaryInput {
  return {
    horizon: input?.horizon ?? "all",
    clientRelationshipId: input?.clientRelationshipId,
    filingProfileId: input?.filingProfileId,
    obligation: input?.obligation,
    jurisdiction: input?.jurisdiction,
    entityType: input?.entityType,
    taxCategory: input?.taxCategory,
    taskStatus: input?.taskStatus,
    verificationStatus: input?.verificationStatus,
    sort: input?.sort ?? "smart_priority",
    today: input?.today,
  };
}

function dateToUtcMs(value: string): number {
  return new Date(`${value}T00:00:00.000Z`).getTime();
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(value: string, days: number): string {
  return new Date(dateToUtcMs(value) + days * MS_PER_DAY).toISOString().slice(0, 10);
}

function endOfMonth(value: string): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).toISOString().slice(0, 10);
}

function diffInDays(date: string, today: string): number {
  return Math.round((dateToUtcMs(date) - dateToUtcMs(today)) / MS_PER_DAY);
}

function toISOOrNull(date: Date | null | undefined): string | null {
  return date ? date.toISOString() : null;
}

function createEventMap(events: DeadlineDateEvent[]): Map<string, DeadlineDateEvent[]> {
  const map = new Map<string, DeadlineDateEvent[]>();

  for (const event of events) {
    const existing = map.get(event.deadlineTaskId);
    if (existing) {
      existing.push(event);
    } else {
      map.set(event.deadlineTaskId, [event]);
    }
  }

  return map;
}

function getVerificationStatus(
  task: DeadlineTask,
  rule: TaxRule | null,
): DashboardVerificationStatus {
  if (task.sourceType === "entered_deadline") {
    return "entered_deadline";
  }

  return rule?.verificationStatus ?? "needs_review";
}

function getVerificationLabel(status: DashboardVerificationStatus): string {
  switch (status) {
    case "verified":
      return "Verified";
    case "needs_review":
      return "Needs review";
    case "source_changed":
      return "Source changed";
    case "unsupported":
      return "Unsupported";
    case "entered_deadline":
      return ENTERED_DEADLINE_TRUST_LABEL;
  }
}

function getDateState({
  currentDueDate,
  status,
  today,
}: {
  currentDueDate: string;
  status: DeadlineTask["status"];
  today: string;
}): { daysRemaining: number; horizon: DashboardTaskHorizon; urgency: DashboardUrgency } {
  const daysRemaining = diffInDays(currentDueDate, today);
  const weekEnd = addDays(today, 6);
  const monthEnd = endOfMonth(today);

  if (daysRemaining < 0 && status !== "done") {
    return { daysRemaining, horizon: "overdue", urgency: "overdue" };
  }

  if (currentDueDate >= today && currentDueDate <= weekEnd) {
    return {
      daysRemaining,
      horizon: "due_this_week",
      urgency: daysRemaining === 0 ? "due_today" : "due_this_week",
    };
  }

  if (currentDueDate > weekEnd && currentDueDate <= monthEnd) {
    return { daysRemaining, horizon: "this_month", urgency: "due_this_month" };
  }

  return { daysRemaining, horizon: "long_range", urgency: "long_range" };
}

function getSmartPriorityScore(row: Omit<DashboardTaskRow, "smartPriorityScore">): number {
  const urgencyScore: Record<DashboardUrgency, number> = {
    overdue: 1000,
    due_today: 900,
    due_this_week: 700,
    due_this_month: 350,
    long_range: 100,
  };
  const priorityScore: Record<DeadlineTask["priority"], number> = {
    urgent: 90,
    high: 60,
    normal: 30,
    low: 10,
  };
  const statusScore: Record<DeadlineTask["status"], number> = {
    not_started: 40,
    waiting_on_client: 25,
    in_progress: 15,
    done: -250,
  };
  const verificationScore =
    row.verificationStatus === "source_changed"
      ? 35
      : row.verificationStatus === "entered_deadline"
        ? 15
        : 0;
  const targetScore = row.firmTargetDate && diffInDays(row.firmTargetDate, row.currentDueDate) < 0
    ? 20
    : 0;

  return (
    urgencyScore[row.urgency] +
    priorityScore[row.priority] +
    statusScore[row.status] +
    verificationScore +
    targetScore
  );
}

function createDashboardTaskRow({
  client,
  events,
  profile,
  rule,
  task,
  today,
}: DashboardJoinedRow & { events: DeadlineDateEvent[]; today: string }): DashboardTaskRow {
  const verificationStatus = getVerificationStatus(task, rule);
  const dateState = getDateState({
    currentDueDate: task.currentDueDate,
    status: task.status,
    today,
  });
  const isExtended = events.some((event) => event.eventType === "official_extension");
  const baseRow = {
    id: task.id,
    clientRelationship: {
      id: client.id,
      displayName: client.displayName,
      relationshipType: client.relationshipType,
    },
    filingProfile: {
      id: profile.id,
      displayName: profile.displayName,
      entityType: profile.entityType,
      states: profile.states,
    },
    title: task.title,
    jurisdiction: task.jurisdiction,
    taxCategory: task.taxCategory,
    currentDueDate: task.currentDueDate,
    originalDueDate: task.originalDueDate,
    firmTargetDate: task.firmTargetDate,
    hasOriginalDueDate: Boolean(task.originalDueDate),
    hasDateHistory: events.length > 0,
    isExtended,
    daysRemaining: dateState.daysRemaining,
    status: task.status,
    priority: task.priority,
    sourceType: task.sourceType,
    verificationStatus,
    verificationLabel: getVerificationLabel(verificationStatus),
    urgency: dateState.urgency,
    horizon: dateState.horizon,
    sourceName:
      task.sourceType === "entered_deadline" ? ENTERED_DEADLINE_REFERENCE_LABEL : (rule?.sourceName ?? null),
    sourceUrl: task.sourceType === "entered_deadline" ? null : (rule?.sourceUrl ?? null),
    enteredDeadlineReferenceNote:
      task.sourceType === "entered_deadline" ? task.enteredDeadlineReferenceNote : null,
    lastVerifiedAt: task.sourceType === "entered_deadline" ? null : toISOOrNull(rule?.lastVerifiedAt),
    sourceLastCheckedAt:
      task.sourceType === "entered_deadline" ? null : toISOOrNull(rule?.sourceLastCheckedAt),
    sourceLastChangedAt:
      task.sourceType === "entered_deadline" ? null : toISOOrNull(rule?.sourceLastChangedAt),
  } satisfies Omit<DashboardTaskRow, "smartPriorityScore">;

  return {
    ...baseRow,
    smartPriorityScore: getSmartPriorityScore(baseRow),
  };
}

function compareStrings(a: string, b: string): number {
  return a.localeCompare(b, "en", { sensitivity: "base" });
}

function priorityRank(priority: DeadlineTask["priority"]): number {
  return deadlineTaskPriorities.indexOf(priority);
}

export function filterAndSortDashboardRows(
  rows: DashboardTaskRow[],
  filters: DashboardSummaryInput,
): DashboardTaskRow[] {
  const filtered = rows.filter((row) => {
    if (filters.horizon !== "all" && row.horizon !== filters.horizon) return false;
    if (
      filters.clientRelationshipId &&
      row.clientRelationship.id !== filters.clientRelationshipId
    ) {
      return false;
    }
    if (filters.filingProfileId && row.filingProfile.id !== filters.filingProfileId) return false;
    if (filters.obligation && row.title !== filters.obligation) return false;
    if (filters.jurisdiction && row.jurisdiction !== filters.jurisdiction) return false;
    if (filters.entityType && row.filingProfile.entityType !== filters.entityType) return false;
    if (filters.taxCategory && row.taxCategory !== filters.taxCategory) return false;
    if (filters.taskStatus && row.status !== filters.taskStatus) return false;
    if (
      filters.verificationStatus &&
      row.verificationStatus !== filters.verificationStatus
    ) {
      return false;
    }

    return true;
  });

  return filtered.sort((a, b) => {
    switch (filters.sort) {
      case "smart_priority": {
        return (
          b.smartPriorityScore - a.smartPriorityScore ||
          a.currentDueDate.localeCompare(b.currentDueDate) ||
          compareStrings(a.clientRelationship.displayName, b.clientRelationship.displayName) ||
          compareStrings(a.title, b.title)
        );
      }
      case "client":
        return (
          compareStrings(a.clientRelationship.displayName, b.clientRelationship.displayName) ||
          compareStrings(a.filingProfile.displayName, b.filingProfile.displayName) ||
          a.currentDueDate.localeCompare(b.currentDueDate)
        );
      case "priority":
        return (
          priorityRank(b.priority) - priorityRank(a.priority) ||
          a.currentDueDate.localeCompare(b.currentDueDate)
        );
      case "due_date":
        return (
          a.currentDueDate.localeCompare(b.currentDueDate) ||
          priorityRank(b.priority) - priorityRank(a.priority)
        );
    }
  });
}

export function groupDashboardRows(rows: DashboardTaskRow[]): DashboardSection[] {
  const sectionConfig: Array<{ id: DashboardTaskHorizon; label: string }> = [
    { id: "overdue", label: "Overdue" },
    { id: "due_this_week", label: "Due this week" },
    { id: "this_month", label: "This month" },
    { id: "long_range", label: "Long range" },
  ];

  return sectionConfig.map((section) => {
    const tasks = rows.filter((row) => row.horizon === section.id);

    return {
      ...section,
      count: tasks.length,
      tasks,
    };
  });
}

function uniqueOptions<T extends { id: string; label: string }>(options: T[]): T[] {
  const seen = new Set<string>();
  const unique: T[] = [];

  for (const option of options) {
    if (seen.has(option.id)) continue;
    seen.add(option.id);
    unique.push(option);
  }

  return unique.sort((a, b) => compareStrings(a.label, b.label));
}

function getFilterOptions(rows: DashboardTaskRow[]): DashboardSummaryResponse["filterOptions"] {
  return {
    clientRelationships: uniqueOptions(
      rows.map((row) => ({
        id: row.clientRelationship.id,
        label: row.clientRelationship.displayName,
      })),
    ),
    filingProfiles: uniqueOptions(
      rows.map((row) => ({
        id: row.filingProfile.id,
        label: row.filingProfile.displayName,
        clientRelationshipId: row.clientRelationship.id,
      })),
    ),
    obligations: [...new Set(rows.map((row) => row.title))].sort(compareStrings),
    jurisdictions: [...new Set(rows.map((row) => row.jurisdiction))].sort(compareStrings),
    entityTypes: [...new Set(rows.map((row) => row.filingProfile.entityType))].sort(
      compareStrings,
    ),
    taxCategories: [...new Set(rows.map((row) => row.taxCategory))].sort(compareStrings),
    taskStatuses: deadlineTaskStatuses,
    verificationStatuses: dashboardVerificationStatuses,
  };
}

function buildSummary({
  filteredRows,
  filters,
  generatedAt,
  rows,
  today,
}: {
  filteredRows: DashboardTaskRow[];
  filters: DashboardSummaryInput;
  generatedAt: string;
  rows: DashboardTaskRow[];
  today: string;
}): DashboardSummaryResponse {
  return {
    generatedAt,
    today,
    filters,
    sections: groupDashboardRows(filteredRows),
    allTasks: filteredRows,
    summary: {
      total: filteredRows.length,
      overdue: filteredRows.filter((row) => row.urgency === "overdue").length,
      dueToday: filteredRows.filter((row) => row.urgency === "due_today").length,
      dueThisWeek: filteredRows.filter((row) => row.horizon === "due_this_week").length,
      dueThisMonth: filteredRows.filter((row) => row.horizon === "this_month").length,
      longRange: filteredRows.filter((row) => row.horizon === "long_range").length,
      done: filteredRows.filter((row) => row.status === "done").length,
      verified: filteredRows.filter((row) => row.verificationStatus === "verified").length,
      sourceChanged: filteredRows.filter((row) => row.verificationStatus === "source_changed")
        .length,
      enteredDeadline: filteredRows.filter((row) => row.sourceType === "entered_deadline").length,
    },
    filterOptions: getFilterOptions(rows),
  };
}

async function loadDashboardRows(
  ctx: Context,
  filters: DashboardSummaryInput,
): Promise<DashboardTaskRow[]> {
  const session = requireFirmSession(ctx);
  const today = filters.today ?? todayString();

  const joinedRows = await ctx.db
    .select({
      task: deadlineTasks,
      client: clientRelationships,
      profile: filingProfiles,
      rule: taxRules,
    })
    .from(deadlineTasks)
    .innerJoin(
      clientRelationships,
      and(
        eq(deadlineTasks.firmId, clientRelationships.firmId),
        eq(deadlineTasks.clientRelationshipId, clientRelationships.id),
      ),
    )
    .innerJoin(
      filingProfiles,
      and(
        eq(deadlineTasks.firmId, filingProfiles.firmId),
        eq(deadlineTasks.clientRelationshipId, filingProfiles.clientRelationshipId),
        eq(deadlineTasks.filingProfileId, filingProfiles.id),
      ),
    )
    .leftJoin(taxRules, eq(deadlineTasks.taxRuleId, taxRules.id))
    .where(eq(deadlineTasks.firmId, session.firm.id))
    .orderBy(
      asc(deadlineTasks.currentDueDate),
      asc(clientRelationships.displayName),
      asc(deadlineTasks.title),
    );

  const taskIds = joinedRows.map((row) => row.task.id);
  const events = taskIds.length
    ? await ctx.db
        .select()
        .from(deadlineDateEvents)
        .where(
          and(
            eq(deadlineDateEvents.firmId, session.firm.id),
            inArray(deadlineDateEvents.deadlineTaskId, taskIds),
          ),
        )
        .orderBy(asc(deadlineDateEvents.createdAt))
    : [];
  const eventMap = createEventMap(events);

  return joinedRows.map((row) =>
    createDashboardTaskRow({
      ...row,
      events: eventMap.get(row.task.id) ?? [],
      today,
    }),
  );
}

async function buildDashboardSummary(
  ctx: Context,
  input: DashboardSummaryInput | undefined,
): Promise<DashboardSummaryResponse> {
  const filters = normalizeDashboardInput(input);
  const rows = await loadDashboardRows(ctx, filters);
  const filteredRows = filterAndSortDashboardRows(rows, filters);

  return buildSummary({
    filteredRows,
    filters,
    generatedAt: new Date().toISOString(),
    rows,
    today: filters.today ?? todayString(),
  });
}

function csvCell(value: string | number | null): string {
  const text = value === null ? "" : String(value);

  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

export function createDashboardCsv(rows: DashboardTaskRow[]): string {
  const headers = [
    "Client relationship",
    "Filing/tax profile",
    "Obligation",
    "Jurisdiction",
    "Tax category",
    "Current official due date",
    "Original due date",
    "Firm target date",
    "Status",
    "Verification status",
    "Source type",
    "Source name",
    "Source URL",
    "Last verified at",
    "Source last changed at",
    "Priority",
    "Extension status",
    "Notes",
  ];
  const lines = [
    headers.map(csvCell).join(","),
    ...rows.map((row) =>
      [
        row.clientRelationship.displayName,
        row.filingProfile.displayName,
        row.title,
        row.jurisdiction,
        row.taxCategory,
        row.currentDueDate,
        row.originalDueDate,
        row.firmTargetDate,
        row.status,
        row.verificationLabel,
        row.sourceType === "entered_deadline" ? ENTERED_DEADLINE_LABEL : row.sourceType,
        row.sourceName,
        row.sourceUrl,
        row.lastVerifiedAt,
        row.sourceLastChangedAt,
        row.priority,
        row.isExtended ? "Extended" : "",
        row.verificationStatus === "entered_deadline"
          ? [ENTERED_DEADLINE_TRUST_LABEL, row.enteredDeadlineReferenceNote].filter(Boolean).join(" - ")
          : "",
      ].map(csvCell).join(","),
    ),
  ];

  return `${lines.join("\n")}\n`;
}

export const dashboardRouter = router({
  summary: publicProcedure
    .input(dashboardSummaryFiltersSchema.optional())
    .query(async ({ ctx, input }) => buildDashboardSummary(ctx, input)),

  export: publicProcedure
    .input(dashboardSummaryFiltersSchema.optional())
    .mutation(async ({ ctx, input }) => {
      return exportDashboardCurrentView(ctx, input);
    }),

  bulkExportCurrentFilteredView: publicProcedure
    .input(dashboardSummaryFiltersSchema.optional())
    .mutation(async ({ ctx, input }) => {
      return exportDashboardCurrentView(ctx, input);
    }),
});

async function exportDashboardCurrentView(ctx: Context, input: DashboardSummaryInput | undefined) {
  const summary = await buildDashboardSummary(ctx, input);

  return {
    generatedAt: summary.generatedAt,
    filename: `due-date-hq-current-task-view-${summary.today}.csv`,
    contentType: "text/csv;charset=utf-8",
    rowCount: summary.allTasks.length,
    csv: createDashboardCsv(summary.allTasks),
  };
}
