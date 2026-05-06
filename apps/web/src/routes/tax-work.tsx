import type {
  DashboardSection,
  DashboardSort,
  DashboardSummaryInput,
  DashboardTaskRow,
  DashboardVerificationStatus,
} from "@due-date-hq/api/routers/dashboard";
import type {
  CalendarDeadlineItem,
  ClientListItemResponse,
} from "@due-date-hq/api/routers/clients";
import { Button } from "@due-date-hq/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@due-date-hq/ui/components/dropdown-menu";
import { Input } from "@due-date-hq/ui/components/input";
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
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Building2,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  FileUp,
  Filter,
  RotateCcw,
  Search,
  Users,
} from "lucide-react";
import * as React from "react";

import { EvidenceDrawer } from "@/components/evidence/evidence-drawer";
import { StatusBadge } from "@/components/status-badge";
import { BulkTaskActions } from "@/components/task-table/bulk-task-actions";
import { TaskTable } from "@/components/task-table/task-table";
import { formatDate } from "@/utils/date-format";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/tax-work")({
  validateSearch: (search: Record<string, unknown>) => ({
    clientIds: typeof search.clientIds === "string" ? search.clientIds : undefined,
  }),
  component: TaxWorkComponent,
});

const sectionOrder: Array<DashboardSection["id"]> = [
  "overdue",
  "due_this_week",
  "this_month",
  "long_range",
];
const taxWorkPageSize = 25;

const sectionLabels: Record<DashboardSection["id"], string> = {
  overdue: "Overdue",
  due_this_week: "Due this week",
  this_month: "This month",
  long_range: "Later",
};

const queueTabToneStyles = {
  overdue: {
    active: "border-ddhq-risk/45 bg-ddhq-risk-soft text-ddhq-risk",
    count: "bg-background/70 text-ddhq-risk",
    idle:
      "border-transparent text-muted-foreground hover:border-ddhq-risk/20 hover:bg-ddhq-risk-soft/25 hover:text-ddhq-risk",
  },
  due_this_week: {
    active: "border-ddhq-review/45 bg-ddhq-review-soft text-ddhq-review",
    count: "bg-background/70 text-ddhq-review",
    idle:
      "border-transparent text-muted-foreground hover:border-ddhq-review/20 hover:bg-ddhq-review-soft/25 hover:text-ddhq-review",
  },
  this_month: {
    active: "border-primary/35 bg-ddhq-accent-soft text-primary",
    count: "bg-background/70 text-primary",
    idle:
      "border-transparent text-muted-foreground hover:border-primary/20 hover:bg-ddhq-accent-soft/25 hover:text-primary",
  },
  long_range: {
    active: "border-ddhq-gap/35 bg-ddhq-gap-soft text-ddhq-gap",
    count: "bg-background/70 text-ddhq-gap",
    idle:
      "border-transparent text-muted-foreground hover:border-ddhq-gap/20 hover:bg-ddhq-gap-soft/25 hover:text-ddhq-gap",
  },
} satisfies Record<
  DashboardSection["id"],
  {
    active: string;
    count: string;
    idle: string;
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

const taskStatusLabels: Record<DashboardTaskRow["status"], string> = {
  not_started: "Not started",
  in_progress: "In progress",
  waiting_on_client: "Waiting on client",
  done: "Done",
};

type TaxWorkFilters = Pick<
  DashboardSummaryInput,
  | "entityType"
  | "filingProfileId"
  | "jurisdiction"
  | "sort"
  | "taskStatus"
  | "taxCategory"
  | "verificationStatus"
>;

const emptyTaxWorkFilters: TaxWorkFilters = {
  sort: "smart_priority",
};

function TaxWorkComponent() {
  const search = Route.useSearch();
  const clients = useQuery(trpc.clients.list.queryOptions());
  const dashboard = useQuery(
    trpc.dashboard.summary.queryOptions({
      horizon: "all",
      sort: "smart_priority",
    }),
  );
  const [selectedClientId, setSelectedClientId] = React.useState<string | null>(null);
  const [hasInitializedClients, setHasInitializedClients] = React.useState(false);
  const [activeHorizon, setActiveHorizon] =
    React.useState<DashboardSection["id"]>("due_this_week");
  const [clientSearchQuery, setClientSearchQuery] = React.useState("");
  const [workFilters, setWorkFilters] = React.useState<TaxWorkFilters>(emptyTaxWorkFilters);
  const [showWorkFilters, setShowWorkFilters] = React.useState(false);
  const [queuePage, setQueuePage] = React.useState(1);
  const [selectedTaskIds, setSelectedTaskIds] = React.useState<Set<string>>(new Set());
  const [evidenceTaskId, setEvidenceTaskId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (hasInitializedClients || !clients.data) return;
    const availableClientIds = new Set(clients.data.clients.map((client) => client.id));
    const requestedClientIds =
      search.clientIds
        ?.split(",")
        .map((clientId) => clientId.trim())
        .filter((clientId) => availableClientIds.has(clientId)) ?? [];

    setSelectedClientId(requestedClientIds[0] ?? clients.data.clients[0]?.id ?? null);
    setHasInitializedClients(true);
  }, [clients.data, hasInitializedClients, search.clientIds]);

  const selectedClient = React.useMemo(
    () => clients.data?.clients.find((client) => client.id === selectedClientId) ?? null,
    [clients.data, selectedClientId],
  );
  const selectedClientTasks = React.useMemo(() => {
    if (!dashboard.data || !selectedClientId) return [];
    return dashboard.data.allTasks.filter(
      (task) => task.clientRelationship.id === selectedClientId,
    );
  }, [dashboard.data, selectedClientId]);
  const filteredTasks = React.useMemo(
    () => filterAndSortClientTasks(selectedClientTasks, workFilters),
    [selectedClientTasks, workFilters],
  );
  const sections = React.useMemo(() => buildSections(filteredTasks), [filteredTasks]);
  const fullActiveSection = React.useMemo(
    () =>
      sections.find((section) => section.id === activeHorizon) ?? {
        id: activeHorizon,
        label: sectionLabels[activeHorizon],
        count: 0,
        pagination: {
          page: 1,
          pageSize: 1,
          totalPages: 1,
        },
        tasks: [],
      },
    [activeHorizon, sections],
  );
  const totalQueuePages = Math.max(
    1,
    Math.ceil(fullActiveSection.count / taxWorkPageSize),
  );
  const activePage = Math.min(queuePage, totalQueuePages);
  const activeSection = React.useMemo<DashboardSection>(() => {
    const start = (activePage - 1) * taxWorkPageSize;

    return {
      ...fullActiveSection,
      pagination: {
        page: activePage,
        pageSize: taxWorkPageSize,
        totalPages: totalQueuePages,
      },
      tasks: fullActiveSection.tasks.slice(start, start + taxWorkPageSize),
    };
  }, [activePage, fullActiveSection, totalQueuePages]);
  const clientQueueSummary = React.useMemo(
    () => summarizeClientQueue(selectedClientTasks),
    [selectedClientTasks],
  );
  const scopedQueueSummary = React.useMemo(
    () => summarizeClientQueue(filteredTasks),
    [filteredTasks],
  );
  const profileSummaries = React.useMemo(
    () => summarizeProfiles(selectedClientTasks),
    [selectedClientTasks],
  );
  const activeFilterCount = countActiveFilters(workFilters);
  const selectedProfile = profileSummaries.find(
    (profile) => profile.id === workFilters.filingProfileId,
  );

  React.useEffect(() => {
    setWorkFilters((current) =>
      current.filingProfileId ? { ...current, filingProfileId: undefined } : current,
    );
  }, [selectedClientId]);

  React.useEffect(() => {
    setQueuePage(1);
  }, [activeHorizon, selectedClientId, workFilters]);

  React.useEffect(() => {
    setQueuePage((current) => Math.min(current, totalQueuePages));
  }, [totalQueuePages]);

  function updateWorkFilter<K extends keyof TaxWorkFilters>(
    key: K,
    value: TaxWorkFilters[K] | "",
  ) {
    setWorkFilters((current) => ({
      ...current,
      [key]: value || undefined,
      sort: key === "sort" ? (value as DashboardSort) : (current.sort ?? "smart_priority"),
    }));
  }

  function resetWorkFilters() {
    setWorkFilters(emptyTaxWorkFilters);
  }

  React.useEffect(() => {
    const visibleTaskIds = new Set(activeSection.tasks.map((task) => task.id));
    setSelectedTaskIds((current) => {
      const next = new Set([...current].filter((taskId) => visibleTaskIds.has(taskId)));
      return next.size === current.size ? current : next;
    });
  }, [activeSection]);

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

  if (clients.isPending || dashboard.isPending) {
    return (
      <main className="min-h-0 overflow-auto">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-5 py-5">
          <div className="h-24 animate-pulse rounded-xl border border-border bg-card" />
          <div className="h-40 animate-pulse rounded-xl border border-border bg-card" />
          <div className="h-[420px] animate-pulse rounded-xl border border-border bg-card" />
        </div>
      </main>
    );
  }

  if (clients.isError || dashboard.isError) {
    return (
      <main className="min-h-0 overflow-auto">
        <div className="mx-auto max-w-[1440px] px-5 py-5">
          <div className="rounded-xl border border-ddhq-risk/30 bg-ddhq-risk-soft p-4 text-sm text-ddhq-risk">
            Tax Work data could not be loaded.
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="h-full min-h-0 overflow-hidden bg-background text-foreground">
      <div className="mx-auto flex h-full min-h-0 max-w-[1440px] flex-col gap-4 px-5 py-5">
        <section className="pb-1">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <ClipboardList className="size-3.5" />
              Tax Work
            </div>
            <h1 className="mt-1 text-2xl font-semibold leading-tight tracking-normal">
              Client tax workbench
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Work from relationship to filing profile to task. Import tax information, narrow
              the scope, and clear one client's deadline queue without leaving context.
            </p>
          </div>
        </section>

        {clients.data.clients.length === 0 ? (
          <section className="rounded-xl border border-border bg-muted/20 p-6 text-sm text-muted-foreground">
            No clients yet. Add clients before importing tax information.
          </section>
        ) : (
          <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              {!selectedClientId || !selectedClient ? (
                <div className="rounded-xl border border-border bg-muted/20 p-6 text-sm text-muted-foreground">
                  Select a client to review tax work.
                </div>
              ) : (
                <div className="flex h-full min-h-0 min-w-0 flex-col gap-4">
                  <section className="grid min-w-0 shrink-0 gap-4 xl:grid-cols-2 xl:items-stretch">
                    <section className="grid min-w-0 gap-3 xl:grid-rows-[auto_minmax(0,1fr)]">
                      <section className="min-w-0 rounded-lg border border-border/80 bg-card px-3 py-2.5">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                              <Users className="size-3.5" />
                              Client
                            </div>
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              Pick one relationship for this workbench.
                            </div>
                          </div>
                          <ClientFilterDropdown
                            clients={clients.data.clients}
                            query={clientSearchQuery}
                            onQueryChange={setClientSearchQuery}
                            onSelectClient={setSelectedClientId}
                            selectedClientId={selectedClientId}
                          />
                        </div>
                      </section>

                      <section className="min-w-0 rounded-lg border border-border/80 bg-card p-4 xl:min-h-0">
                        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                          <Building2 className="size-3.5" />
                          Client summary
                        </div>
                        <div className="mt-2 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <h2 className="truncate text-lg font-semibold leading-tight">
                              {selectedClient.displayName}
                            </h2>
                          </div>
                          <div className="shrink-0 sm:text-right">
                            <div className="text-2xl font-semibold leading-none tabular-nums">
                              {clientQueueSummary.open}
                            </div>
                            <div className="mt-1 text-xs font-medium text-muted-foreground">
                              open tasks
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-3 divide-x divide-border/70 rounded-md border border-border/70 bg-muted/20">
                          <ClientSummaryMetric
                            label="Profiles"
                            value={selectedClient.filingProfileCount}
                          />
                          <ClientSummaryMetric
                            label="Total tasks"
                            value={clientQueueSummary.total}
                          />
                          <ClientSummaryMetric label="Open" value={clientQueueSummary.open} />
                        </div>

                        <div className="mt-3 flex flex-wrap gap-1.5">
                          <TrustBadge status="verified" value={clientQueueSummary.verified} />
                          <TrustBadge status="review" value={clientQueueSummary.needsReview} />
                          <TrustBadge
                            status="entered_deadline"
                            value={clientQueueSummary.enteredDeadline}
                          />
                          {clientQueueSummary.overdue > 0 ? (
                            <StatusBadge status="overdue">
                              {clientQueueSummary.overdue} overdue
                            </StatusBadge>
                          ) : null}
                        </div>
                      </section>
                    </section>

                    <AnnualDeadlineCalendarCard clientId={selectedClient.id} />
                  </section>

                  <section className="min-w-0 shrink-0 rounded-lg border border-border/80 bg-card p-3">
                    <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                          <Filter className="size-3.5" />
                          Work scope filters
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {scopeSummaryText({
                            activeFilterCount,
                            activeHorizon,
                            activeHorizonCount: fullActiveSection.count,
                            profileName: selectedProfile?.displayName,
                            summary: scopedQueueSummary,
                          })}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {activeFilterCount > 0 ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 rounded-lg"
                            onClick={resetWorkFilters}
                          >
                            <RotateCcw className="size-3.5" />
                            Reset filters
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 rounded-lg"
                          aria-expanded={showWorkFilters}
                          onClick={() => setShowWorkFilters((current) => !current)}
                        >
                          Filters
                          <ChevronDown
                            className={`size-3.5 transition-transform ${
                              showWorkFilters ? "rotate-180" : ""
                            }`}
                          />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <div
                        className={`flex flex-wrap items-center gap-1 rounded-lg border border-border/80 bg-background p-1 ${
                          showWorkFilters ? "mb-2" : ""
                        }`}
                      >
                        {sections.map((section) => (
                          <QueueTab
                            key={section.id}
                            count={section.count}
                            horizon={section.id}
                            isSelected={activeHorizon === section.id}
                            onSelect={() => setActiveHorizon(section.id)}
                          />
                        ))}
                      </div>

                      {showWorkFilters ? (
                        <div className="grid max-w-5xl gap-2 sm:grid-cols-2 xl:grid-cols-3">
                          <FilterSelect
                            label="Profile"
                            value={workFilters.filingProfileId ?? ""}
                            onChange={(value) => updateWorkFilter("filingProfileId", value)}
                            options={profileSummaries.map((profile) => ({
                              value: profile.id,
                              label: profile.displayName,
                            }))}
                            placeholder="All profiles"
                          />
                          <FilterSelect
                            label="Jurisdiction"
                            value={workFilters.jurisdiction ?? ""}
                            onChange={(value) => updateWorkFilter("jurisdiction", value)}
                            options={getClientOptions(selectedClientTasks, "jurisdiction")}
                            placeholder="All jurisdictions"
                          />
                          <FilterSelect
                            label="Entity type"
                            value={workFilters.entityType ?? ""}
                            onChange={(value) =>
                              updateWorkFilter(
                                "entityType",
                                value as TaxWorkFilters["entityType"] | "",
                              )
                            }
                            options={getClientOptions(selectedClientTasks, "entityType")}
                            placeholder="All entities"
                          />
                          <FilterSelect
                            label="Tax type"
                            value={workFilters.taxCategory ?? ""}
                            onChange={(value) => updateWorkFilter("taxCategory", value)}
                            options={getClientOptions(selectedClientTasks, "taxCategory")}
                            placeholder="All tax types"
                          />
                          <FilterSelect
                            label="Status"
                            value={workFilters.taskStatus ?? ""}
                            onChange={(value) =>
                              updateWorkFilter(
                                "taskStatus",
                                value as TaxWorkFilters["taskStatus"] | "",
                              )
                            }
                            options={dashboard.data.filterOptions.taskStatuses.map((value) => ({
                              value,
                              label: taskStatusLabels[value],
                            }))}
                            placeholder="All statuses"
                          />
                          <FilterSelect
                            label="Verification"
                            value={workFilters.verificationStatus ?? ""}
                            onChange={(value) =>
                              updateWorkFilter(
                                "verificationStatus",
                                value as TaxWorkFilters["verificationStatus"] | "",
                              )
                            }
                            options={dashboard.data.filterOptions.verificationStatuses.map(
                              (value) => ({
                                value,
                                label: verificationLabels[value],
                              }),
                            )}
                            placeholder="All verification"
                          />
                          <FilterSelect
                            label="Sort"
                            value={workFilters.sort ?? "smart_priority"}
                            onChange={(value) => updateWorkFilter("sort", value as DashboardSort)}
                            options={Object.entries(sortLabels).map(([value, label]) => ({
                              value,
                              label,
                            }))}
                          />
                        </div>
                      ) : null}
                    </div>
                  </section>

                  <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden">
                    <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground">Task work queue</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          Review and update deadline tasks for {selectedClient.displayName}.
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <BulkTaskActions
                          selectedTaskIds={selectedTaskIds}
                          taskStatuses={dashboard.data.filterOptions.taskStatuses}
                          onClearSelection={() => setSelectedTaskIds(new Set())}
                        />
                        <a
                          href={`/import?clientIds=${encodeURIComponent(selectedClient.id)}`}
                          className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <FileUp className="size-3.5" />
                          Import tax info
                        </a>
                      </div>
                    </div>
                    <TaskTable
                      section={activeSection}
                      selectedTaskIds={selectedTaskIds}
                      onToggleTask={toggleTask}
                      onToggleSection={toggleSection}
                      onOpenEvidence={setEvidenceTaskId}
                    />
                    <TaxWorkPagination
                      count={fullActiveSection.count}
                      page={activeSection.pagination.page}
                      pageSize={activeSection.pagination.pageSize}
                      totalPages={activeSection.pagination.totalPages}
                      onPageChange={setQueuePage}
                    />
                  </section>
                </div>
              )}
            </section>
          </section>
        )}
      </div>

      <EvidenceDrawer taskId={evidenceTaskId} onClose={() => setEvidenceTaskId(null)} />
    </main>
  );
}

function summarizeClientQueue(tasks: DashboardTaskRow[]) {
  return {
    done: tasks.filter((task) => task.status === "done").length,
    dueThisWeek: tasks.filter((task) => task.horizon === "due_this_week").length,
    enteredDeadline: tasks.filter((task) => task.verificationStatus === "entered_deadline").length,
    needsReview: tasks.filter(
      (task) =>
        task.verificationStatus === "needs_review" ||
        task.verificationStatus === "source_changed",
    ).length,
    open: tasks.filter((task) => task.status !== "done").length,
    overdue: tasks.filter((task) => task.horizon === "overdue").length,
    total: tasks.length,
    verified: tasks.filter((task) => task.verificationStatus === "verified").length,
  };
}

function QueueTab({
  count,
  horizon,
  isSelected,
  onSelect,
}: {
  count: number;
  horizon: DashboardSection["id"];
  isSelected: boolean;
  onSelect: () => void;
}) {
  const tone = queueTabToneStyles[horizon];

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      className={`inline-flex h-8 items-center gap-2 rounded-md border px-2.5 text-xs font-semibold transition-colors ${
        isSelected
          ? tone.active
          : tone.idle
      }`}
      onClick={onSelect}
    >
      {sectionLabels[horizon]}
      <span
        className={`rounded-full px-1.5 py-0.5 text-[11px] ${
          isSelected ? tone.count : "bg-muted text-muted-foreground"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function buildSections(tasks: DashboardTaskRow[]): DashboardSection[] {
  return sectionOrder.map((sectionId) => {
    const sectionTasks = tasks.filter((task) => task.horizon === sectionId);
    const totalPages = Math.max(1, Math.ceil(sectionTasks.length / taxWorkPageSize));

    return {
      id: sectionId,
      label: sectionLabels[sectionId],
      count: sectionTasks.length,
      pagination: {
        page: 1,
        pageSize: taxWorkPageSize,
        totalPages,
      },
      tasks: sectionTasks,
    };
  });
}

function TaxWorkPagination({
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
    <div className="flex shrink-0 flex-col gap-2 rounded-lg border border-border/80 bg-card px-3 py-2 md:flex-row md:items-center md:justify-between">
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

function scopeSummaryText({
  activeFilterCount,
  activeHorizon,
  activeHorizonCount,
  profileName,
  summary,
}: {
  activeFilterCount: number;
  activeHorizon: DashboardSection["id"];
  activeHorizonCount: number;
  profileName?: string;
  summary: ReturnType<typeof summarizeClientQueue>;
}) {
  const scope = profileName ?? "Selected client";
  const filterCopy =
    activeFilterCount > 0 ? `${activeFilterCount} filters active` : "full queue";

  return `${scope}: ${sectionLabels[activeHorizon]} shows ${activeHorizonCount}; ${summary.open} open total (${filterCopy}).`;
}

function ClientSummaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 px-3 py-2">
      <div className="text-[11px] font-medium leading-tight text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold leading-tight tabular-nums">{value}</div>
    </div>
  );
}

function TrustBadge({
  status,
  value,
}: {
  status: "entered_deadline" | "review" | "verified";
  value: number;
}) {
  const config = {
    entered_deadline: { badgeStatus: "entered_deadline", label: "Entered" },
    review: { badgeStatus: "review", label: "Review" },
    verified: { badgeStatus: "verified", label: "Verified" },
  } satisfies Record<
    typeof status,
    { badgeStatus: React.ComponentProps<typeof StatusBadge>["status"]; label: string }
  >;

  return (
    <StatusBadge status={config[status].badgeStatus}>
      {config[status].label} {value}
    </StatusBadge>
  );
}

function ClientFilterDropdown({
  clients,
  onQueryChange,
  onSelectClient,
  query,
  selectedClientId,
}: {
  clients: ClientListItemResponse[];
  onQueryChange: (query: string) => void;
  onSelectClient: (clientId: string) => void;
  query: string;
  selectedClientId: string;
}) {
  const visibleClients = React.useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return clients;

    return clients.filter((client) =>
      client.displayName.toLocaleLowerCase().includes(normalizedQuery),
    );
  }, [clients, query]);
  const selectedClient =
    clients.find((client) => client.id === selectedClientId) ?? clients[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 min-w-[220px] justify-between rounded-lg bg-background"
          />
        }
      >
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <Users className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">{selectedClient?.displayName ?? "Select client"}</span>
        </span>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[360px] rounded-lg p-2"
        sideOffset={6}
      >
        <div className="px-1 pb-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold text-foreground">Client</div>
            <div className="font-mono text-[11px] text-muted-foreground tabular-nums">
              {clients.length} relationships
            </div>
          </div>
          <div className="relative mt-2">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={query}
              aria-label="Search clients"
              placeholder="Search clients"
              className="h-8 pl-8 text-xs"
              onKeyDown={(event) => event.stopPropagation()}
              onChange={(event) => onQueryChange(event.target.value)}
            />
          </div>
        </div>

        <div className="max-h-[320px] overflow-auto rounded-md border border-border/80 bg-background p-1">
          {visibleClients.length === 0 ? (
            <div className="px-2 py-3 text-xs leading-5 text-muted-foreground">
              No clients match this search.
            </div>
          ) : null}
          {visibleClients.map((client) => {
            const isSelected = client.id === selectedClientId;

            return (
              <button
                key={client.id}
                type="button"
                aria-pressed={isSelected}
                className={`flex w-full items-start gap-2 rounded-md px-2 py-2 text-left transition-colors ${
                  isSelected
                    ? "bg-ddhq-accent-soft/65 text-foreground"
                    : "text-foreground hover:bg-muted/40"
                }`}
                onClick={() => onSelectClient(client.id)}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {client.displayName}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>{client.filingProfileCount} profiles</span>
                    <span aria-hidden="true">/</span>
                    <span>{client.deadlineTaskCount} tasks</span>
                  </span>
                </span>
                <span
                  className={`mt-1 size-2 rounded-full ${
                    isSelected ? "bg-primary" : "bg-transparent"
                  }`}
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AnnualDeadlineCalendarCard({ clientId }: { clientId: string }) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [calendarYear, setCalendarYear] = React.useState(currentYear);
  const [selectedMonth, setSelectedMonth] = React.useState(currentMonth);
  const calendar = useQuery(
    trpc.clients.getYearCalendar.queryOptions({ clientId, year: calendarYear }),
  );

  function handleCalendarYearChange(year: number) {
    setCalendarYear(year);
    setSelectedMonth(year === currentYear ? currentMonth : 1);
  }

  if (calendar.isPending) {
    return (
      <section className="min-w-0 rounded-lg border border-border/80 bg-card p-3">
        <div className="h-28 animate-pulse rounded-lg bg-muted/40" />
      </section>
    );
  }

  if (calendar.isError) {
    return (
      <section className="min-w-0 rounded-lg border border-border/80 bg-card p-3">
        <div className="rounded-md border border-ddhq-risk/30 bg-ddhq-risk-soft px-3 py-2 text-xs text-ddhq-risk">
          Annual deadline calendar could not be loaded.
        </div>
      </section>
    );
  }

  const data = calendar.data;
  const selectedMonthBucket =
    data.months.find((month) => month.month === selectedMonth) ?? data.months[0];
  const selectedMonthDeadlines = selectedMonthBucket?.deadlines ?? [];

  return (
    <section className="min-w-0 rounded-lg border border-border/80 bg-card p-3">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <CalendarDays className="size-3.5" />
            Annual calendar
          </div>
          <div className="mt-1 text-sm font-semibold text-foreground">
            {data.deadlines.length} deadline{data.deadlines.length === 1 ? "" : "s"}
          </div>
        </div>
        <Select
          value={String(calendarYear)}
          onValueChange={(value) => handleCalendarYearChange(Number(value ?? currentYear))}
        >
          <SelectTrigger className="h-7 w-20 shrink-0 rounded-lg bg-background px-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-lg">
            {data.availableYears.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(152px,180px)_minmax(0,1fr)] lg:items-start">
        <div className="grid grid-cols-6 gap-1.5 lg:grid-cols-3">
          {data.months.map((month) => (
            <button
              key={month.month}
              type="button"
              aria-pressed={selectedMonth === month.month}
              className={`h-10 rounded-[6px] border px-2 py-1 text-center ${
                selectedMonth === month.month
                  ? "border-primary/40 bg-ddhq-accent-soft text-primary ring-1 ring-primary/20"
                  : month.count > 0
                  ? "border-primary/20 bg-ddhq-accent-soft/45 text-primary"
                  : "border-border bg-background text-muted-foreground"
              } hover:border-primary/30 hover:bg-ddhq-accent-soft/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
              onClick={() => setSelectedMonth(month.month)}
            >
              <div className="text-[10px] font-semibold uppercase leading-none">
                {month.label.slice(0, 3)}
              </div>
              <div className="mt-1 font-mono text-sm font-semibold tabular-nums">
                {month.count}
              </div>
            </button>
          ))}
        </div>

        <div className="flex min-h-[116px] min-w-0 flex-col rounded-md border border-border/80 bg-background/70 p-2.5">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <div className="text-[11px] font-semibold text-muted-foreground">
              {selectedMonthBucket?.label ?? "Month"} tax list
            </div>
            <div className="font-mono text-[11px] text-muted-foreground tabular-nums">
              {selectedMonthDeadlines.length}
            </div>
          </div>
          {selectedMonthDeadlines.length === 0 ? (
            <div className="min-h-0 rounded-md border border-dashed border-border bg-muted/20 px-3 py-2 text-xs leading-5 text-muted-foreground">
              No deadlines for this month.
            </div>
          ) : (
            <div className="min-h-0 max-h-[156px] flex-1 overflow-auto pr-1">
              <div className="grid gap-1.5">
                {selectedMonthDeadlines.map((deadline) => (
                  <AnnualCalendarDeadline key={deadline.id} deadline={deadline} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function AnnualCalendarDeadline({ deadline }: { deadline: CalendarDeadlineItem }) {
  return (
    <div className="rounded-md border border-border/80 bg-background px-2 py-1.5">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs font-semibold tabular-nums text-foreground">
              {formatDate(deadline.currentDueDate)}
            </span>
            {deadline.isOverdue ? <StatusBadge status="overdue">Overdue</StatusBadge> : null}
          </div>
          <div className="mt-1 truncate text-xs font-semibold text-foreground">
            {deadline.title}
          </div>
          <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {deadline.profileDisplayName} / {deadline.jurisdiction} / {deadline.taxCategory}
          </div>
          {deadline.firmTargetDate ? (
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              Firm target date: {formatDate(deadline.firmTargetDate)}
            </div>
          ) : null}
        </div>
        <div className="shrink-0">
          <StatusBadge status={deadline.isOfficial ? "verified" : "entered_deadline"}>
            {deadline.isOfficial ? "Official" : "Entered"}
          </StatusBadge>
        </div>
      </div>
    </div>
  );
}

type ProfileSummary = {
  displayName: string;
  id: string;
  total: number;
};

function summarizeProfiles(tasks: DashboardTaskRow[]): ProfileSummary[] {
  const profiles = new Map<string, ProfileSummary>();

  for (const task of tasks) {
    const profile = profiles.get(task.filingProfile.id) ?? {
      displayName: task.filingProfile.displayName,
      id: task.filingProfile.id,
      total: 0,
    };

    profile.total += 1;
    profiles.set(task.filingProfile.id, profile);
  }

  return [...profiles.values()].sort((a, b) => a.displayName.localeCompare(b.displayName));
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
      <Select value={value} onValueChange={(nextValue) => onChange(nextValue ?? "")}>
        <SelectTrigger className="h-8 w-full rounded-lg bg-background">
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

function getClientOptions(
  tasks: DashboardTaskRow[],
  key: "entityType" | "jurisdiction" | "taxCategory",
): Array<{ value: string; label: string }> {
  const values = new Set<string>();

  for (const task of tasks) {
    if (key === "entityType") values.add(task.filingProfile.entityType);
    if (key === "jurisdiction") values.add(task.jurisdiction);
    if (key === "taxCategory") values.add(task.taxCategory);
  }

  return [...values].sort().map((value) => ({ value, label: value }));
}

function countActiveFilters(filters: TaxWorkFilters): number {
  return [
    filters.entityType,
    filters.filingProfileId,
    filters.jurisdiction,
    filters.taskStatus,
    filters.taxCategory,
    filters.verificationStatus,
  ].filter(Boolean).length;
}

function filterAndSortClientTasks(
  tasks: DashboardTaskRow[],
  filters: TaxWorkFilters,
): DashboardTaskRow[] {
  const filtered = tasks.filter((task) => {
    if (filters.filingProfileId && task.filingProfile.id !== filters.filingProfileId) {
      return false;
    }
    if (filters.jurisdiction && task.jurisdiction !== filters.jurisdiction) return false;
    if (filters.entityType && task.filingProfile.entityType !== filters.entityType) return false;
    if (filters.taxCategory && task.taxCategory !== filters.taxCategory) return false;
    if (filters.taskStatus && task.status !== filters.taskStatus) return false;
    if (
      filters.verificationStatus &&
      task.verificationStatus !== filters.verificationStatus
    ) {
      return false;
    }

    return true;
  });

  return [...filtered].sort((a, b) => compareTasks(a, b, filters.sort ?? "smart_priority"));
}

function compareTasks(a: DashboardTaskRow, b: DashboardTaskRow, sort: DashboardSort): number {
  switch (sort) {
    case "client":
      return (
        compareStrings(a.clientRelationship.displayName, b.clientRelationship.displayName) ||
        compareStrings(a.filingProfile.displayName, b.filingProfile.displayName) ||
        a.currentDueDate.localeCompare(b.currentDueDate)
      );
    case "due_date":
      return (
        a.currentDueDate.localeCompare(b.currentDueDate) ||
        compareStrings(a.filingProfile.displayName, b.filingProfile.displayName)
      );
    case "priority":
      return (
        priorityRank(b.priority) - priorityRank(a.priority) ||
        a.currentDueDate.localeCompare(b.currentDueDate)
      );
    case "smart_priority":
      return (
        b.smartPriorityScore - a.smartPriorityScore ||
        a.currentDueDate.localeCompare(b.currentDueDate) ||
        compareStrings(a.filingProfile.displayName, b.filingProfile.displayName)
      );
  }
}

function compareStrings(a: string, b: string): number {
  return a.localeCompare(b, "en", { sensitivity: "base" });
}

function priorityRank(priority: DashboardTaskRow["priority"]): number {
  const priorities: DashboardTaskRow["priority"][] = ["low", "normal", "high", "urgent"];
  return priorities.indexOf(priority);
}
