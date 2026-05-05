import { Button } from "@due-date-hq/ui/components/button";
import { Input } from "@due-date-hq/ui/components/input";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  Download,
  Filter,
  ShieldAlert,
  ShieldCheck,
  Target,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { EvidenceDrawer } from "@/components/evidence/evidence-drawer";
import { TaskTable } from "@/components/task-table/task-table";
import { queryClient, trpc } from "@/utils/trpc";

import type {
  DashboardHorizon,
  DashboardSort,
  DashboardSummaryInput,
  DashboardTaskRow,
  DashboardVerificationStatus,
} from "@due-date-hq/api/routers/dashboard";

type DeadlineTaskStatus = DashboardTaskRow["status"];

const horizonLabels: Record<DashboardHorizon, string> = {
  all: "All horizons",
  overdue: "Overdue",
  due_this_week: "Due this week",
  this_month: "This month",
  long_range: "Long range",
};

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
  user_provided: "User provided",
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
  const [selectedTaskIds, setSelectedTaskIds] = React.useState<Set<string>>(new Set());
  const [evidenceTaskId, setEvidenceTaskId] = React.useState<string | null>(null);
  const [bulkStatus, setBulkStatus] = React.useState<DeadlineTaskStatus>("in_progress");
  const [bulkFirmTargetDate, setBulkFirmTargetDate] = React.useState("");

  const dashboard = useQuery(trpc.dashboard.summary.queryOptions(filters));
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
  const bulkUpdateStatus = useMutation(
    trpc.tasks.bulkUpdateStatus.mutationOptions({
      onSuccess: (result) => {
        toast.success(`Updated ${result.updatedCount} task statuses.`);
        setSelectedTaskIds(new Set());
        void queryClient.invalidateQueries();
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const bulkUpdateFirmTarget = useMutation(
    trpc.tasks.bulkUpdateFirmTargetDate.mutationOptions({
      onSuccess: (result) => {
        toast.success(`Updated ${result.updatedCount} firm target dates.`);
        setSelectedTaskIds(new Set());
        setBulkFirmTargetDate("");
        void queryClient.invalidateQueries();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const selectedCount = selectedTaskIds.size;

  React.useEffect(() => {
    if (!dashboard.data) return;
    const visibleIds = new Set(dashboard.data.allTasks.map((task) => task.id));
    setSelectedTaskIds((current) => {
      const next = new Set([...current].filter((taskId) => visibleIds.has(taskId)));
      return next.size === current.size ? current : next;
    });
  }, [dashboard.data]);

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

  const isBusy =
    bulkUpdateStatus.isPending || bulkUpdateFirmTarget.isPending || exportCurrentView.isPending;

  if (dashboard.isPending) {
    return (
      <main className="min-h-0 overflow-auto bg-[#fbfaf7] text-[#241f1a]">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-5">
          <div className="h-24 animate-pulse border border-[#ded8ce] bg-white" />
          <div className="h-12 animate-pulse border border-[#ded8ce] bg-white" />
          <div className="h-[420px] animate-pulse border border-[#ded8ce] bg-white" />
        </div>
      </main>
    );
  }

  if (dashboard.isError) {
    return (
      <main className="min-h-0 overflow-auto bg-[#fbfaf7] text-[#241f1a]">
        <div className="mx-auto max-w-[1440px] px-4 py-5">
          <div className="border border-[#e2afa1] bg-[#fff1ed] p-4 text-sm text-[#9b3321]">
            Dashboard data could not be loaded.
          </div>
        </div>
      </main>
    );
  }

  const data = dashboard.data;

  return (
    <main className="min-h-0 overflow-auto bg-[#fbfaf7] text-[#241f1a]">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-5">
        <section className="border-b border-[#ded8ce] pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#6f685f]">
                <CalendarDays className="size-3.5" />
                Monday triage
              </div>
              <h1 className="mt-1 text-2xl font-semibold leading-tight tracking-normal">
                Deadline dashboard
              </h1>
              <div className="mt-2 flex flex-wrap gap-2">
                <MetricBadge tone="risk" label="Overdue" value={data.summary.overdue} />
                <MetricBadge tone="risk" label="Due today" value={data.summary.dueToday} />
                <MetricBadge tone="review" label="This week" value={data.summary.dueThisWeek} />
                <MetricBadge tone="neutral" label="This month" value={data.summary.dueThisMonth} />
                <MetricBadge tone="verified" label="Verified" value={data.summary.verified} />
                <MetricBadge tone="review" label="Source changed" value={data.summary.sourceChanged} />
                <MetricBadge tone="neutral" label="User provided" value={data.summary.userProvided} />
              </div>
            </div>
            <div className="grid gap-1 text-xs text-[#6f685f]">
              <span>Today {formatDate(data.today)}</span>
              <span>Generated {formatDateTime(data.generatedAt)}</span>
            </div>
          </div>
        </section>

        <section className="border border-[#ded8ce] bg-white">
          <div className="flex items-center gap-2 border-b border-[#e7e2da] px-3 py-2 text-xs font-semibold text-[#6f685f]">
            <Filter className="size-3.5" />
            Filters
          </div>
          <div className="grid gap-2 p-3 md:grid-cols-3 xl:grid-cols-5">
            <FilterSelect
              label="Horizon"
              value={filters.horizon ?? "all"}
              onChange={(value) => updateFilter("horizon", value as DashboardHorizon)}
              options={Object.entries(horizonLabels).map(([value, label]) => ({ value, label }))}
            />
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
              label="Form/obligation"
              value={filters.obligation ?? ""}
              onChange={(value) => updateFilter("obligation", value)}
              options={data.filterOptions.obligations.map((value) => ({ value, label: value }))}
              placeholder="All obligations"
            />
            <FilterSelect
              label="Jurisdiction"
              value={filters.jurisdiction ?? ""}
              onChange={(value) => updateFilter("jurisdiction", value)}
              options={data.filterOptions.jurisdictions.map((value) => ({ value, label: value }))}
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
              options={data.filterOptions.taxCategories.map((value) => ({ value, label: value }))}
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
        </section>

        <section className="sticky top-0 z-10 border border-[#ded8ce] bg-white px-3 py-2 shadow-sm">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-sm font-semibold">
              {selectedCount} selected
              <span className="ml-2 text-xs font-normal text-[#6f685f]">
                {data.summary.total} rows in current view
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                className="h-8 border border-[#cfc7bc] bg-white px-2 text-xs"
                value={bulkStatus}
                onChange={(event) => setBulkStatus(event.target.value as DeadlineTaskStatus)}
              >
                {data.filterOptions.taskStatuses.map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status]}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                disabled={selectedCount === 0 || isBusy}
                onClick={() =>
                  bulkUpdateStatus.mutate({
                    taskIds: [...selectedTaskIds],
                    status: bulkStatus,
                  })
                }
              >
                Apply status
              </Button>
              <Input
                aria-label="Bulk firm target date"
                className="w-40"
                type="date"
                value={bulkFirmTargetDate}
                onChange={(event) => setBulkFirmTargetDate(event.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                disabled={selectedCount === 0 || isBusy}
                onClick={() =>
                  bulkUpdateFirmTarget.mutate({
                    taskIds: [...selectedTaskIds],
                    firmTargetDate: bulkFirmTargetDate || null,
                  })
                }
              >
                <Target className="size-3.5" />
                Apply target
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isBusy}
                onClick={() => exportCurrentView.mutate(filters)}
              >
                <Download className="size-3.5" />
                Export view
              </Button>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-5">
          {data.sections.map((section) => (
            <TaskTable
              key={section.id}
              section={section}
              selectedTaskIds={selectedTaskIds}
              onToggleTask={toggleTask}
              onToggleSection={toggleSection}
              onOpenEvidence={setEvidenceTaskId}
            />
          ))}
        </section>
      </div>

      <EvidenceDrawer taskId={evidenceTaskId} onClose={() => setEvidenceTaskId(null)} />
    </main>
  );
}

function MetricBadge({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "verified" | "review" | "risk" | "neutral";
  value: number;
}) {
  const toneClass = {
    verified: "border-[#b7dec6] bg-[#eef8f1] text-[#287347]",
    review: "border-[#ead28e] bg-[#fff7dc] text-[#806218]",
    risk: "border-[#e2afa1] bg-[#fff1ed] text-[#9b3321]",
    neutral: "border-[#ddd6cb] bg-[#f6f3ee] text-[#655e55]",
  }[tone];
  const Icon = tone === "verified" ? ShieldCheck : tone === "review" ? ShieldAlert : null;

  return (
    <span className={`inline-flex h-7 items-center gap-1.5 border px-2 text-xs font-semibold ${toneClass}`}>
      {Icon ? <Icon className="size-3.5" /> : null}
      {label}: {value}
    </span>
  );
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
    <label className="grid gap-1 text-xs font-medium text-[#6f685f]">
      {label}
      <select
        className="h-8 min-w-0 border border-[#cfc7bc] bg-white px-2 text-xs text-[#241f1a] outline-none focus:border-[#176b86] focus:ring-1 focus:ring-[#176b86]/30"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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
