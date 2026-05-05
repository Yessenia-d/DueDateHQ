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
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { CalendarDays, Check, Download, Filter, RotateCcw } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { EvidenceDrawer } from "@/components/evidence/evidence-drawer";
import { BulkTaskActions } from "@/components/task-table/bulk-task-actions";
import { TaskTable } from "@/components/task-table/task-table";
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
  const exportCurrentView = useMutation(
    trpc.dashboard.export.mutationOptions({
      onSuccess: (result) => {
        const blob = new Blob([result.csv], { type: result.contentType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = result.filename;
        link.click();
        URL.revokeObjectURL(url);
        toast.success(`Exported ${result.rowCount} dashboard rows.`);
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const selectedCount = selectedTaskIds.size;
  const activeSection = React.useMemo<DashboardSection>(() => {
    const section = dashboard.data?.sections.find((item) => item.id === activeHorizon);

    if (!section) {
      return {
        id: activeHorizon,
        label: horizonLabels[activeHorizon],
        count: 0,
        pagination: {
          page: activePage,
          pageSize: dashboardPageSize,
          totalPages: 1,
        },
        tasks: [],
      };
    }

    return {
      ...section,
      label: horizonLabels[section.id],
    };
  }, [activeHorizon, activePage, dashboard.data]);

  React.useEffect(() => {
    const visibleIds = new Set(activeSection.tasks.map((task) => task.id));
    setSelectedTaskIds((current) => {
      const next = new Set([...current].filter((taskId) => visibleIds.has(taskId)));
      return next.size === current.size ? current : next;
    });
  }, [activeSection]);

  function updateFilter<K extends keyof DashboardSummaryInput>(
    key: K,
    value: DashboardSummaryInput[K] | "",
  ) {
    setFilters((current) => {
      const next = { ...current, [key]: value || undefined };
      if (!next.horizon) next.horizon = "all";
      if (!next.sort) next.sort = "smart_priority";
      next.page = 1;
      next.pageSize = dashboardPageSize;
      return next;
    });
    setSectionPages(createInitialSectionPages);
  }

  function resetFilters() {
    setFilters({ ...emptyFilters });
    setSectionPages(createInitialSectionPages);
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

  const isBusy = exportCurrentView.isPending;
  const activeFilterCount = [
    filters.clientRelationshipId,
    filters.filingProfileId,
    filters.jurisdiction,
    filters.entityType,
    filters.taxCategory,
    filters.taskStatus,
    filters.verificationStatus,
  ].filter(Boolean).length;
  const hasNonDefaultFilters =
    activeFilterCount > 0 || (filters.sort ?? "smart_priority") !== "smart_priority";

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
  const activeHorizonTasks = data.allTasks.filter((task) => task.horizon === activeHorizon);
  const timelineItems = createDeadlineTimelineItems(activeHorizonTasks, data.today);
  const categoryItems = createTaxCategoryItems(activeHorizonTasks);
  const showDashboardVisuals = false;

  return (
    <main className="h-full min-h-0 overflow-hidden bg-background text-foreground">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[1440px] flex-col gap-4 px-5 py-5">
        {/* Page header */}
        <section className="pb-1">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <CalendarDays className="size-3.5" />
                Dashboard
              </div>
              <h1 className="mt-1 text-2xl font-semibold leading-tight tracking-normal">
                Deadline dashboard
              </h1>
            </div>
            <div className="grid gap-1 text-xs text-muted-foreground lg:text-right">
              <span>Today {formatDate(data.today)}</span>
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
                onSelect={() => setActiveHorizon(horizon)}
                summary={getHorizonSummary(horizon, data)}
              />
            );
          })}
        </section>

        {/* Timeline and donut chart entries are temporarily hidden; keep implementations for later restore. */}
        {showDashboardVisuals ? (
          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <DeadlineTimeline items={timelineItems} label={horizonLabels[activeHorizon]} />
            <TaxCategoryDonut
              items={categoryItems}
              label={horizonLabels[activeHorizon]}
              total={activeHorizonTasks.length}
            />
          </section>
        ) : null}

        {/* Controls */}
        <section className="flex flex-col gap-2">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-h-8 flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={
                  showFilters
                    ? "rounded-lg border-primary/30 bg-ddhq-accent-soft/70 text-foreground shadow-none"
                    : "rounded-lg"
                }
                onClick={() => setShowFilters((current) => !current)}
              >
                <Filter
                  className={showFilters ? "size-3.5 text-primary" : "size-3.5"}
                />
                Filters
              </Button>
              <span className="text-xs font-medium text-muted-foreground">
                {activeFilterCount > 0 ? `${activeFilterCount} active` : "Default filters"}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 rounded-lg px-2 text-muted-foreground hover:text-foreground disabled:text-muted-foreground/45"
                disabled={!hasNonDefaultFilters}
                onClick={resetFilters}
              >
                <RotateCcw className="size-3.5" />
                Reset filters
              </Button>
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
                className="h-8 w-32 rounded-lg"
                disabled={isBusy}
                onClick={() => exportCurrentView.mutate({ ...filters, horizon: activeHorizon })}
              >
                <Download className="size-3.5" />
                Export view
              </Button>
            </div>
          </div>

          {showFilters ? (
            <div className="grid gap-2 rounded-xl border border-border/80 bg-card p-3 md:grid-cols-3 xl:grid-cols-5">
              <FilterSelect
                isActive={Boolean(filters.clientRelationshipId)}
                label="Client"
                value={filters.clientRelationshipId ?? ""}
                onChange={(value) => updateFilter("clientRelationshipId", value)}
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
                onChange={(value) => updateFilter("filingProfileId", value)}
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
                onChange={(value) => updateFilter("jurisdiction", value)}
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
                  updateFilter("entityType", value as DashboardSummaryInput["entityType"] | "")
                }
                options={data.filterOptions.entityTypes.map((value) => ({ value, label: value }))}
                placeholder="All entities"
              />
              <FilterSelect
                isActive={Boolean(filters.taxCategory)}
                label="Tax type"
                value={filters.taxCategory ?? ""}
                onChange={(value) => updateFilter("taxCategory", value)}
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
                  updateFilter("taskStatus", value as DashboardSummaryInput["taskStatus"] | "")
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
                  updateFilter(
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
                onChange={(value) => updateFilter("sort", value as DashboardSort)}
                options={Object.entries(sortLabels).map(([value, label]) => ({ value, label }))}
              />
            </div>
          ) : null}
        </section>

        {/* Task sections */}
        <section className="flex min-h-0 flex-1 flex-col gap-1">
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
        </section>
      </div>

      <EvidenceDrawer taskId={evidenceTaskId} onClose={() => setEvidenceTaskId(null)} />
    </main>
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

  if (days === 0) return `Due today${suffix}`;
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
    <label className="grid gap-1 text-xs font-medium text-muted-foreground">
      {label}
      <Select value={value} onValueChange={(val) => onChange(val ?? "")}>
        <SelectTrigger
          className={
            isActive
              ? "h-8 w-full rounded-lg *:data-[slot=select-value]:font-semibold *:data-[slot=select-value]:text-primary"
              : "h-8 w-full rounded-lg"
          }
        >
          <SelectValue placeholder={placeholder} />
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

function getDayDifference(date: string, today: string): number {
  const current = new Date(`${date}T00:00:00.000Z`).getTime();
  const base = new Date(`${today}T00:00:00.000Z`).getTime();

  return Math.round((current - base) / (24 * 60 * 60 * 1000));
}
