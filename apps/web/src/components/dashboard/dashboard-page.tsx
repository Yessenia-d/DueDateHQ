import { Button } from "@due-date-hq/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@due-date-hq/ui/components/select";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { CalendarDays, Download, Filter } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { EvidenceDrawer } from "@/components/evidence/evidence-drawer";
import { BulkTaskActions } from "@/components/task-table/bulk-task-actions";
import { TaskTable } from "@/components/task-table/task-table";
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
  sort: "smart_priority",
};

export function DashboardPage() {
  const [filters, setFilters] = React.useState<DashboardSummaryInput>(emptyFilters);
  const [activeHorizon, setActiveHorizon] =
    React.useState<DashboardTaskHorizon>("due_this_week");
  const [selectedTaskIds, setSelectedTaskIds] = React.useState<Set<string>>(new Set());
  const [evidenceTaskId, setEvidenceTaskId] = React.useState<string | null>(null);
  const [showFilters, setShowFilters] = React.useState(false);

  const dashboard = useQuery({
    ...trpc.dashboard.summary.queryOptions(filters),
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
        tasks: [],
      };
    }

    return {
      ...section,
      label: horizonLabels[section.id],
    };
  }, [activeHorizon, dashboard.data]);

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
      return next;
    });
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
              {selectedCount > 0 ? (
                <span className="ml-2 text-sm font-semibold">
                  {selectedCount} selected
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {activeSection.count} rows in current view
                  </span>
                </span>
              ) : null}
            </div>
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

          {showFilters ? (
            <div className="grid gap-2 rounded-xl border border-border/80 bg-card p-3 md:grid-cols-3 xl:grid-cols-5">
              <FilterSelect
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
                label="Entity type"
                value={filters.entityType ?? ""}
                onChange={(value) =>
                  updateFilter("entityType", value as DashboardSummaryInput["entityType"] | "")
                }
                options={data.filterOptions.entityTypes.map((value) => ({ value, label: value }))}
                placeholder="All entities"
              />
              <FilterSelect
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
          <BulkTaskActions
            disabled={isBusy}
            selectedTaskIds={selectedTaskIds}
            taskStatuses={data.filterOptions.taskStatuses}
            onClearSelection={() => setSelectedTaskIds(new Set())}
          />
          <TaskTable
            section={activeSection}
            selectedTaskIds={selectedTaskIds}
            onToggleTask={toggleTask}
            onToggleSection={toggleSection}
            onOpenEvidence={setEvidenceTaskId}
          />
        </section>
      </div>

      <EvidenceDrawer taskId={evidenceTaskId} onClose={() => setEvidenceTaskId(null)} />
    </main>
  );
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

function FilterSelect({
  label,
  onChange,
  options,
  placeholder,
  value,
}: {
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
        <SelectTrigger className="h-8 w-full rounded-lg">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="rounded-lg">
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

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00.000Z`));
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
