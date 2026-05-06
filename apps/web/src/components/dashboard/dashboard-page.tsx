import { Button } from "@due-date-hq/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@due-date-hq/ui/components/dialog";
import { Input } from "@due-date-hq/ui/components/input";
import { Label } from "@due-date-hq/ui/components/label";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@due-date-hq/ui/components/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@due-date-hq/ui/components/select";
import { Textarea } from "@due-date-hq/ui/components/textarea";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  FileUp,
  Filter,
  RotateCcw,
  X,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import * as React from "react";
import { Cell, Pie, PieChart, Tooltip, type TooltipContentProps } from "recharts";
import { toast } from "sonner";

import { EvidenceDrawer } from "@/components/evidence/evidence-drawer";
import { BulkTaskActions } from "@/components/task-table/bulk-task-actions";
import { TaskTable } from "@/components/task-table/task-table";
import { formatDueTodayCountdown } from "@/utils/deadline-countdown";
import { formatDate, formatDateTime, formatMonthDay } from "@/utils/date-format";
import { trpc } from "@/utils/trpc";

import type {
  ClientListItemResponse,
  FilingProfileResponse,
} from "@due-date-hq/api/routers/clients";
import type {
  DashboardHorizon,
  DashboardSection,
  DashboardSort,
  DashboardSummaryInput,
  DashboardSummaryResponse,
  DashboardTaskHorizon,
  DashboardTaskRow,
  DashboardVerificationStatus,
} from "@due-date-hq/api/routers/dashboard";

type DeadlineTaskStatus = DashboardTaskRow["status"];
type DeadlineKind = "filing" | "payment";
type DeadlinePriority = "low" | "normal" | "high" | "urgent";
type Recurrence = "none" | "monthly" | "quarterly" | "annual";
type DashboardExceptionFocus =
  | "source_changed"
  | "needs_review"
  | "entered_deadline"
  | "waiting_on_client";
type WorkloadTone = "empty" | "low" | "medium" | "high" | "risk" | "overdue" | "done";
type DashboardFilterDraft = {
  calendarMonthId: string | null;
  exceptionFocus: DashboardExceptionFocus | null;
  filters: DashboardSummaryInput;
  selectedDate: string | null;
};
type HorizonProgressBucket = {
  days: number | null;
  description: string;
  direction: "future" | "past";
  id: string;
  label: string;
};
type HorizonProgressItem = {
  completionPercent: number;
  description: string;
  done: number;
  id: string;
  label: string;
  open: number;
  total: number;
};

const horizonLabels: Record<DashboardHorizon, string> = {
  all: "All horizons",
  overdue: "Overdue",
  due_this_week: "Due this week",
  this_month: "This month",
  long_range: "Later",
};

const dashboardHorizons: DashboardTaskHorizon[] = [
  "overdue",
  "due_this_week",
  "this_month",
  "long_range",
];

const deadlineKindOptions = [
  { value: "filing", label: "Filing" },
  { value: "payment", label: "Payment" },
] as const satisfies readonly { value: DeadlineKind; label: string }[];

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
] as const satisfies readonly { value: DeadlinePriority; label: string }[];

const recurrenceOptions = [
  { value: "none", label: "One-time" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual", label: "Annual" },
] as const satisfies readonly { value: Recurrence; label: string }[];

const horizonProgressBuckets = {
  overdue: [
    {
      days: 1,
      description: "Past due by 1 day",
      direction: "past",
      id: "overdue-1-day",
      label: "1 day late",
    },
    {
      days: 7,
      description: "Past due by 7 days",
      direction: "past",
      id: "overdue-7-days",
      label: "7 days late",
    },
    {
      days: null,
      description: "All past-due tasks",
      direction: "past",
      id: "overdue-all",
      label: "All overdue",
    },
  ],
  due_this_week: [
    {
      days: 1,
      description: "Due within 1 day",
      direction: "future",
      id: "week-1-day",
      label: "1 day",
    },
    {
      days: 3,
      description: "Due within 3 days",
      direction: "future",
      id: "week-3-days",
      label: "3 days",
    },
    {
      days: 7,
      description: "Due within 1 week",
      direction: "future",
      id: "week-7-days",
      label: "1 week",
    },
  ],
  this_month: [
    {
      days: 10,
      description: "Due within 10 days",
      direction: "future",
      id: "month-10-days",
      label: "10 days",
    },
    {
      days: 20,
      description: "Due within 20 days",
      direction: "future",
      id: "month-20-days",
      label: "20 days",
    },
    {
      days: 30,
      description: "Due within 1 month",
      direction: "future",
      id: "month-30-days",
      label: "1 month",
    },
  ],
  long_range: [
    {
      days: 30,
      description: "Due within 1 month",
      direction: "future",
      id: "later-1-month",
      label: "1 month",
    },
    {
      days: 60,
      description: "Due within 2 months",
      direction: "future",
      id: "later-2-months",
      label: "2 months",
    },
    {
      days: 90,
      description: "Due within 3 months",
      direction: "future",
      id: "later-3-months",
      label: "3 months",
    },
  ],
} satisfies Record<DashboardTaskHorizon, HorizonProgressBucket[]>;

const horizonToneStyles = {
  overdue: {
    activeCard: "bg-ddhq-risk-soft/32 text-foreground ring-1 ring-inset ring-ddhq-risk/20",
    count: "text-ddhq-risk",
    dot: "bg-ddhq-risk",
    idleCard:
      "bg-transparent text-foreground hover:bg-ddhq-risk-soft/18",
    title: "text-ddhq-risk",
  },
  due_this_week: {
    activeCard: "bg-ddhq-review-soft/34 text-foreground ring-1 ring-inset ring-ddhq-review/20",
    count: "text-ddhq-review",
    dot: "bg-ddhq-review",
    idleCard:
      "bg-transparent text-foreground hover:bg-ddhq-review-soft/18",
    title: "text-ddhq-review",
  },
  this_month: {
    activeCard: "bg-ddhq-accent-soft/30 text-foreground ring-1 ring-inset ring-primary/20",
    count: "text-primary",
    dot: "bg-primary",
    idleCard:
      "bg-transparent text-foreground hover:bg-ddhq-accent-soft/18",
    title: "text-primary",
  },
  long_range: {
    activeCard: "bg-ddhq-gap-soft/32 text-foreground ring-1 ring-inset ring-ddhq-gap/20",
    count: "text-ddhq-gap",
    dot: "bg-ddhq-gap",
    idleCard:
      "bg-transparent text-foreground hover:bg-ddhq-gap-soft/18",
    title: "text-ddhq-gap",
  },
} satisfies Record<
  DashboardTaskHorizon,
  {
    activeCard: string;
    count: string;
    dot: string;
    idleCard: string;
    title: string;
  }
>;

const horizonCalendarToneStyles = {
  overdue: {
    focusRing: "focus-visible:ring-ddhq-risk/35",
    icon: "text-ddhq-risk",
    selectedBorder: "border-ddhq-risk/60",
    selectedRing: "ring-2 ring-ddhq-risk/35",
    selectedSwatch: "border-ddhq-risk/60 bg-ddhq-risk-soft ring-2 ring-ddhq-risk/35",
    workloadSwatch: "bg-ddhq-risk-soft",
    tones: {
      low: "bg-ddhq-risk-soft/55 text-ddhq-risk hover:bg-ddhq-risk-soft",
      medium: "bg-ddhq-risk-soft/70 text-ddhq-risk hover:bg-ddhq-risk-soft",
      high: "bg-ddhq-risk-soft/85 text-ddhq-risk hover:bg-ddhq-risk-soft",
      risk: "bg-ddhq-risk-soft text-ddhq-risk hover:bg-ddhq-risk-soft/85",
    },
  },
  due_this_week: {
    focusRing: "focus-visible:ring-ddhq-review/35",
    icon: "text-ddhq-review",
    selectedBorder: "border-ddhq-review/60",
    selectedRing: "ring-2 ring-ddhq-review/35",
    selectedSwatch: "border-ddhq-review/60 bg-ddhq-review-soft ring-2 ring-ddhq-review/35",
    workloadSwatch: "bg-ddhq-review-soft",
    tones: {
      low: "bg-ddhq-review-soft/55 text-ddhq-review hover:bg-ddhq-review-soft",
      medium: "bg-ddhq-review-soft/70 text-ddhq-review hover:bg-ddhq-review-soft",
      high: "bg-ddhq-review-soft/85 text-ddhq-review hover:bg-ddhq-review-soft",
      risk: "bg-ddhq-review-soft text-ddhq-review hover:bg-ddhq-review-soft/85",
    },
  },
  this_month: {
    focusRing: "focus-visible:ring-primary/35",
    icon: "text-primary",
    selectedBorder: "border-primary/60",
    selectedRing: "ring-2 ring-primary/35",
    selectedSwatch: "border-primary/60 bg-ddhq-accent-soft ring-2 ring-primary/35",
    workloadSwatch: "bg-ddhq-accent-soft",
    tones: {
      low: "bg-ddhq-accent-soft/55 text-primary hover:bg-ddhq-accent-soft",
      medium: "bg-ddhq-accent-soft/70 text-primary hover:bg-ddhq-accent-soft",
      high: "bg-ddhq-accent-soft/85 text-primary hover:bg-ddhq-accent-soft",
      risk: "bg-ddhq-accent-soft text-primary hover:bg-ddhq-accent-soft/85",
    },
  },
  long_range: {
    focusRing: "focus-visible:ring-ddhq-gap/35",
    icon: "text-ddhq-gap",
    selectedBorder: "border-ddhq-gap/60",
    selectedRing: "ring-2 ring-ddhq-gap/35",
    selectedSwatch: "border-ddhq-gap/60 bg-ddhq-gap-soft ring-2 ring-ddhq-gap/35",
    workloadSwatch: "bg-ddhq-gap-soft",
    tones: {
      low: "bg-ddhq-gap-soft/55 text-ddhq-gap hover:bg-ddhq-gap-soft",
      medium: "bg-ddhq-gap-soft/70 text-ddhq-gap hover:bg-ddhq-gap-soft",
      high: "bg-ddhq-gap-soft/85 text-ddhq-gap hover:bg-ddhq-gap-soft",
      risk: "bg-ddhq-gap-soft text-ddhq-gap hover:bg-ddhq-gap-soft/85",
    },
  },
} satisfies Record<
  DashboardTaskHorizon,
  {
    focusRing: string;
    icon: string;
    selectedBorder: string;
    selectedRing: string;
    selectedSwatch: string;
    workloadSwatch: string;
    tones: Record<Exclude<WorkloadTone, "empty" | "overdue" | "done">, string>;
  }
>;

const horizonProgressFillClassNames = {
  overdue: "bg-ddhq-verified",
  due_this_week: "bg-ddhq-verified",
  this_month: "bg-ddhq-verified",
  long_range: "bg-ddhq-verified",
} satisfies Record<DashboardTaskHorizon, string>;

const sortLabels: Record<DashboardSort, string> = {
  smart_priority: "Smart priority",
  due_date: "Due date",
  client: "Client",
  priority: "Priority",
};

const verificationLabels: Record<DashboardVerificationStatus, string> = {
  verified: "Verified",
  needs_review: "Needs review",
  source_changed: "Source changed",
  unsupported: "Unsupported",
  entered_deadline: "Entered deadline",
};

const statusLabels: Record<DeadlineTaskStatus, string> = {
  not_started: "Not started",
  waiting_on_client: "Waiting on client",
  ready_to_work: "Ready to work",
  in_progress: "In progress",
  done: "Done",
};

const emptyFilters: DashboardSummaryInput = {
  horizon: "all",
  page: 1,
  pageSize: 25,
  sort: "smart_priority",
};
const dashboardPageSize = 25;
function createInitialSectionPages(): Record<DashboardTaskHorizon, number> {
  return {
    overdue: 1,
    due_this_week: 1,
    this_month: 1,
    long_range: 1,
  };
}

export function DashboardPage() {
  const [filters, setFilters] = React.useState<DashboardSummaryInput>(emptyFilters);
  const [activeHorizon, setActiveHorizon] =
    React.useState<DashboardTaskHorizon>("due_this_week");
  const [sectionPages, setSectionPages] =
    React.useState<Record<DashboardTaskHorizon, number>>(createInitialSectionPages);
  const [selectedTaskIds, setSelectedTaskIds] = React.useState<Set<string>>(new Set());
  const [evidenceTaskId, setEvidenceTaskId] = React.useState<string | null>(null);
  const [showFilters, setShowFilters] = React.useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = React.useState(false);
  const [filterDraft, setFilterDraft] = React.useState<DashboardFilterDraft>(() => ({
    calendarMonthId: null,
    exceptionFocus: null,
    filters: { ...emptyFilters },
    selectedDate: null,
  }));
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null);
  const [exceptionFocus, setExceptionFocus] = React.useState<DashboardExceptionFocus | null>(null);
  const [calendarMonthId, setCalendarMonthId] = React.useState<string | null>(null);
  const activePage = sectionPages[activeHorizon] ?? 1;
  const dashboardInput = React.useMemo(
    () => ({
      ...filters,
      page: activePage,
      pageSize: dashboardPageSize,
    }),
    [activePage, filters],
  );

  const dashboard = useQuery({
    ...trpc.dashboard.summary.queryOptions(dashboardInput),
    placeholderData: keepPreviousData,
  });
  const clients = useQuery(trpc.clients.list.queryOptions());
  const activeHorizonTasks = React.useMemo(
    () => dashboard.data?.allTasks.filter((task) => task.horizon === activeHorizon) ?? [],
    [activeHorizon, dashboard.data],
  );
  const focusedTasks = React.useMemo(
    () => filterFocusedTasks(activeHorizonTasks, { exceptionFocus, selectedDate }),
    [activeHorizonTasks, exceptionFocus, selectedDate],
  );
  const activeSection = React.useMemo<DashboardSection>(() => {
    const count = focusedTasks.length;
    const totalPages = Math.max(1, Math.ceil(count / dashboardPageSize));
    const page = Math.min(activePage, totalPages);
    const start = (page - 1) * dashboardPageSize;

    return {
      id: activeHorizon,
      label: horizonLabels[activeHorizon],
      count,
      pagination: {
        page,
        pageSize: dashboardPageSize,
        totalPages,
      },
      tasks: focusedTasks.slice(start, start + dashboardPageSize),
    };
  }, [activeHorizon, activePage, focusedTasks]);
  const selectedCount = selectedTaskIds.size;
  const resultStart =
    activeSection.count === 0
      ? 0
      : (activeSection.pagination.page - 1) * activeSection.pagination.pageSize + 1;
  const resultEnd = Math.min(
    activeSection.pagination.page * activeSection.pagination.pageSize,
    activeSection.count,
  );

  React.useEffect(() => {
    const visibleIds = new Set(activeSection.tasks.map((task) => task.id));
    setSelectedTaskIds((current) => {
      const next = new Set([...current].filter((taskId) => visibleIds.has(taskId)));
      return next.size === current.size ? current : next;
    });
  }, [activeSection]);

  function openFilters() {
    setFilterDraft({
      calendarMonthId,
      exceptionFocus,
      filters: { ...filters },
      selectedDate,
    });
    setShowFilters(true);
  }

  function updateFilterDraft<K extends keyof DashboardSummaryInput>(
    key: K,
    value: DashboardSummaryInput[K] | "",
  ) {
    setFilterDraft((current) => {
      const next = { ...current.filters, [key]: value || undefined };
      if (!next.horizon) next.horizon = "all";
      if (!next.sort) next.sort = "smart_priority";
      next.page = 1;
      next.pageSize = dashboardPageSize;

      return {
        ...current,
        filters: next,
      };
    });
  }

  function resetFilterDraft() {
    setFilterDraft({
      calendarMonthId: null,
      exceptionFocus: null,
      filters: { ...emptyFilters },
      selectedDate: null,
    });
  }

  function applyFilterDraft() {
    setFilters(filterDraft.filters);
    setSelectedDate(filterDraft.selectedDate);
    setExceptionFocus(filterDraft.exceptionFocus);
    setCalendarMonthId(filterDraft.calendarMonthId);
    setSectionPages(createInitialSectionPages);
    setShowFilters(false);
  }

  function selectHorizon(horizon: DashboardTaskHorizon) {
    setActiveHorizon(horizon);
    setSelectedDate(null);
    setExceptionFocus(null);
    setCalendarMonthId(null);
  }

  function setActiveSectionPage(page: number) {
    setSectionPages((current) => ({
      ...current,
      [activeHorizon]: Math.max(1, Math.min(page, activeSection.pagination.totalPages)),
    }));
  }

  function toggleTask(taskId: string) {
    setSelectedTaskIds((current) => {
      const next = new Set(current);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }

  function toggleSection(tasks: DashboardTaskRow[], checked: boolean) {
    setSelectedTaskIds((current) => {
      const next = new Set(current);
      for (const task of tasks) {
        if (checked) {
          next.add(task.id);
        } else {
          next.delete(task.id);
        }
      }
      return next;
    });
  }

  function downloadCurrentCsv() {
    const csv = createDashboardCsv(focusedTasks);
    downloadCsv({
      csv,
      filename: `due-date-hq-${activeHorizon}-dashboard-${dashboard.data?.today ?? "view"}.csv`,
    });
    toast.success(`Downloaded ${focusedTasks.length} dashboard rows.`);
  }

  const isBusy = false;
  const activeFilterCount = [
    filters.clientRelationshipId,
    filters.filingProfileId,
    filters.jurisdiction,
    filters.entityType,
    filters.taxCategory,
    filters.taskStatus,
    filters.verificationStatus,
  ].filter(Boolean).length;
  const activeFocusCount = [selectedDate, exceptionFocus].filter(Boolean).length;
  const hasNonDefaultFilters =
    activeFilterCount > 0 ||
    activeFocusCount > 0 ||
    (filters.sort ?? "smart_priority") !== "smart_priority";

  if (dashboard.isPending) {
    return (
      <main className="ddhq-page text-foreground">
        <div className="ddhq-page-inner max-w-[1440px] gap-4">
          <div className="h-24 animate-pulse ddhq-panel" />
          <div className="h-12 animate-pulse ddhq-panel" />
          <div className="h-[420px] animate-pulse ddhq-panel" />
        </div>
      </main>
    );
  }

  if (dashboard.isError) {
    return (
      <main className="ddhq-page text-foreground">
        <div className="ddhq-page-inner max-w-[1440px] gap-4">
          <div className="rounded-xl border border-ddhq-risk/30 bg-ddhq-risk-soft p-4 text-sm text-ddhq-risk">
            Dashboard data could not be loaded.
          </div>
        </div>
      </main>
    );
  }

  const data = dashboard.data;
  const calendarMonths = createWorkloadCalendarMonths(
    activeHorizonTasks,
    data.today,
    activeHorizon,
    selectedDate,
  );
  const visibleCalendarMonthId = getVisibleCalendarMonthId(
    calendarMonths,
    calendarMonthId,
    selectedDate,
    data.today,
  );
  const exceptionItems = createExceptionItems(activeHorizonTasks);
  const focusSummary = createFocusSummary({ exceptionFocus, selectedDate });
  const horizonProgressItems = createHorizonProgressItems(
    activeHorizonTasks,
    activeHorizon,
    data.today,
  );

  return (
    <main className="ddhq-page h-full overflow-hidden text-foreground">
      <div className="ddhq-page-inner h-full min-h-0 max-w-[1440px] gap-4 py-6">
        {/* Page header */}
        <section className="ddhq-page-header">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="ddhq-title">
              Deadline dashboard
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">
              Start with the nearest horizon, then narrow by workload date or exception.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-ddhq-line bg-ddhq-paper-raised px-2.5 py-1.5 text-xs text-muted-foreground shadow-[0_1px_0_oklch(0.44_0.025_78/0.035)] md:justify-end">
              <span>Today {formatDate(data.today)}</span>
              <span aria-hidden="true" className="text-muted-foreground/60">
                &bull;
              </span>
              <span>Generated {formatDateTime(data.generatedAt)}</span>
            </div>
        </section>

        <section className="grid shrink-0 gap-5 rounded-lg border border-ddhq-line bg-ddhq-paper-raised p-3 lg:grid-cols-2 xl:grid-cols-3">
          <div className="grid gap-1 rounded-lg bg-ddhq-paper-muted/38 p-1 sm:grid-cols-2 lg:grid-cols-1">
            {dashboardHorizons.map((horizon) => {
              const section = data.sections.find((item) => item.id === horizon);
              const count = section?.count ?? 0;

              return (
                <HorizonCard
                  key={horizon}
                  count={count}
                  horizon={horizon}
                  isSelected={activeHorizon === horizon}
                  onSelect={() => selectHorizon(horizon)}
                  summary={getHorizonSummary(horizon, data)}
                />
              );
            })}
          </div>

          <WorkloadCalendar
            activeHorizon={activeHorizon}
            months={calendarMonths}
            selectedDate={selectedDate}
            taskCount={activeHorizonTasks.length}
            today={data.today}
            visibleMonthId={visibleCalendarMonthId}
            onChangeMonth={setCalendarMonthId}
            onSelectDate={(date) => {
              setSelectedDate((current) => (current === date ? null : date));
              setCalendarMonthId(date.slice(0, 7));
              setSectionPages(createInitialSectionPages);
            }}
          />
          <HorizonProgressSummary
            activeHorizon={activeHorizon}
            className="lg:col-start-2 xl:col-start-auto"
            items={horizonProgressItems}
          />
        </section>

        {/* Controls */}
        <section className="flex flex-col gap-2 px-1 py-1">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-h-8 flex-wrap items-center gap-2">
              <div className="relative">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-expanded={showFilters}
                  className={
                    showFilters
                      ? "rounded-lg border-primary/30 bg-ddhq-accent-soft/70 text-foreground shadow-none"
                      : "rounded-lg"
                  }
                  onClick={() => {
                    if (showFilters) {
                      setShowFilters(false);
                    } else {
                      openFilters();
                    }
                  }}
                >
                  <Filter
                    className={showFilters ? "size-3.5 text-primary" : "size-3.5"}
                  />
                  Filters
                </Button>
                {showFilters ? (
                  <FilterPanel
                    data={data}
                    filters={filterDraft.filters}
                    onApply={applyFilterDraft}
                    onClose={() => setShowFilters(false)}
                    onReset={resetFilterDraft}
                    onUpdateFilter={updateFilterDraft}
                  />
                ) : null}
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                {activeFilterCount > 0 || activeFocusCount > 0
                  ? `${activeFilterCount + activeFocusCount} active`
                  : "Default filters"}
              </span>
              {focusSummary ? (
                <span className="inline-flex items-center gap-1 rounded-lg border border-ddhq-line bg-ddhq-paper-muted/55 px-2 py-1 text-xs font-medium text-muted-foreground">
                  {focusSummary}
                  <button
                    type="button"
                    className="rounded-sm p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Clear dashboard focus"
                    onClick={() => {
                      setSelectedDate(null);
                      setExceptionFocus(null);
                    }}
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ) : null}
              <ExceptionSummary
                activeFocus={exceptionFocus}
                items={exceptionItems}
                onSelect={(focus) => {
                  setExceptionFocus((current) => (current === focus ? null : focus));
                  setSectionPages(createInitialSectionPages);
                }}
              />
              {selectedCount > 0 ? (
                <span className="ml-2 text-sm font-semibold">
                  {selectedCount} selected
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {activeSection.count} rows in current view
                  </span>
                </span>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <BulkTaskActions
                disabled={isBusy}
                selectedTaskIds={selectedTaskIds}
                taskStatuses={data.filterOptions.taskStatuses}
                onClearSelection={() => setSelectedTaskIds(new Set())}
              />
              <span className="inline-flex h-8 items-center rounded-lg border border-ddhq-line bg-ddhq-paper-raised px-2.5 text-xs font-medium text-muted-foreground">
                Showing {resultStart}-{resultEnd} of{" "}
                <span className="ml-1 font-mono font-semibold tabular-nums text-foreground">
                  {activeSection.count}
                </span>
                <span className="ml-1">results</span>
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 w-36 rounded-lg"
                disabled={isBusy || focusedTasks.length === 0}
                title="Download a CSV for the current horizon, filters, and date or exception focus."
                aria-label="Download CSV for current dashboard view"
                onClick={downloadCurrentCsv}
              >
                <Download className="size-3.5" />
                Download CSV
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8 rounded-lg"
                onClick={() => setIsQuickAddOpen(true)}
              >
                <CalendarPlus className="size-3.5" />
                Add task
              </Button>
            </div>
          </div>
        </section>

        {/* Task sections */}
        <section className="flex min-h-0 flex-1 basis-1/2 flex-col gap-2">
          {data.summary.total === 0 && !hasNonDefaultFilters ? (
            <DashboardEmptyState />
          ) : (
            <>
              <TaskTable
                section={activeSection}
                selectedTaskIds={selectedTaskIds}
                onToggleTask={toggleTask}
                onToggleSection={toggleSection}
                onOpenEvidence={setEvidenceTaskId}
              />
              <DashboardPagination
                count={activeSection.count}
                page={activeSection.pagination.page}
                pageSize={activeSection.pagination.pageSize}
                totalPages={activeSection.pagination.totalPages}
                onPageChange={setActiveSectionPage}
              />
            </>
          )}
        </section>
      </div>

      <QuickAddTaskDialog
        clients={clients.data?.clients ?? []}
        open={isQuickAddOpen}
        onOpenChange={setIsQuickAddOpen}
      />
      <EvidenceDrawer taskId={evidenceTaskId} onClose={() => setEvidenceTaskId(null)} />
    </main>
  );
}

function QuickAddTaskDialog({
  clients,
  onOpenChange,
  open,
}: {
  clients: ClientListItemResponse[];
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const queryClient = useQueryClient();
  const [selectedClientId, setSelectedClientId] = React.useState("");
  const [filingProfileId, setFilingProfileId] = React.useState("");
  const [taxCategory, setTaxCategory] = React.useState("");
  const [jurisdiction, setJurisdiction] = React.useState("federal");
  const [formOrObligation, setFormOrObligation] = React.useState("");
  const [deadlineKind, setDeadlineKind] = React.useState<DeadlineKind>("filing");
  const [currentDueDate, setCurrentDueDate] = React.useState("");
  const [firmTargetDate, setFirmTargetDate] = React.useState("");
  const [priority, setPriority] = React.useState<DeadlinePriority>("normal");
  const [recurrence, setRecurrence] = React.useState<Recurrence>("none");
  const [referenceNote, setReferenceNote] = React.useState("");

  const clientDetail = useQuery({
    ...trpc.clients.get.queryOptions({ clientId: selectedClientId || "__none__" }),
    enabled: open && Boolean(selectedClientId),
  });
  const selectedClient = clients.find((client) => client.id === selectedClientId);
  const profiles = clientDetail.data?.profiles ?? [];
  const selectedProfileId = filingProfileId || profiles[0]?.id || "";
  const selectedProfile = profiles.find((profile) => profile.id === selectedProfileId);
  const canSubmit = Boolean(selectedClientId && selectedProfileId);

  const createManual = useMutation(
    trpc.deadlineTasks.createManual.mutationOptions({
      onError: (error) => toast.error(error.message),
      onSuccess: () => {
        toast.success("Entered deadline task added.");
        resetForm({ preserveClient: true });
        onOpenChange(false);
        void Promise.all([
          queryClient.invalidateQueries(trpc.dashboard.summary.queryFilter()),
          queryClient.invalidateQueries(trpc.clients.list.queryFilter()),
          queryClient.invalidateQueries(trpc.clients.get.queryFilter()),
        ]);
      },
    }),
  );

  React.useEffect(() => {
    if (!open || selectedClientId || clients.length === 0) return;
    setSelectedClientId(clients[0]?.id ?? "");
  }, [clients, open, selectedClientId]);

  React.useEffect(() => {
    setFilingProfileId(profiles[0]?.id ?? "");
  }, [selectedClientId, profiles]);

  function resetForm({ preserveClient = false }: { preserveClient?: boolean } = {}) {
    if (!preserveClient) {
      setSelectedClientId(clients[0]?.id ?? "");
      setFilingProfileId("");
    }
    setTaxCategory("");
    setJurisdiction("federal");
    setFormOrObligation("");
    setDeadlineKind("filing");
    setCurrentDueDate("");
    setFirmTargetDate("");
    setPriority("normal");
    setRecurrence("none");
    setReferenceNote("");
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && createManual.isPending) return;
    if (!nextOpen) resetForm({ preserveClient: true });
    onOpenChange(nextOpen);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    createManual.mutate({
      clientRelationshipId: selectedClientId,
      filingProfileId: selectedProfileId,
      taxCategory,
      jurisdiction,
      formOrObligation,
      deadlineKind,
      currentDueDate,
      firmTargetDate: firmTargetDate || undefined,
      priority,
      recurrence,
      referenceNote,
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[min(760px,calc(100vh-2rem))] gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-border px-5 pb-3 pt-5">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
            <CalendarPlus className="size-3.5" />
            Entered deadline
          </div>
          <DialogTitle className="text-base font-semibold">Add task</DialogTitle>
          <DialogDescription className="mt-1 max-w-xl">
            Save a manual entered deadline from the dashboard. It stays separate from Verified DueDateHQ rules.
          </DialogDescription>
        </DialogHeader>

        <form className="grid max-h-[calc(100vh-13rem)] gap-4 overflow-y-auto px-5 py-5" onSubmit={handleSubmit}>
          <section className="grid gap-4 md:grid-cols-2">
            <QuickAddField label="Client" htmlFor="quick-add-client">
              <Select
                value={selectedClientId}
                onValueChange={(value) => {
                  setSelectedClientId(value ?? "");
                  setFilingProfileId("");
                }}
              >
                <SelectTrigger id="quick-add-client" className="h-8 w-full">
                  <QuickAddSelectLabel>
                    {selectedClient?.displayName ?? "Select client"}
                  </QuickAddSelectLabel>
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </QuickAddField>

            <QuickAddField label="Filing profile" htmlFor="quick-add-profile">
              <Select
                value={selectedProfileId}
                disabled={!selectedClientId || clientDetail.isPending || profiles.length === 0}
                onValueChange={(value) => setFilingProfileId(value ?? "")}
              >
                <SelectTrigger id="quick-add-profile" className="h-8 w-full">
                  <QuickAddSelectLabel>
                    {selectedProfile
                      ? getProfileLabel(selectedProfile)
                      : getProfilePlaceholder(clientDetail.isPending, profiles)}
                  </QuickAddSelectLabel>
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {getProfileLabel(profile)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </QuickAddField>

            <QuickAddField label="Tax type" htmlFor="quick-add-tax-category">
              <Input
                id="quick-add-tax-category"
                value={taxCategory}
                onChange={(event) => setTaxCategory(event.target.value)}
                required
              />
            </QuickAddField>

            <QuickAddField label="Jurisdiction" htmlFor="quick-add-jurisdiction">
              <Input
                id="quick-add-jurisdiction"
                value={jurisdiction}
                onChange={(event) => setJurisdiction(event.target.value)}
                required
              />
            </QuickAddField>

            <QuickAddField label="Form or obligation" htmlFor="quick-add-obligation">
              <Input
                id="quick-add-obligation"
                value={formOrObligation}
                onChange={(event) => setFormOrObligation(event.target.value)}
                required
              />
            </QuickAddField>

            <QuickAddField label="Filing/payment" htmlFor="quick-add-kind">
              <Select
                value={deadlineKind}
                onValueChange={(value) => setDeadlineKind(value as DeadlineKind)}
              >
                <SelectTrigger id="quick-add-kind" className="h-8 w-full">
                  <QuickAddSelectLabel>
                    {getOptionLabel(deadlineKindOptions, deadlineKind)}
                  </QuickAddSelectLabel>
                </SelectTrigger>
                <SelectContent>
                  {deadlineKindOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </QuickAddField>

            <QuickAddField label="Current due date" htmlFor="quick-add-due-date">
              <Input
                id="quick-add-due-date"
                type="date"
                value={currentDueDate}
                onChange={(event) => setCurrentDueDate(event.target.value)}
                required
              />
            </QuickAddField>

            <QuickAddField label="Firm target date" htmlFor="quick-add-target-date">
              <Input
                id="quick-add-target-date"
                type="date"
                value={firmTargetDate}
                onChange={(event) => setFirmTargetDate(event.target.value)}
              />
            </QuickAddField>

            <QuickAddField label="Priority" htmlFor="quick-add-priority">
              <Select
                value={priority}
                onValueChange={(value) => setPriority(value as DeadlinePriority)}
              >
                <SelectTrigger id="quick-add-priority" className="h-8 w-full">
                  <QuickAddSelectLabel>
                    {getOptionLabel(priorityOptions, priority)}
                  </QuickAddSelectLabel>
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </QuickAddField>

            <QuickAddField label="Recurrence" htmlFor="quick-add-recurrence">
              <Select
                value={recurrence}
                onValueChange={(value) => setRecurrence(value as Recurrence)}
              >
                <SelectTrigger id="quick-add-recurrence" className="h-8 w-full">
                  <QuickAddSelectLabel>
                    {getOptionLabel(recurrenceOptions, recurrence)}
                  </QuickAddSelectLabel>
                </SelectTrigger>
                <SelectContent>
                  {recurrenceOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </QuickAddField>
          </section>

          <QuickAddField label="Reference" htmlFor="quick-add-reference">
            <Textarea
              id="quick-add-reference"
              className="min-h-20"
              placeholder="Prior-year workpaper, client notice, source data, or CPA judgment"
              value={referenceNote}
              onChange={(event) => setReferenceNote(event.target.value)}
              required
            />
          </QuickAddField>

          {selectedClientId && !clientDetail.isPending && profiles.length === 0 ? (
            <div className="rounded-lg border border-ddhq-review/30 bg-ddhq-review-soft p-3 text-xs leading-5 text-ddhq-review">
              This client does not have a filing profile yet. Add one from the client detail page before creating a task.
            </div>
          ) : null}

          {selectedProfile ? (
            <div className="rounded-lg border border-ddhq-line bg-ddhq-paper-muted/55 px-3 py-2 text-xs leading-5 text-muted-foreground">
              Filing profile: <span className="font-medium text-foreground">{selectedProfile.displayName}</span>
            </div>
          ) : null}

          <DialogFooter className="flex-row justify-end border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={createManual.isPending}
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createManual.isPending || !canSubmit}>
              <CalendarPlus className="size-3.5" />
              Add task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function QuickAddField({
  children,
  htmlFor,
  label,
}: {
  children: React.ReactNode;
  htmlFor: string;
  label: string;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function QuickAddSelectLabel({ children }: { children: React.ReactNode }) {
  return <span className="min-w-0 flex-1 truncate text-left">{children}</span>;
}

function getOptionLabel<T extends string>(
  options: readonly { value: T; label: string }[],
  value: T,
): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

function getProfilePlaceholder(isLoading: boolean, profiles: FilingProfileResponse[]): string {
  if (isLoading) return "Loading profiles";
  if (profiles.length === 0) return "No filing profiles";
  return "Select profile";
}

function getProfileLabel(profile: FilingProfileResponse): string {
  return profile.states.length > 0
    ? `${profile.displayName} - ${profile.states.join(", ")}`
    : profile.displayName;
}

function DashboardEmptyState() {
  return (
    <section className="grid min-h-60 place-items-center ddhq-panel px-4 py-8 text-center">
      <div className="max-w-xl">
        <div className="mx-auto grid size-9 place-items-center rounded-lg border border-border bg-muted/40 text-primary">
          <FileUp className="size-4" />
        </div>
        <h2 className="mt-3 text-base font-semibold">Import clients and tax profiles</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Start a new workspace by importing one CSV. Each row can create or match a client relationship, create a filing profile, and generate tasks from Verified tax rules.
        </p>
        <Link
          to="/import"
          search={{ clientIds: undefined }}
          className="mt-4 inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <FileUp className="size-3.5" />
          Import clients and tax profiles
        </Link>
      </div>
    </section>
  );
}

type DeadlineTimelineItem = {
  date: string;
  daysLabel: string;
  id: string;
  isDone: boolean;
  isNext: boolean;
  title: string;
};

type TaxCategoryItem = {
  chartColor: string;
  colorClass: string;
  count: number;
  label: string;
  percent: number;
};

const taxCategoryToneStyles = [
  { chartColor: "var(--primary)", colorClass: "bg-primary" },
  { chartColor: "var(--ddhq-verified)", colorClass: "bg-ddhq-verified" },
  { chartColor: "var(--ddhq-review)", colorClass: "bg-ddhq-review" },
  { chartColor: "var(--ddhq-risk)", colorClass: "bg-ddhq-risk" },
  { chartColor: "var(--ddhq-gap)", colorClass: "bg-ddhq-gap" },
];

function DeadlineTimeline({
  items,
  label,
}: {
  items: DeadlineTimelineItem[];
  label: string;
}) {
  if (items.length === 0) return null;

  return (
    <section className="ddhq-panel p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold leading-tight">Deadline timeline</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {label} workload by official due date
          </p>
        </div>
      </div>
      <div className="overflow-x-auto pb-1">
        <ol
          className="relative grid min-w-[760px] gap-0"
          style={{ gridTemplateColumns: `repeat(${items.length}, minmax(116px, 1fr))` }}
        >
          <span
            aria-hidden="true"
            className="absolute left-[58px] right-[58px] top-[44px] h-px bg-border"
          />
          {items.map((item) => (
            <li key={item.id} className="relative grid justify-items-center gap-2 px-2 text-center">
              <div className="h-6">
                {item.isDone ? (
                  <span className="inline-flex h-6 items-center rounded-md bg-ddhq-verified-soft px-2 text-[11px] font-semibold text-ddhq-verified">
                    Done
                  </span>
                ) : item.isNext ? (
                  <span className="inline-flex h-6 items-center rounded-md bg-ddhq-accent-soft px-2 text-[11px] font-semibold text-primary">
                    Next
                  </span>
                ) : null}
              </div>
              <div className="relative z-10 grid h-6 place-items-center">
                <span
                  className={
                    item.isDone
                      ? "grid size-5 place-items-center rounded-full bg-ddhq-verified text-white"
                      : item.isNext
                        ? "grid size-6 place-items-center rounded-full border-[5px] border-primary bg-ddhq-paper-raised shadow-[0_0_0_3px_rgba(37,99,235,0.12)]"
                        : "size-5 rounded-full border-2 border-ddhq-gap/65 bg-ddhq-paper-raised"
                  }
                >
                  {item.isDone ? <Check className="size-3" /> : null}
                </span>
              </div>
              <time
                dateTime={item.date}
                className={
                  item.isNext
                    ? "mt-1 text-sm font-semibold text-primary"
                    : "mt-1 text-sm font-semibold"
                }
              >
                {formatMonthDay(item.date)}
              </time>
              <div className="min-h-10 max-w-[148px] text-xs leading-4">
                <div className="line-clamp-2 font-medium">{item.title}</div>
                <div
                  className={
                    item.isDone
                      ? "mt-0.5 text-ddhq-verified"
                      : item.isNext
                        ? "mt-0.5 text-primary"
                        : "mt-0.5 text-muted-foreground"
                  }
                >
                  {item.daysLabel}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function TaxCategoryDonut({
  items,
  label,
  total,
}: {
  items: TaxCategoryItem[];
  label: string;
  total: number;
}) {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

  if (total === 0) return null;

  return (
    <aside className="ddhq-panel p-4">
      <h2 className="text-base font-semibold leading-tight">Tax category overview</h2>
      <p className="mt-1 text-xs text-muted-foreground">{label} workload only</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-[136px_minmax(0,1fr)] xl:grid-cols-1 2xl:grid-cols-[136px_minmax(0,1fr)]">
        <div
          role="img"
          aria-label={`Tax category overview: ${items.map((item) => `${item.label} ${item.count}`).join(", ")}`}
          className="relative size-32 overflow-visible"
          onMouseLeave={() => setActiveIndex(null)}
        >
          <PieChart width={128} height={128}>
            <Tooltip
              allowEscapeViewBox={{ x: true, y: true }}
              content={TaxCategoryTooltip}
              cursor={false}
              isAnimationActive={false}
              wrapperStyle={{ outline: "none", zIndex: 20 }}
            />
            <Pie
              data={items}
              dataKey="count"
              nameKey="label"
              cx={64}
              cy={64}
              innerRadius={40}
              outerRadius={58}
              startAngle={90}
              endAngle={-270}
              isAnimationActive={false}
              onMouseEnter={(_data, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              stroke="var(--ddhq-surface)"
              strokeWidth={2}
            >
              {items.map((item, index) => {
                const isActive = activeIndex === index;

                return (
                  <Cell
                    key={item.label}
                    fill={item.chartColor}
                    opacity={activeIndex === null || isActive ? 1 : 0.48}
                    stroke={isActive ? "var(--ddhq-ink)" : "var(--ddhq-surface)"}
                    strokeWidth={isActive ? 3 : 2}
                  />
                );
              })}
            </Pie>
          </PieChart>
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
            <div>
              <div className="font-mono text-xl font-semibold tabular-nums">{total}</div>
              <div className="text-xs text-muted-foreground">tasks</div>
            </div>
          </div>
        </div>
        <ul className="grid content-center gap-3">
          {items.map((item) => (
            <li key={item.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className={`size-2.5 rounded-full ${item.colorClass}`} />
                <span className="truncate text-sm font-medium">{item.label}</span>
              </div>
              <span className="font-mono text-xs text-muted-foreground tabular-nums">
                {item.count} ({item.percent}%)
              </span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

function TaxCategoryTooltip({
  active,
  payload,
}: TooltipContentProps) {
  const item = payload[0]?.payload as TaxCategoryItem | undefined;

  if (!active || !item) {
    return null;
  }

  return (
    <div className="rounded-md border border-ddhq-line bg-ddhq-paper-raised px-3 py-2 text-xs shadow-[0_1px_0_oklch(0.44_0.025_78/0.035)]">
      <div className="font-medium text-foreground">{item.label}</div>
      <div className="mt-1 font-mono text-muted-foreground tabular-nums">
        {item.count} ({item.percent}%)
      </div>
    </div>
  );
}

function filterFocusedTasks(
  tasks: DashboardTaskRow[],
  {
    exceptionFocus,
    selectedDate,
  }: {
    exceptionFocus: DashboardExceptionFocus | null;
    selectedDate: string | null;
  },
): DashboardTaskRow[] {
  return tasks.filter((task) => {
    if (selectedDate && task.currentDueDate !== selectedDate) return false;
    if (!exceptionFocus) return true;

    switch (exceptionFocus) {
      case "source_changed":
        return task.verificationStatus === "source_changed";
      case "needs_review":
        return task.verificationStatus === "needs_review";
      case "entered_deadline":
        return task.verificationStatus === "entered_deadline";
      case "waiting_on_client":
        return task.status === "waiting_on_client";
    }
  });
}

function createWorkloadCalendarMonths(
  tasks: DashboardTaskRow[],
  today: string,
  horizon: DashboardTaskHorizon,
  selectedDate: string | null,
): WorkloadCalendarMonth[] {
  const monthKeys = getCalendarMonthKeys(tasks, today, horizon, selectedDate);
  const tasksByDate = groupTasksByDueDate(tasks);

  return monthKeys.map((monthKey) => {
    const monthStart = new Date(`${monthKey}-01T00:00:00.000Z`);
    const gridStart = addUtcDays(monthStart, -monthStart.getUTCDay());
    const currentMonth = monthStart.getUTCMonth();

    return {
      id: monthKey,
      label: monthKey,
      days: Array.from({ length: 42 }, (_, index) => {
        const date = addUtcDays(gridStart, index);
        const dateKey = toDateKey(date);
        const dateTasks = tasksByDate.get(dateKey) ?? [];
        const doneCount = dateTasks.filter((task) => task.status === "done").length;

        return {
          count: dateTasks.length,
          date: dateKey,
          dayOfMonth: date.getUTCDate(),
          doneCount,
          incompleteCount: dateTasks.length - doneCount,
          isCurrentMonth: date.getUTCMonth() === currentMonth,
          isSelected: selectedDate === dateKey,
          isToday: today === dateKey,
          tone: getDayWorkloadTone(dateTasks),
        };
      }),
    };
  });
}

function getCalendarMonthKeys(
  tasks: DashboardTaskRow[],
  today: string,
  horizon: DashboardTaskHorizon,
  selectedDate: string | null,
): string[] {
  const relevantDates = tasks.map((task) => task.currentDueDate);

  if (selectedDate) {
    relevantDates.push(selectedDate);
  }

  if (relevantDates.length === 0 || horizon === "due_this_week" || horizon === "this_month") {
    return [today.slice(0, 7)];
  }

  const sortedDates = relevantDates.sort();
  const startMonth = sortedDates[0]?.slice(0, 7) ?? today.slice(0, 7);
  const endMonth = sortedDates.at(-1)?.slice(0, 7) ?? today.slice(0, 7);
  const monthKeys: string[] = [];
  let cursor = new Date(`${startMonth}-01T00:00:00.000Z`);
  const end = new Date(`${endMonth}-01T00:00:00.000Z`);

  while (cursor <= end) {
    monthKeys.push(toMonthKey(cursor));
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
  }

  return monthKeys;
}

function getVisibleCalendarMonthId(
  months: WorkloadCalendarMonth[],
  requestedMonthId: string | null,
  selectedDate: string | null,
  today: string,
): string {
  const selectedMonthId = selectedDate?.slice(0, 7);

  for (const candidate of [requestedMonthId, selectedMonthId, today.slice(0, 7)]) {
    if (candidate && months.some((month) => month.id === candidate)) {
      return candidate;
    }
  }

  return months[0]?.id ?? today.slice(0, 7);
}

function groupTasksByDueDate(tasks: DashboardTaskRow[]): Map<string, DashboardTaskRow[]> {
  const map = new Map<string, DashboardTaskRow[]>();

  for (const task of tasks) {
    const group = map.get(task.currentDueDate);
    if (group) {
      group.push(task);
    } else {
      map.set(task.currentDueDate, [task]);
    }
  }

  return map;
}

function getDayWorkloadTone(tasks: DashboardTaskRow[]): WorkloadTone {
  if (tasks.length === 0) return "empty";

  if (tasks.every((task) => task.status === "done")) {
    return "done";
  }

  if (tasks.some((task) => task.status !== "done" && task.urgency === "overdue")) {
    return "overdue";
  }

  const hasRisk = tasks.some(
    (task) =>
      task.status !== "done" &&
      (task.urgency === "due_today" ||
        task.verificationStatus === "source_changed" ||
        task.verificationStatus === "needs_review" ||
        task.status === "waiting_on_client"),
  );

  if (hasRisk) return "risk";
  if (tasks.length <= 2) return "low";
  if (tasks.length <= 5) return "medium";

  return "high";
}

function createExceptionItems(tasks: DashboardTaskRow[]): ExceptionItem[] {
  return [
    {
      count: tasks.filter((task) => task.verificationStatus === "source_changed").length,
      description: "Source changed",
      id: "source_changed",
      label: "Source changed",
    },
    {
      count: tasks.filter((task) => task.verificationStatus === "needs_review").length,
      description: "Needs review",
      id: "needs_review",
      label: "Needs review",
    },
    {
      count: tasks.filter((task) => task.verificationStatus === "entered_deadline").length,
      description: "Entered deadline",
      id: "entered_deadline",
      label: "Entered deadline",
    },
    {
      count: tasks.filter((task) => task.status === "waiting_on_client").length,
      description: "Waiting on client",
      id: "waiting_on_client",
      label: "Waiting on client",
    },
  ];
}

function createHorizonProgressItems(
  tasks: DashboardTaskRow[],
  horizon: DashboardTaskHorizon,
  today: string,
): HorizonProgressItem[] {
  return horizonProgressBuckets[horizon].map((bucket) => {
    const bucketTasks = tasks.filter((task) => isTaskInProgressBucket(task, bucket, today));
    const done = bucketTasks.filter((task) => task.status === "done").length;
    const total = bucketTasks.length;
    const open = total - done;

    return {
      completionPercent: total > 0 ? Math.round((done / total) * 100) : 0,
      description: bucket.description,
      done,
      id: bucket.id,
      label: bucket.label,
      open,
      total,
    };
  });
}

function isTaskInProgressBucket(
  task: DashboardTaskRow,
  bucket: HorizonProgressBucket,
  today: string,
): boolean {
  const dayDifference = getDayDifference(task.currentDueDate, today);

  if (bucket.direction === "past") {
    if (dayDifference >= 0) return false;
    return bucket.days === null || Math.abs(dayDifference) <= bucket.days;
  }

  if (dayDifference < 0) return false;
  return bucket.days === null || dayDifference <= bucket.days;
}

const exceptionFocusLabels = {
  source_changed: "Source changed",
  needs_review: "Needs review",
  entered_deadline: "Entered deadline",
  waiting_on_client: "Waiting on client",
} satisfies Record<DashboardExceptionFocus, string>;

function createFocusSummary({
  exceptionFocus,
  selectedDate,
}: {
  exceptionFocus: DashboardExceptionFocus | null;
  selectedDate: string | null;
}): string | null {
  const parts = [
    selectedDate ? `Date ${selectedDate}` : null,
    exceptionFocus ? exceptionFocusLabels[exceptionFocus] : null,
  ].filter(Boolean);

  return parts.length > 0 ? `Focused: ${parts.join(" + ")}` : null;
}

function getCalendarDayClassName(
  day: WorkloadCalendarDay,
  activeHorizon: DashboardTaskHorizon,
): string {
  const calendarTone = horizonCalendarToneStyles[activeHorizon];
  const toneClass =
    day.tone === "empty"
      ? "bg-background text-muted-foreground/50 hover:bg-muted"
      : day.tone === "done"
        ? "bg-ddhq-verified-soft/70 text-ddhq-verified hover:bg-ddhq-verified-soft"
      : day.tone === "overdue"
        ? "bg-ddhq-risk-soft text-ddhq-risk hover:bg-ddhq-risk-soft/85"
        : calendarTone.tones[day.tone];
  const currentMonthClass = day.isCurrentMonth ? "" : "opacity-45";
  const selectedClass = day.isSelected ? calendarTone.selectedRing : "";
  const borderClass =
    day.isSelected || day.isToday ? calendarTone.selectedBorder : "border-border/70";

  return [
    "min-h-[38px] rounded-[6px] border p-1 text-left text-[10px] transition-colors focus-visible:outline-none focus-visible:ring-2",
    calendarTone.focusRing,
    toneClass,
    currentMonthClass,
    selectedClass,
    borderClass,
  ].join(" ");
}

type WorkloadCalendarDay = {
  count: number;
  date: string;
  dayOfMonth: number;
  doneCount: number;
  incompleteCount: number;
  isCurrentMonth: boolean;
  isSelected: boolean;
  isToday: boolean;
  tone: WorkloadTone;
};

type WorkloadCalendarMonth = {
  days: WorkloadCalendarDay[];
  id: string;
  label: string;
};

type WorkloadCalendarGridCell =
  | { day: WorkloadCalendarDay; id: string; kind: "day" }
  | { id: string; kind: "placeholder" };

type ExceptionItem = {
  count: number;
  description: string;
  id: DashboardExceptionFocus;
  label: string;
};

const workloadCalendarGridCellCount = 42;

function getStableWorkloadCalendarGridCells(
  days: WorkloadCalendarDay[],
  monthId: string,
): WorkloadCalendarGridCell[] {
  const dayCells: WorkloadCalendarGridCell[] = days
    .slice(0, workloadCalendarGridCellCount)
    .map((day) => ({ day, id: day.date, kind: "day" }));
  const placeholderCount = workloadCalendarGridCellCount - dayCells.length;

  if (placeholderCount <= 0) return dayCells;

  return [
    ...dayCells,
    ...Array.from({ length: placeholderCount }, (_, index) => ({
      id: `${monthId}-placeholder-${index}`,
      kind: "placeholder" as const,
    })),
  ];
}

function WorkloadCalendar({
  activeHorizon,
  months,
  onChangeMonth,
  onSelectDate,
  selectedDate,
  taskCount,
  today,
  visibleMonthId,
}: {
  activeHorizon: DashboardTaskHorizon;
  months: WorkloadCalendarMonth[];
  onChangeMonth: (monthId: string) => void;
  onSelectDate: (date: string) => void;
  selectedDate: string | null;
  taskCount: number;
  today: string;
  visibleMonthId: string;
}) {
  const visibleMonthIndex = Math.max(
    0,
    months.findIndex((month) => month.id === visibleMonthId),
  );
  const visibleMonth = months[visibleMonthIndex] ?? months[0];
  const visibleRange = visibleMonth?.label ?? today.slice(0, 7);
  const calendarTone = horizonCalendarToneStyles[activeHorizon];
  const canGoPrevious = visibleMonthIndex > 0;
  const canGoNext = visibleMonthIndex < months.length - 1;
  const visibleMonthKey = visibleMonth?.id ?? today.slice(0, 7);
  const visibleCalendarCells = getStableWorkloadCalendarGridCells(
    visibleMonth?.days ?? [],
    visibleMonthKey,
  );

  return (
    <div className="min-w-0">
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <div className="flex shrink-0 items-center gap-2 text-sm font-semibold">
            <CalendarDays className={`size-4 ${calendarTone.icon}`} />
            Workload calendar
          </div>
          <span className="text-xs text-muted-foreground">
            {visibleRange} density for {horizonLabels[activeHorizon].toLowerCase()} deadlines
          </span>
        </div>
        <div className="flex min-h-7 flex-wrap items-center justify-end gap-1.5 text-xs text-muted-foreground">
          <span className="font-mono tabular-nums">{taskCount} tasks</span>
          {months.length > 1 ? (
            <div className="inline-flex h-6 items-center rounded-md bg-transparent">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="size-6"
                disabled={!canGoPrevious}
                aria-label="Previous workload month"
                onClick={() => {
                  const previousMonth = months[visibleMonthIndex - 1];
                  if (previousMonth) onChangeMonth(previousMonth.id);
                }}
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <span className="px-1.5 font-mono text-[11px] font-semibold tabular-nums text-foreground">
                {visibleMonthIndex + 1}/{months.length}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="size-6"
                disabled={!canGoNext}
                aria-label="Next workload month"
                onClick={() => {
                  const nextMonth = months[visibleMonthIndex + 1];
                  if (nextMonth) onChangeMonth(nextMonth.id);
                }}
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          ) : null}
          {selectedDate ? (
            <button
              type="button"
              className="rounded-md border border-ddhq-line bg-ddhq-paper px-2 py-1 font-medium text-foreground hover:bg-muted"
              onClick={() => onSelectDate(selectedDate)}
            >
              Clear date focus
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-2">
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-muted-foreground">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={`${visibleMonthKey}-${day}`} className="h-4">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {visibleCalendarCells.map((cell) => {
            if (cell.kind === "placeholder") {
              return (
                <div
                  key={cell.id}
                  aria-hidden="true"
                  className="min-h-[38px] rounded-[6px] border border-transparent p-1"
                />
              );
            }

            const day = cell.day;

            return (
              <button
                key={cell.id}
                type="button"
                className={getCalendarDayClassName(day, activeHorizon)}
                aria-pressed={day.isSelected}
                aria-label={`${day.date}: ${day.incompleteCount} open and ${day.doneCount} done deadline task${day.count === 1 ? "" : "s"}`}
                onClick={() => onSelectDate(day.date)}
              >
                <span className="flex items-center justify-between gap-1">
                  <span className="font-mono tabular-nums">{day.dayOfMonth}</span>
                  {day.tone === "risk" || day.tone === "overdue" ? (
                    <AlertTriangle className="size-3" />
                  ) : null}
                </span>
                <span className="mt-0.5 flex min-w-0 items-center gap-1 text-[10px] font-semibold leading-4">
                  {day.count > 0 ? (
                    <>
                      {day.incompleteCount > 0 ? (
                        <span className="truncate">
                          {day.incompleteCount} open
                        </span>
                      ) : (
                        <span className="truncate text-ddhq-verified">
                          done
                        </span>
                      )}
                    </>
                  ) : (
                    <span aria-hidden="true"> </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const exceptionToneStyles = {
  source_changed: {
    activeCard: "border-[oklch(0.72_0.055_285)] bg-[oklch(0.955_0.026_285)]",
    badge:
      "border-[oklch(0.72_0.055_285/0.55)] bg-[oklch(0.955_0.026_285)] text-[oklch(0.46_0.105_285)]",
    idleHover: "hover:bg-[oklch(0.955_0.026_285/0.65)]",
  },
  needs_review: {
    activeCard: "border-ddhq-gap/30 bg-ddhq-gap-soft/70",
    badge: "border-ddhq-gap/25 bg-ddhq-gap-soft text-ddhq-gap",
    idleHover: "hover:bg-ddhq-gap-soft/35",
  },
  entered_deadline: {
    activeCard: "border-border bg-muted/70",
    badge: "border-border bg-muted text-muted-foreground",
    idleHover: "hover:bg-muted",
  },
  waiting_on_client: {
    activeCard: "border-ddhq-review/35 bg-ddhq-review-soft/60",
    badge: "border-ddhq-review/35 bg-ddhq-review-soft text-ddhq-review",
    idleHover: "hover:bg-ddhq-review-soft/30",
  },
} satisfies Record<
  DashboardExceptionFocus,
  { activeCard: string; badge: string; idleHover: string }
>;

function ExceptionSummary({
  activeFocus,
  items,
  onSelect,
}: {
  activeFocus: DashboardExceptionFocus | null;
  items: ExceptionItem[];
  onSelect: (focus: DashboardExceptionFocus) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label="Exception quick filters">
      {items.map((item) => {
        const isActive = activeFocus === item.id;
        const tone = exceptionToneStyles[item.id];

        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={isActive}
            disabled={item.count === 0}
            className={
              isActive
                ? `inline-flex h-7 items-center gap-1.5 rounded-lg border px-2 text-xs font-semibold shadow-[0_1px_0_oklch(0.44_0.025_78/0.04)] ${tone.activeCard}`
                : `inline-flex h-7 items-center gap-1.5 rounded-lg border border-ddhq-line bg-ddhq-paper px-2 text-xs font-semibold text-muted-foreground transition-colors ${tone.idleHover} disabled:cursor-not-allowed disabled:opacity-45`
            }
            title={item.description}
            onClick={() => onSelect(item.id)}
          >
            <span className="truncate">{item.label}</span>
            <span className="font-mono text-[11px] tabular-nums">{item.count}</span>
          </button>
        );
      })}
    </div>
  );
}

function FilterPanel({
  data,
  filters,
  onApply,
  onClose,
  onReset,
  onUpdateFilter,
}: {
  data: DashboardSummaryResponse;
  filters: DashboardSummaryInput;
  onApply: () => void;
  onClose: () => void;
  onReset: () => void;
  onUpdateFilter: <K extends keyof DashboardSummaryInput>(
    key: K,
    value: DashboardSummaryInput[K] | "",
  ) => void;
}) {
  return (
    <div className="absolute left-0 top-10 z-[80] w-[min(900px,calc(100vw-2.5rem))] rounded-xl border border-ddhq-line bg-popover p-3 text-popover-foreground shadow-[var(--ddhq-shadow-soft)] max-md:fixed max-md:inset-x-3 max-md:bottom-3 max-md:top-auto max-md:w-auto max-md:max-h-[82vh] max-md:overflow-auto">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Filters</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Refine the dashboard without changing the page layout.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="size-7"
          aria-label="Close filters"
          onClick={onClose}
        >
          <X className="size-3.5" />
        </Button>
      </div>
      <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-4">
        <FilterSelect
          isActive={Boolean(filters.clientRelationshipId)}
          label="Client"
          value={filters.clientRelationshipId ?? ""}
          onChange={(value) => onUpdateFilter("clientRelationshipId", value)}
          options={data.filterOptions.clientRelationships.map((option) => ({
            value: option.id,
            label: option.label,
          }))}
          placeholder="All clients"
        />
        <FilterSelect
          isActive={Boolean(filters.filingProfileId)}
          label="Filing profile"
          value={filters.filingProfileId ?? ""}
          onChange={(value) => onUpdateFilter("filingProfileId", value)}
          options={data.filterOptions.filingProfiles.map((option) => ({
            value: option.id,
            label: option.label,
          }))}
          placeholder="All profiles"
        />
        <FilterSelect
          isActive={Boolean(filters.jurisdiction)}
          label="Jurisdiction"
          value={filters.jurisdiction ?? ""}
          onChange={(value) => onUpdateFilter("jurisdiction", value)}
          options={data.filterOptions.jurisdictions.map((value) => ({
            value,
            label: value,
          }))}
          placeholder="All jurisdictions"
        />
        <FilterSelect
          isActive={Boolean(filters.entityType)}
          label="Entity type"
          value={filters.entityType ?? ""}
          onChange={(value) =>
            onUpdateFilter("entityType", value as DashboardSummaryInput["entityType"] | "")
          }
          options={data.filterOptions.entityTypes.map((value) => ({ value, label: value }))}
          placeholder="All entities"
        />
        <FilterSelect
          isActive={Boolean(filters.taxCategory)}
          label="Tax type"
          value={filters.taxCategory ?? ""}
          onChange={(value) => onUpdateFilter("taxCategory", value)}
          options={data.filterOptions.taxCategories.map((value) => ({
            value,
            label: value,
          }))}
          placeholder="All tax types"
        />
        <FilterSelect
          isActive={Boolean(filters.taskStatus)}
          label="Status"
          value={filters.taskStatus ?? ""}
          onChange={(value) =>
            onUpdateFilter("taskStatus", value as DashboardSummaryInput["taskStatus"] | "")
          }
          options={data.filterOptions.taskStatuses.map((value) => ({
            value,
            label: statusLabels[value],
          }))}
          placeholder="All statuses"
        />
        <FilterSelect
          isActive={Boolean(filters.verificationStatus)}
          label="Verification"
          value={filters.verificationStatus ?? ""}
          onChange={(value) =>
            onUpdateFilter(
              "verificationStatus",
              value as DashboardSummaryInput["verificationStatus"] | "",
            )
          }
          options={data.filterOptions.verificationStatuses.map((value) => ({
            value,
            label: verificationLabels[value],
          }))}
          placeholder="All verification"
        />
        <FilterSelect
          isActive={(filters.sort ?? "smart_priority") !== "smart_priority"}
          label="Sort"
          value={filters.sort ?? "smart_priority"}
          onChange={(value) => onUpdateFilter("sort", value as DashboardSort)}
          options={Object.entries(sortLabels).map(([value, label]) => ({ value, label }))}
        />
      </div>
      <div className="mt-3 flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onReset}>
          <RotateCcw className="size-3.5" />
          Reset filters
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onApply}>
          Done
        </Button>
      </div>
    </div>
  );
}

function DashboardPagination({
  count,
  onPageChange,
  page,
  pageSize,
  totalPages,
}: {
  count: number;
  onPageChange: (page: number) => void;
  page: number;
  pageSize: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, count);
  const items = getVisiblePageItems(page, totalPages);

  function goToPage(nextPage: number) {
    return (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      onPageChange(nextPage);
    };
  }

  return (
    <div className="flex flex-col gap-2 px-1 py-1 md:flex-row md:items-center md:justify-between">
      <div className="text-xs text-muted-foreground">
        Showing {start}-{end} of {count} rows
      </div>
      <Pagination className="mx-0 w-auto justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              className={page === 1 ? "pointer-events-none opacity-50" : undefined}
              aria-disabled={page === 1}
              onClick={goToPage(page - 1)}
              text="Prev"
            />
          </PaginationItem>
          {items.map((item) => (
            <PaginationItem key={item}>
              {typeof item === "number" ? (
                <PaginationLink
                  href="#"
                  isActive={item === page}
                  onClick={goToPage(item)}
                >
                  {item}
                </PaginationLink>
              ) : (
                <PaginationEllipsis />
              )}
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              href="#"
              className={page === totalPages ? "pointer-events-none opacity-50" : undefined}
              aria-disabled={page === totalPages}
              onClick={goToPage(page + 1)}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

function getVisiblePageItems(page: number, totalPages: number): Array<number | string> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  const sortedPages = [...pages]
    .filter((item) => item >= 1 && item <= totalPages)
    .sort((a, b) => a - b);
  const items: Array<number | string> = [];

  for (const current of sortedPages) {
    const previous = items.at(-1);
    if (typeof previous === "number" && current - previous > 1) {
      items.push(`ellipsis-${previous}-${current}`);
    }
    items.push(current);
  }

  return items;
}

function HorizonCard({
  count,
  horizon,
  isSelected,
  onSelect,
  summary,
}: {
  count: number;
  horizon: DashboardTaskHorizon;
  isSelected: boolean;
  onSelect: () => void;
  summary: string;
}) {
  const tone = horizonToneStyles[horizon];
  const cardClass = isSelected ? tone.activeCard : tone.idleCard;

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      className={`h-[76px] rounded-[7px] border border-transparent px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35 ${cardClass}`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={`flex h-5 items-center gap-2 text-[13px] font-semibold ${tone.title}`}>
            <span className={`size-1.5 rounded-full ${tone.dot}`} aria-hidden="true" />
            {horizonLabels[horizon]}
          </div>
          <div className="mt-1.5 line-clamp-2 h-8 text-xs leading-4 text-muted-foreground">
            {summary}
          </div>
        </div>
        <div className={`w-[4ch] shrink-0 text-right font-mono text-lg font-semibold leading-none tabular-nums ${tone.count}`}>
          {count}
        </div>
      </div>
    </button>
  );
}

function HorizonProgressSummary({
  activeHorizon,
  className = "",
  items,
}: {
  activeHorizon: DashboardTaskHorizon;
  className?: string;
  items: HorizonProgressItem[];
}) {
  const progressFillClassName = horizonProgressFillClassNames[activeHorizon];
  const totalOpen = items.at(-1)?.open ?? 0;
  const totalTasks = items.at(-1)?.total ?? 0;
  const totalDone = Math.max(totalTasks - totalOpen, 0);
  const totalCompletionPercent = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0;

  return (
    <aside className={`min-w-0 px-1 py-1 ${className}`}>
      <div className="grid gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold leading-tight">Workload summary</div>
          <p className="mt-1 text-xs leading-4 text-muted-foreground">
            {horizonLabels[activeHorizon]} by official due-date window
          </p>
        </div>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs font-semibold">
          <span className="font-mono text-ddhq-review tabular-nums">{totalOpen} open</span>
          <span className="font-mono text-ddhq-verified tabular-nums">{totalDone} done</span>
          <span className="font-mono text-muted-foreground tabular-nums">
            {totalCompletionPercent}%
          </span>
        </div>
      </div>

      <ul className="mt-5 grid gap-7">
        {items.map((item) => (
          <li key={item.id} className="grid gap-2">
            <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <div className="truncate text-xs font-semibold text-foreground">
                {item.label}
              </div>
              <div className="flex shrink-0 items-baseline gap-2 text-[11px] font-semibold">
                <span className="font-mono text-ddhq-review tabular-nums">
                  {item.open} open
                </span>
                <span className="font-mono text-ddhq-verified tabular-nums">
                  {item.done} done
                </span>
                <span className="font-mono text-muted-foreground tabular-nums">
                  {item.completionPercent}%
                </span>
              </div>
            </div>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-ddhq-paper shadow-inner"
              role="progressbar"
              aria-label={`${item.description}: ${item.done} of ${item.total} done`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={item.completionPercent}
            >
              <div
                className={`h-full rounded-full ${progressFillClassName}`}
                style={{ width: `${item.completionPercent}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function getHorizonSummary(
  horizon: DashboardTaskHorizon,
  data: DashboardSummaryResponse,
): string {
  switch (horizon) {
    case "overdue":
      return data.summary.overdue > 0 ? "Past-due work needs review" : "No overdue work";
    case "due_this_week":
      return data.summary.dueToday > 0
        ? `${data.summary.dueToday} due today`
        : "Default weekly queue";
    case "this_month":
      return "Upcoming monthly planning";
    case "long_range":
      return "Future deadlines to monitor";
  }
}

function createDeadlineTimelineItems(
  tasks: DashboardTaskRow[],
  today: string,
): DeadlineTimelineItem[] {
  const groupedByDate = new Map<string, DashboardTaskRow[]>();

  for (const task of tasks) {
    const group = groupedByDate.get(task.currentDueDate);
    if (group) {
      group.push(task);
    } else {
      groupedByDate.set(task.currentDueDate, [task]);
    }
  }

  const groups = [...groupedByDate.entries()]
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, dateTasks]) => ({
      date,
      tasks: dateTasks.sort((a, b) => a.title.localeCompare(b.title)),
    }));

  const nextIndex = groups.findIndex(({ date, tasks: dateTasks }) =>
    date >= today && dateTasks.some((task) => task.status !== "done"),
  );
  const anchorIndex = nextIndex >= 0 ? nextIndex : Math.max(groups.length - 1, 0);
  const start = Math.max(0, Math.min(anchorIndex - 2, groups.length - 6));
  const visibleGroups = groups.slice(start, start + 6);
  const nextDate = nextIndex >= 0 ? groups[nextIndex]?.date : null;

  return visibleGroups.map(({ date, tasks: dateTasks }) => {
    const incompleteTasks = dateTasks.filter((task) => task.status !== "done");
    const leadTask = incompleteTasks[0] ?? dateTasks[0];
    const allDone = dateTasks.every((task) => task.status === "done");
    const count = dateTasks.length;

    return {
      date,
      daysLabel: getTimelineDaysLabel(date, today, allDone, count),
      id: date,
      isDone: allDone,
      isNext: date === nextDate,
      title: count > 1 ? `${leadTask.title} +${count - 1}` : leadTask.title,
    };
  });
}

function getTimelineDaysLabel(
  date: string,
  today: string,
  isDone: boolean,
  count: number,
): string {
  if (isDone) return "Done";

  const days = getDayDifference(date, today);
  const suffix = count > 1 ? `, ${count} tasks` : "";

  if (days === 0) {
    const countSuffix = count > 1 ? ` · ${count} tasks` : "";
    return `${formatDueTodayCountdown({ dateKey: date })}${countSuffix}`;
  }
  if (days < 0) return `${Math.abs(days)} days overdue${suffix}`;

  return `${days} days left${suffix}`;
}

function createTaxCategoryItems(tasks: DashboardTaskRow[]): TaxCategoryItem[] {
  const grouped = new Map<string, number>();

  for (const task of tasks) {
    grouped.set(task.taxCategory, (grouped.get(task.taxCategory) ?? 0) + 1);
  }

  const total = tasks.length;
  const sortedItems = [...grouped.entries()].sort(([, countA], [, countB]) => countB - countA);
  const visibleItems = sortedItems.slice(0, 4);
  const otherCount = sortedItems
    .slice(4)
    .reduce((sum, [, count]) => sum + count, 0);
  const chartItems = otherCount > 0 ? [...visibleItems, ["Other", otherCount] as const] : visibleItems;

  return chartItems.map(([label, count], index) => ({
    ...taxCategoryToneStyles[index % taxCategoryToneStyles.length],
    count,
    label,
    percent: total > 0 ? Math.round((count / total) * 100) : 0,
  }));
}

function FilterSelect({
  isActive = false,
  label,
  onChange,
  options,
  placeholder,
  value,
}: {
  isActive?: boolean;
  label: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  value: string;
}) {
  return (
    <label className="grid min-w-0 gap-1 text-xs font-medium text-muted-foreground">
      {label}
      <Select value={value} onValueChange={(val) => onChange(val ?? "")}>
        <SelectTrigger
          className={
            isActive
              ? "h-8 w-full min-w-0 overflow-hidden rounded-lg *:data-[slot=select-value]:min-w-0 *:data-[slot=select-value]:overflow-hidden *:data-[slot=select-value]:truncate *:data-[slot=select-value]:font-semibold *:data-[slot=select-value]:text-primary"
              : "h-8 w-full min-w-0 overflow-hidden rounded-lg *:data-[slot=select-value]:min-w-0 *:data-[slot=select-value]:overflow-hidden *:data-[slot=select-value]:truncate"
          }
        >
          <SelectValue className="truncate" placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="z-[100] rounded-lg" positionerClassName="z-[100]">
          {placeholder ? <SelectItem value="">{placeholder}</SelectItem> : null}
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

function createDashboardCsv(rows: DashboardTaskRow[]): string {
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
        row.sourceType === "entered_deadline" ? "Entered deadline" : row.sourceType,
        row.sourceName,
        row.sourceUrl,
        row.lastVerifiedAt,
        row.sourceLastChangedAt,
        row.priority,
        row.isExtended ? "Extended" : "",
        row.verificationStatus === "entered_deadline"
          ? [
              row.clientRelationship.notes,
              row.verificationLabel,
              row.enteredDeadlineReferenceNote,
            ].filter(Boolean).join(" - ")
          : (row.clientRelationship.notes ?? ""),
      ].map(csvCell).join(","),
    ),
  ];

  return `${lines.join("\n")}\n`;
}

function csvCell(value: string | number | null): string {
  const text = value === null ? "" : String(value);

  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

function downloadCsv({ csv, filename }: { csv: string; filename: string }) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function getDayDifference(date: string, today: string): number {
  const current = new Date(`${date}T00:00:00.000Z`).getTime();
  const base = new Date(`${today}T00:00:00.000Z`).getTime();

  return Math.round((current - base) / (24 * 60 * 60 * 1000));
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function toDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function toMonthKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}
