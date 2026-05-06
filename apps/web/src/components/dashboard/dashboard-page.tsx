import { Button } from "@due-date-hq/ui/components/button";
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
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarDays,
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
import { toast } from "sonner";

import { EvidenceDrawer } from "@/components/evidence/evidence-drawer";
import { BulkTaskActions } from "@/components/task-table/bulk-task-actions";
import { TaskTable } from "@/components/task-table/task-table";
import { formatDueTodayCountdown } from "@/utils/deadline-countdown";
import { formatDate, formatDateTime, formatMonthDay } from "@/utils/date-format";
import { trpc } from "@/utils/trpc";

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

const horizonToneStyles = {
  overdue: {
    activeCard: "border-transparent bg-ddhq-risk-soft/45 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]",
    count: "text-ddhq-risk",
    dot: "bg-ddhq-risk",
    idleCard:
      "border-transparent bg-transparent text-foreground hover:border-transparent hover:bg-ddhq-risk-soft/25",
    title: "text-ddhq-risk",
  },
  due_this_week: {
    activeCard: "border-transparent bg-ddhq-review-soft/50 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]",
    count: "text-ddhq-review",
    dot: "bg-ddhq-review",
    idleCard:
      "border-transparent bg-transparent text-foreground hover:border-transparent hover:bg-ddhq-review-soft/25",
    title: "text-ddhq-review",
  },
  this_month: {
    activeCard: "border-transparent bg-ddhq-accent-soft/45 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]",
    count: "text-primary",
    dot: "bg-primary",
    idleCard:
      "border-transparent bg-transparent text-foreground hover:border-transparent hover:bg-ddhq-accent-soft/25",
    title: "text-primary",
  },
  long_range: {
    activeCard: "border-transparent bg-ddhq-gap-soft/45 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]",
    count: "text-ddhq-gap",
    dot: "bg-ddhq-gap",
    idleCard:
      "border-transparent bg-transparent text-foreground hover:border-transparent hover:bg-ddhq-gap-soft/25",
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
  in_progress: "In progress",
  waiting_on_client: "Waiting on client",
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
      <main className="min-h-0 overflow-auto bg-background text-foreground">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-5 py-5">
          <div className="h-24 animate-pulse rounded-xl border border-border bg-card" />
          <div className="h-12 animate-pulse rounded-xl border border-border bg-card" />
          <div className="h-[420px] animate-pulse rounded-xl border border-border bg-card" />
        </div>
      </main>
    );
  }

  if (dashboard.isError) {
    return (
      <main className="min-h-0 overflow-auto bg-background text-foreground">
        <div className="mx-auto max-w-[1440px] px-5 py-5">
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

  return (
    <main className="h-full min-h-0 overflow-hidden bg-background text-foreground">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[1440px] flex-col gap-3 px-5 py-5">
        {/* Page header */}
        <section className="pb-1">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold leading-tight tracking-normal">
                Deadline dashboard
              </h1>
            </div>
            <div className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground lg:justify-end">
              <span>Today {formatDate(data.today)}</span>
              <span aria-hidden="true" className="text-muted-foreground/60">
                &bull;
              </span>
              <span>Generated {formatDateTime(data.generatedAt)}</span>
            </div>
          </div>
        </section>

        {/* Horizon selector */}
        <section className="grid grid-cols-1 gap-1 rounded-xl border border-border/80 bg-card p-1 md:grid-cols-4">
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
        </section>

        <section className="grid shrink-0 grid-cols-1 gap-2 xl:grid-cols-[minmax(0,1fr)_320px]">
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
          <ExceptionSummary
            activeFocus={exceptionFocus}
            items={exceptionItems}
            onSelect={(focus) => {
              setExceptionFocus((current) => (current === focus ? null : focus));
              setSectionPages(createInitialSectionPages);
            }}
          />
        </section>

        {/* Controls */}
        <section className="flex flex-col gap-2">
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
                <span className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-card px-2 py-1 text-xs font-medium text-muted-foreground">
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
            </div>
          </div>
        </section>

        {/* Task sections */}
        <section className="flex min-h-0 flex-1 basis-1/2 flex-col gap-1">
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

      <EvidenceDrawer taskId={evidenceTaskId} onClose={() => setEvidenceTaskId(null)} />
    </main>
  );
}

function DashboardEmptyState() {
  return (
    <section className="grid min-h-60 place-items-center rounded-lg border border-border/80 bg-card px-4 py-8 text-center">
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
    <section className="rounded-xl border border-border/80 bg-card p-4">
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
                        ? "grid size-6 place-items-center rounded-full border-[5px] border-primary bg-card shadow-[0_0_0_3px_rgba(37,99,235,0.12)]"
                        : "size-5 rounded-full border-2 border-ddhq-gap/65 bg-card"
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
  if (total === 0) return null;

  const radius = 42;
  const donutBackground = createDonutGradient(items, total);

  return (
    <aside className="rounded-xl border border-border/80 bg-card p-4">
      <h2 className="text-base font-semibold leading-tight">Tax category overview</h2>
      <p className="mt-1 text-xs text-muted-foreground">{label} workload only</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-[136px_minmax(0,1fr)] xl:grid-cols-1 2xl:grid-cols-[136px_minmax(0,1fr)]">
        <div
          aria-hidden="true"
          className="relative size-32 rounded-full"
          style={{ background: donutBackground }}
        >
          <div
            className="absolute rounded-full bg-card"
            style={{
              inset: `${60 - radius + 8}px`,
            }}
          />
          <div className="absolute inset-0 grid place-items-center text-center">
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

function createDonutGradient(items: TaxCategoryItem[], total: number): string {
  let start = 0;
  const segments = items.map((item, index) => {
    const end = index === items.length - 1 ? 360 : start + (item.count / total) * 360;
    const segment = `${item.chartColor} ${start}deg ${end}deg`;
    start = end;

    return segment;
  });

  return `conic-gradient(from -90deg, ${segments.join(", ")})`;
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
      description: "Official source changed; evidence should be reviewed.",
      id: "source_changed",
      label: "Source changed",
    },
    {
      count: tasks.filter((task) => task.verificationStatus === "needs_review").length,
      description: "Deadline trust is not ready for automatic reliance.",
      id: "needs_review",
      label: "Needs review",
    },
    {
      count: tasks.filter((task) => task.verificationStatus === "entered_deadline").length,
      description: "Manually entered dates need source context.",
      id: "entered_deadline",
      label: "Entered deadline",
    },
    {
      count: tasks.filter((task) => task.status === "waiting_on_client").length,
      description: "Client-side bottlenecks blocking completion.",
      id: "waiting_on_client",
      label: "Waiting on client",
    },
  ];
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
    "min-h-[44px] rounded-[6px] border p-1 text-left text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2",
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

type ExceptionItem = {
  count: number;
  description: string;
  id: DashboardExceptionFocus;
  label: string;
};

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
  const hasOverdueDays = months.some((month) =>
    month.days.some((day) => day.tone === "overdue"),
  );
  const calendarTone = horizonCalendarToneStyles[activeHorizon];
  const canGoPrevious = visibleMonthIndex > 0;
  const canGoNext = visibleMonthIndex < months.length - 1;
  const showOverdueLegend = hasOverdueDays && activeHorizon !== "overdue";

  return (
    <section className="rounded-lg border border-border/80 bg-card p-2.5">
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <CalendarDays className={`size-4 ${calendarTone.icon}`} />
            Workload calendar
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {visibleRange} density for {horizonLabels[activeHorizon].toLowerCase()} deadlines
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5 text-xs text-muted-foreground">
          <span className="font-mono tabular-nums">{taskCount} tasks</span>
          {months.length > 1 ? (
            <div className="inline-flex items-center rounded-md border border-border bg-background p-0.5">
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
              className="rounded-md border border-border bg-background px-2 py-1 font-medium text-foreground hover:bg-muted"
              onClick={() => onSelectDate(selectedDate)}
            >
              Clear date focus
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-2">
        <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-semibold text-muted-foreground">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={`${visibleMonth?.id ?? "month"}-${day}`} className="h-4">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {(visibleMonth?.days ?? []).map((day) => (
            <button
              key={day.date}
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
                      <span className="shrink-0">
                        {day.incompleteCount} open
                      </span>
                    ) : null}
                    {day.incompleteCount > 0 && day.doneCount > 0 ? (
                      <span aria-hidden="true" className="shrink-0 text-muted-foreground/70">
                        ·
                      </span>
                    ) : null}
                    {day.doneCount > 0 ? (
                      <span className="shrink-0 text-ddhq-verified">
                        {day.doneCount} done
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span aria-hidden="true"> </span>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <CalendarLegendSwatch className={calendarTone.workloadSwatch} label="Workload" />
        {showOverdueLegend ? (
          <CalendarLegendSwatch className="bg-ddhq-risk-soft" label="Overdue" />
        ) : null}
        <CalendarLegendSwatch className="bg-ddhq-verified-soft" label="Done" />
        <CalendarLegendSwatch className={calendarTone.selectedSwatch} label="Selected" />
      </div>
    </section>
  );
}

function CalendarLegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`size-2 rounded-sm border border-border/60 ${className}`} />
      {label}
    </span>
  );
}

const exceptionToneStyles = {
  source_changed: {
    activeCard: "border-[oklch(0.7_0.075_285)] bg-[oklch(0.94_0.035_285)]",
    badge:
      "border-transparent bg-[oklch(0.94_0.035_285)] text-[oklch(0.45_0.12_285)]",
    idleHover: "hover:bg-[oklch(0.94_0.035_285)]",
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

function ExceptionBadge({ item }: { item: ExceptionItem }) {
  return (
    <span
      className={`inline-flex items-center rounded-[6px] border px-1.5 py-0.5 text-[11px] font-semibold leading-[1.1] whitespace-nowrap ${exceptionToneStyles[item.id].badge}`}
    >
      {item.label}
    </span>
  );
}

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
    <aside className="rounded-lg border border-border/80 bg-card p-2.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Exception summary</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Current horizon risks that need human attention
          </p>
        </div>
      </div>
      <div className="mt-2 grid gap-1.5">
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
                  ? `rounded-lg border p-2 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] ${tone.activeCard}`
                  : `rounded-lg border border-border/70 bg-background p-2 text-left transition-colors ${tone.idleHover} disabled:cursor-not-allowed disabled:opacity-55`
              }
              onClick={() => onSelect(item.id)}
            >
              <div className="flex items-center justify-between gap-3">
                <ExceptionBadge item={item} />
                <span className="font-mono text-sm font-semibold tabular-nums">{item.count}</span>
              </div>
              <div className="mt-1 text-xs leading-4 text-muted-foreground">
                {item.description}
              </div>
            </button>
          );
        })}
      </div>
    </aside>
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
    <div className="absolute left-0 top-10 z-[80] w-[min(900px,calc(100vw-2.5rem))] rounded-xl border border-border/80 bg-popover p-3 text-popover-foreground shadow-xl max-md:fixed max-md:inset-x-3 max-md:bottom-3 max-md:top-auto max-md:w-auto max-md:max-h-[82vh] max-md:overflow-auto">
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
      <div className="mt-3 flex justify-end gap-2 border-t border-border/80 pt-3">
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
    <div className="flex flex-col gap-2 rounded-lg border border-border/80 bg-card px-3 py-2 md:flex-row md:items-center md:justify-between">
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
      className={`min-h-[76px] rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35 ${cardClass}`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={`flex items-center gap-2 text-[13px] font-semibold ${tone.title}`}>
            <span className={`size-1.5 rounded-full ${tone.dot}`} aria-hidden="true" />
            {horizonLabels[horizon]}
          </div>
          <div className="mt-1.5 line-clamp-2 text-xs leading-4 text-muted-foreground">
            {summary}
          </div>
        </div>
        <div className={`font-mono text-lg font-semibold leading-none tabular-nums ${tone.count}`}>
          {count}
        </div>
      </div>
    </button>
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
