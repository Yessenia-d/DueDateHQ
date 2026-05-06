import type {
  DashboardSection,
  DashboardSort,
  DashboardSummaryInput,
  DashboardTaskRow,
  DashboardVerificationStatus,
} from "@due-date-hq/api/routers/dashboard";
import type {
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
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/tax-work")({
  validateSearch: (search: Record<string, unknown>) => ({
    clientIds: typeof search.clientIds === "string" ? search.clientIds : undefined,
  }),
  component: TaxWorkComponent,
});

const taxWorkPageSize = 25;

const calendarViewModes = [
  { id: "year", label: "Year" },
  { id: "month", label: "Month" },
  { id: "week", label: "Week" },
  { id: "day", label: "Day" },
] as const;

type CalendarViewMode = (typeof calendarViewModes)[number]["id"];

type CalendarTimeScope = {
  anchorDate: string;
  endDate: string;
  label: string;
  mode: CalendarViewMode;
  startDate: string;
};

const calendarMonthLabels = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const calendarWeekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

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
  waiting_on_client: "Waiting on client",
  ready_to_work: "Ready to work",
  in_progress: "In progress",
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
  const defaultCalendarAnchorDate = React.useMemo(() => toDateKey(new Date()), []);
  const defaultCalendarTimeScope = React.useMemo(
    () => createCalendarTimeScope("year", defaultCalendarAnchorDate),
    [defaultCalendarAnchorDate],
  );
  const [selectedClientId, setSelectedClientId] = React.useState<string | null>(null);
  const [hasInitializedClients, setHasInitializedClients] = React.useState(false);
  const [clientSearchQuery, setClientSearchQuery] = React.useState("");
  const [calendarTimeScope, setCalendarTimeScope] = React.useState<CalendarTimeScope>(() =>
    createCalendarTimeScope("year", defaultCalendarAnchorDate),
  );
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
  const nonTimeFilteredTasks = React.useMemo(
    () => filterAndSortClientTasks(selectedClientTasks, workFilters),
    [selectedClientTasks, workFilters],
  );
  const filteredTasks = React.useMemo(
    () => filterTasksByTimeScope(nonTimeFilteredTasks, calendarTimeScope),
    [calendarTimeScope, nonTimeFilteredTasks],
  );
  const totalQueuePages = Math.max(
    1,
    Math.ceil(filteredTasks.length / taxWorkPageSize),
  );
  const activePage = Math.min(queuePage, totalQueuePages);
  const activeSection = React.useMemo<DashboardSection>(() => {
    const start = (activePage - 1) * taxWorkPageSize;

    return {
      id: "due_this_week",
      label: "filtered tasks",
      count: filteredTasks.length,
      pagination: {
        page: activePage,
        pageSize: taxWorkPageSize,
        totalPages: totalQueuePages,
      },
      tasks: filteredTasks.slice(start, start + taxWorkPageSize),
    };
  }, [activePage, filteredTasks, totalQueuePages]);
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
  const activeFilterCount =
    countActiveFilters(workFilters) +
    (isSameCalendarTimeScope(calendarTimeScope, defaultCalendarTimeScope) ? 0 : 1);
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
  }, [calendarTimeScope, selectedClientId, workFilters]);

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

  function updateCalendarTimeScope(nextScope: CalendarTimeScope) {
    setCalendarTimeScope(nextScope);
  }

  function resetWorkFilters() {
    setWorkFilters(emptyTaxWorkFilters);
    setCalendarTimeScope(defaultCalendarTimeScope);
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
      <main className="ddhq-page">
        <div className="ddhq-page-inner max-w-[1440px] gap-4">
          <div className="h-24 animate-pulse ddhq-panel" />
          <div className="h-40 animate-pulse ddhq-panel" />
          <div className="h-[420px] animate-pulse ddhq-panel" />
        </div>
      </main>
    );
  }

  if (clients.isError || dashboard.isError) {
    return (
      <main className="ddhq-page">
        <div className="ddhq-page-inner max-w-[1440px] gap-4">
          <div className="rounded-xl border border-ddhq-risk/30 bg-ddhq-risk-soft p-4 text-sm text-ddhq-risk">
            Tax Work data could not be loaded.
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="ddhq-page h-full overflow-hidden text-foreground">
      <div className="ddhq-page-inner h-full min-h-0 max-w-[1440px] gap-4 py-6">
        <section className="ddhq-page-header">
          <div className="min-w-0">
            <div className="ddhq-kicker">
              <ClipboardList className="size-3.5" />
              Client queue
            </div>
            <h1 className="ddhq-title">
              Client tax workbench
            </h1>
            <p className="ddhq-copy">
              Work from relationship to filing profile to task. Import tax information, narrow
              the scope, and clear one client's deadline queue without leaving context.
            </p>
          </div>
        </section>

        {clients.data.clients.length === 0 ? (
          <section className="ddhq-panel-muted p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <FileUp className="size-4" />
              Start with import
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Import clients and tax profiles from CSV, or create a client relationship manually when you only need one record.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                to="/import"
                search={{ clientIds: undefined }}
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <FileUp className="size-3.5" />
                Import clients and tax profiles
              </Link>
              <Link
                to="/clients"
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-ddhq-line bg-ddhq-paper px-2.5 text-xs font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Users className="size-3.5" />
                New client relationship
              </Link>
            </div>
          </section>
        ) : (
          <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              {!selectedClientId || !selectedClient ? (
                <div className="ddhq-panel-muted p-6 text-sm text-muted-foreground">
                  Select a client to review tax work.
                </div>
              ) : (
                <div className="flex h-full min-h-0 min-w-0 flex-col gap-4">
                  <section className="grid min-w-0 shrink-0 gap-4 xl:grid-cols-2 xl:items-stretch">
                    <section className="grid min-w-0 gap-3 xl:grid-rows-[auto_minmax(0,1fr)]">
                      <section className="min-w-0 ddhq-panel px-3 py-2.5">
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

                      <section className="min-w-0 ddhq-panel p-4 xl:min-h-0">
                        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                          <Building2 className="size-3.5" />
                          Client summary
                        </div>
                        <div className="mt-2 min-w-0">
                          <div className="min-w-0">
                            <h2 className="truncate text-lg font-semibold leading-tight">
                              {selectedClient.displayName}
                            </h2>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
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

                    <CalendarTimeFilterCard
                      tasks={nonTimeFilteredTasks}
                      timeScope={calendarTimeScope}
                      onTimeScopeChange={updateCalendarTimeScope}
                    />
                  </section>

                  <section className="min-w-0 shrink-0 px-1 py-1">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex min-h-8 flex-wrap items-center gap-2">
                        <div className="relative">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className={
                              showWorkFilters
                                ? "h-8 rounded-lg border-primary/30 bg-ddhq-accent-soft/70 text-foreground shadow-none"
                                : "h-8 rounded-lg"
                            }
                            aria-expanded={showWorkFilters}
                            onClick={() => setShowWorkFilters((current) => !current)}
                          >
                            <Filter
                              className={showWorkFilters ? "size-3.5 text-primary" : "size-3.5"}
                            />
                            Filters
                            <ChevronDown
                              className={`size-3.5 transition-transform ${
                                showWorkFilters ? "rotate-180" : ""
                              }`}
                            />
                          </Button>

                          {showWorkFilters ? (
                            <div className="absolute left-0 top-10 z-[80] w-[min(900px,calc(100vw-2.5rem))] rounded-xl border border-ddhq-line bg-popover p-3 text-popover-foreground shadow-[var(--ddhq-shadow-soft)] max-md:fixed max-md:inset-x-3 max-md:bottom-3 max-md:top-auto max-md:w-auto max-md:max-h-[82vh] max-md:overflow-auto">
                              <div className="mb-3">
                                <h2 className="text-sm font-semibold">Filters</h2>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  Refine this work queue without changing the page layout.
                                </p>
                              </div>
                              <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-4">
                                <FilterSelect
                                  isActive={Boolean(workFilters.filingProfileId)}
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
                                  isActive={Boolean(workFilters.jurisdiction)}
                                  label="Jurisdiction"
                                  value={workFilters.jurisdiction ?? ""}
                                  onChange={(value) => updateWorkFilter("jurisdiction", value)}
                                  options={getClientOptions(selectedClientTasks, "jurisdiction")}
                                  placeholder="All jurisdictions"
                                />
                                <FilterSelect
                                  isActive={Boolean(workFilters.entityType)}
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
                                  isActive={Boolean(workFilters.taxCategory)}
                                  label="Tax type"
                                  value={workFilters.taxCategory ?? ""}
                                  onChange={(value) => updateWorkFilter("taxCategory", value)}
                                  options={getClientOptions(selectedClientTasks, "taxCategory")}
                                  placeholder="All tax types"
                                />
                                <FilterSelect
                                  isActive={Boolean(workFilters.taskStatus)}
                                  label="Status"
                                  value={workFilters.taskStatus ?? ""}
                                  onChange={(value) =>
                                    updateWorkFilter(
                                      "taskStatus",
                                      value as TaxWorkFilters["taskStatus"] | "",
                                    )
                                  }
                                  options={dashboard.data.filterOptions.taskStatuses.map(
                                    (value) => ({
                                      value,
                                      label: taskStatusLabels[value],
                                    }),
                                  )}
                                  placeholder="All statuses"
                                />
                                <FilterSelect
                                  isActive={Boolean(workFilters.verificationStatus)}
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
                                  isActive={
                                    (workFilters.sort ?? "smart_priority") !== "smart_priority"
                                  }
                                  label="Sort"
                                  value={workFilters.sort ?? "smart_priority"}
                                  onChange={(value) =>
                                    updateWorkFilter("sort", value as DashboardSort)
                                  }
                                  options={Object.entries(sortLabels).map(([value, label]) => ({
                                    value,
                                    label,
                                  }))}
                                />
                              </div>
                              <div className="mt-3 flex justify-end gap-2 pt-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={resetWorkFilters}
                                >
                                  <RotateCcw className="size-3.5" />
                                  Reset filters
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setShowWorkFilters(false)}
                                >
                                  Done
                                </Button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                        <span className="text-xs font-medium text-muted-foreground">
                          {activeFilterCount > 0
                            ? `${activeFilterCount} active`
                            : "Default filters"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {scopeSummaryText({
                            activeFilterCount,
                            profileName: selectedProfile?.displayName,
                            summary: scopedQueueSummary,
                            timeScope: calendarTimeScope,
                          })}
                        </span>
                      </div>
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
                          Import tax info for this client
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
                      count={filteredTasks.length}
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
    <div className="flex shrink-0 flex-col gap-2 px-1 py-1 md:flex-row md:items-center md:justify-between">
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
  profileName,
  summary,
  timeScope,
}: {
  activeFilterCount: number;
  profileName?: string;
  summary: ReturnType<typeof summarizeClientQueue>;
  timeScope: CalendarTimeScope;
}) {
  const scope = profileName ?? "Selected client";
  const filterCopy =
    activeFilterCount > 0 ? `${activeFilterCount} filters active` : "full queue";

  return `${scope}, ${timeScope.label}: ${summary.open} open, ${summary.total} total (${filterCopy}).`;
}

function ClientSummaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 px-1 py-1">
      <div className="text-[11px] font-semibold leading-tight text-muted-foreground">
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
        className="h-8 min-w-[220px] justify-between rounded-lg bg-ddhq-paper"
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
        className="w-[360px] rounded-lg border-ddhq-line p-2 shadow-[var(--ddhq-shadow-soft)]"
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

        <div className="max-h-[320px] overflow-auto rounded-md border border-ddhq-line bg-ddhq-paper p-1">
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

function CalendarTimeFilterCard({
  onTimeScopeChange,
  tasks,
  timeScope,
}: {
  onTimeScopeChange: (scope: CalendarTimeScope) => void;
  tasks: DashboardTaskRow[];
  timeScope: CalendarTimeScope;
}) {
  const scopeTasks = React.useMemo(
    () => filterTasksByTimeScope(tasks, timeScope),
    [tasks, timeScope],
  );
  const scopeSummary = React.useMemo(() => summarizeClientQueue(scopeTasks), [scopeTasks]);
  const availableYears = React.useMemo(
    () => getAvailableCalendarYears(tasks, timeScope.anchorDate),
    [tasks, timeScope.anchorDate],
  );
  const anchorParts = parseDateParts(timeScope.anchorDate);

  function changeMode(mode: CalendarViewMode) {
    onTimeScopeChange(createCalendarTimeScope(mode, timeScope.anchorDate));
  }

  function shiftScope(amount: number) {
    onTimeScopeChange(shiftCalendarTimeScope(timeScope, amount));
  }

  function changeYear(year: number) {
    onTimeScopeChange(
      createCalendarTimeScope(timeScope.mode, setDateYear(timeScope.anchorDate, year)),
    );
  }

  return (
    <section className="min-w-0 ddhq-panel p-3">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <CalendarDays className="size-3.5" />
            Calendar filter
          </div>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-semibold text-foreground">{timeScope.label}</span>
            <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
              {scopeSummary.open} open / {scopeSummary.total} total
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          <div className="inline-flex rounded-lg border border-ddhq-line bg-ddhq-paper p-0.5">
            {calendarViewModes.map((mode) => (
              <button
                key={mode.id}
                type="button"
                aria-pressed={timeScope.mode === mode.id}
                className={`h-7 rounded-md px-2 text-xs font-semibold transition-colors ${
                  timeScope.mode === mode.id
                    ? "bg-ddhq-accent-soft text-primary shadow-[var(--ddhq-shadow-soft)]"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
                onClick={() => changeMode(mode.id)}
              >
                {mode.label}
              </button>
            ))}
          </div>
          <Select
            value={String(anchorParts.year)}
            onValueChange={(value) => changeYear(Number(value ?? anchorParts.year))}
          >
            <SelectTrigger className="h-8 w-20 shrink-0 rounded-lg bg-background px-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-lg">
              {availableYears.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          className="inline-flex size-7 items-center justify-center rounded-md border border-ddhq-line bg-ddhq-paper text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Previous ${timeScope.mode}`}
          onClick={() => shiftScope(-1)}
        >
          <ChevronLeft className="size-3.5" />
        </button>
        <div className="min-w-0 text-center">
          <div className="truncate text-xs font-semibold text-foreground">
            {getCalendarScopeCaption(timeScope)}
          </div>
          <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
            {timeScope.startDate === timeScope.endDate
              ? timeScope.startDate
              : `${timeScope.startDate} to ${timeScope.endDate}`}
          </div>
        </div>
        <button
          type="button"
          className="inline-flex size-7 items-center justify-center rounded-md border border-ddhq-line bg-ddhq-paper text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Next ${timeScope.mode}`}
          onClick={() => shiftScope(1)}
        >
          <ChevronRight className="size-3.5" />
        </button>
      </div>

      <div className="mt-3">
        {timeScope.mode === "year" ? (
          <CalendarYearView
            selectedMonth={null}
            tasks={tasks}
            year={anchorParts.year}
            onSelectMonth={(month) =>
              onTimeScopeChange(
                createCalendarTimeScope("month", createDateKey(anchorParts.year, month, 1)),
              )
            }
          />
        ) : null}

        {timeScope.mode === "month" ? (
          <CalendarMonthView
            anchorDate={timeScope.anchorDate}
            selectedDate={null}
            tasks={tasks}
            onSelectDate={(date) => onTimeScopeChange(createCalendarTimeScope("day", date))}
          />
        ) : null}

        {timeScope.mode === "week" ? (
          <CalendarWeekView
            tasks={tasks}
            timeScope={timeScope}
            onSelectDate={(date) => onTimeScopeChange(createCalendarTimeScope("day", date))}
          />
        ) : null}

        {timeScope.mode === "day" ? (
          <CalendarDayView tasks={tasks} timeScope={timeScope} />
        ) : null}
      </div>
    </section>
  );
}

function CalendarYearView({
  onSelectMonth,
  selectedMonth,
  tasks,
  year,
}: {
  onSelectMonth: (month: number) => void;
  selectedMonth: number | null;
  tasks: DashboardTaskRow[];
  year: number;
}) {
  const monthCounts = React.useMemo(() => createMonthCounts(tasks, year), [tasks, year]);

  return (
    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 xl:grid-cols-6">
      {calendarMonthLabels.map((monthLabel, index) => {
        const month = index + 1;
        const count = monthCounts.get(month) ?? 0;
        const isSelected = selectedMonth === month;

        return (
          <button
            key={monthLabel}
            type="button"
            aria-pressed={isSelected}
            className={getCalendarBucketClassName({ count, isSelected })}
            onClick={() => onSelectMonth(month)}
          >
            <span className="text-[10px] font-semibold uppercase leading-none">
              {monthLabel.slice(0, 3)}
            </span>
            <span className="mt-1 font-mono text-sm font-semibold tabular-nums">
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function CalendarMonthView({
  anchorDate,
  onSelectDate,
  selectedDate,
  tasks,
}: {
  anchorDate: string;
  onSelectDate: (date: string) => void;
  selectedDate: string | null;
  tasks: DashboardTaskRow[];
}) {
  const days = React.useMemo(
    () => createCalendarMonthDays(tasks, anchorDate, selectedDate),
    [anchorDate, selectedDate, tasks],
  );

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-muted-foreground">
        {calendarWeekdayLabels.map((day) => (
          <div key={day} className="h-4">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => (
          <button
            key={day.date}
            type="button"
            aria-pressed={day.isSelected}
            className={getCalendarDayClassName(day)}
            onClick={() => onSelectDate(day.date)}
          >
            <span className="flex items-center justify-between gap-1">
              <span className="font-mono tabular-nums">{day.dayOfMonth}</span>
              {day.openCount > 0 ? (
                <span className="font-mono text-[10px] font-semibold tabular-nums">
                  {day.openCount}
                </span>
              ) : null}
            </span>
            <span className="mt-0.5 block truncate text-[10px] font-medium leading-4">
              {day.count > 0 ? `${day.count} task${day.count === 1 ? "" : "s"}` : ""}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function CalendarWeekView({
  onSelectDate,
  tasks,
  timeScope,
}: {
  onSelectDate: (date: string) => void;
  tasks: DashboardTaskRow[];
  timeScope: CalendarTimeScope;
}) {
  const days = React.useMemo(
    () => createCalendarWeekDays(tasks, timeScope.startDate),
    [tasks, timeScope.startDate],
  );

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {days.map((day) => (
        <button
          key={day.date}
          type="button"
          className={getCalendarDayClassName(day)}
          onClick={() => onSelectDate(day.date)}
        >
          <span className="text-[10px] font-semibold uppercase leading-none text-muted-foreground">
            {calendarWeekdayLabels[day.weekday]}
          </span>
          <span className="mt-1 flex items-center justify-between gap-1">
            <span className="font-mono tabular-nums">{day.dayOfMonth}</span>
            {day.openCount > 0 ? (
              <span className="font-mono text-[10px] font-semibold tabular-nums">
                {day.openCount}
              </span>
            ) : null}
          </span>
          <span className="mt-0.5 block truncate text-[10px] font-medium leading-4">
            {day.count > 0 ? `${day.count} task${day.count === 1 ? "" : "s"}` : ""}
          </span>
        </button>
      ))}
    </div>
  );
}

function CalendarDayView({
  tasks,
  timeScope,
}: {
  tasks: DashboardTaskRow[];
  timeScope: CalendarTimeScope;
}) {
  const dayTasks = React.useMemo(
    () => filterTasksByTimeScope(tasks, timeScope),
    [tasks, timeScope],
  );
  const summary = React.useMemo(() => summarizeClientQueue(dayTasks), [dayTasks]);
  const day = createCalendarDay(tasks, timeScope.anchorDate, true);

  return (
    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-stretch">
      <div className={getCalendarDayClassName(day)}>
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[10px] font-semibold uppercase text-muted-foreground">
              {calendarWeekdayLabels[day.weekday]}
            </div>
            <div className="mt-1 font-mono text-lg font-semibold leading-none tabular-nums">
              {day.dayOfMonth}
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-sm font-semibold tabular-nums">
              {summary.open}
            </div>
            <div className="text-[10px] font-medium text-muted-foreground">open</div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 divide-x divide-ddhq-line rounded-md border border-ddhq-line bg-ddhq-paper-muted/45 sm:min-w-[220px]">
        <ClientSummaryMetric label="Total" value={summary.total} />
        <ClientSummaryMetric label="Open" value={summary.open} />
        <ClientSummaryMetric label="Done" value={summary.done} />
      </div>
    </div>
  );
}

type CalendarDay = {
  count: number;
  date: string;
  dayOfMonth: number;
  doneCount: number;
  isCurrentMonth: boolean;
  isSelected: boolean;
  isToday: boolean;
  openCount: number;
  tone: "done" | "empty" | "open" | "risk";
  weekday: number;
};

function createMonthCounts(tasks: DashboardTaskRow[], year: number): Map<number, number> {
  const counts = new Map<number, number>();

  for (const task of tasks) {
    const parts = parseDateParts(task.currentDueDate);
    if (parts.year !== year) continue;

    counts.set(parts.month, (counts.get(parts.month) ?? 0) + 1);
  }

  return counts;
}

function createCalendarMonthDays(
  tasks: DashboardTaskRow[],
  anchorDate: string,
  selectedDate: string | null,
): CalendarDay[] {
  const anchorParts = parseDateParts(anchorDate);
  const monthStart = new Date(Date.UTC(anchorParts.year, anchorParts.month - 1, 1));
  const gridStart = addUtcDays(monthStart, -monthStart.getUTCDay());
  const currentMonth = monthStart.getUTCMonth();

  return Array.from({ length: 42 }, (_, index) => {
    const date = addUtcDays(gridStart, index);
    const dateKey = toDateKey(date);

    return createCalendarDay(tasks, dateKey, selectedDate === dateKey, currentMonth);
  });
}

function createCalendarWeekDays(tasks: DashboardTaskRow[], weekStartDate: string): CalendarDay[] {
  const weekStart = parseDateKey(weekStartDate);

  return Array.from({ length: 7 }, (_, index) => {
    const date = addUtcDays(weekStart, index);
    const dateKey = toDateKey(date);

    return createCalendarDay(tasks, dateKey, false, date.getUTCMonth());
  });
}

function createCalendarDay(
  tasks: DashboardTaskRow[],
  date: string,
  isSelected: boolean,
  visibleMonth?: number,
): CalendarDay {
  const dateTasks = tasks.filter((task) => task.currentDueDate === date);
  const doneCount = dateTasks.filter((task) => task.status === "done").length;
  const openCount = dateTasks.length - doneCount;
  const parsedDate = parseDateKey(date);
  const today = toDateKey(new Date());
  const hasRisk = dateTasks.some(
    (task) =>
      task.status !== "done" &&
      (task.urgency === "overdue" ||
        task.urgency === "due_today" ||
        task.verificationStatus === "source_changed" ||
        task.verificationStatus === "needs_review" ||
        task.status === "waiting_on_client"),
  );

  return {
    count: dateTasks.length,
    date,
    dayOfMonth: parsedDate.getUTCDate(),
    doneCount,
    isCurrentMonth: visibleMonth === undefined || parsedDate.getUTCMonth() === visibleMonth,
    isSelected,
    isToday: today === date,
    openCount,
    tone:
      dateTasks.length === 0
        ? "empty"
        : openCount === 0
          ? "done"
          : hasRisk
            ? "risk"
            : "open",
    weekday: parsedDate.getUTCDay(),
  };
}

function getCalendarBucketClassName({
  count,
  isSelected,
}: {
  count: number;
  isSelected: boolean;
}): string {
  const toneClass = isSelected
    ? "border-primary/40 bg-ddhq-accent-soft text-primary ring-1 ring-primary/20"
    : count > 0
      ? "border-primary/20 bg-ddhq-accent-soft/45 text-primary hover:bg-ddhq-accent-soft/55"
      : "border-ddhq-line bg-ddhq-paper text-muted-foreground hover:bg-muted/50";

  return [
    "flex h-11 flex-col items-center justify-center rounded-[6px] border px-2 py-1 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    toneClass,
  ].join(" ");
}

function getCalendarDayClassName(day: CalendarDay): string {
  const toneClass =
    day.tone === "empty"
      ? "border-ddhq-line bg-ddhq-paper text-muted-foreground/60 hover:bg-muted/50"
      : day.tone === "done"
        ? "border-ddhq-verified/25 bg-ddhq-verified-soft/70 text-ddhq-verified hover:bg-ddhq-verified-soft"
        : day.tone === "risk"
          ? "border-ddhq-review/35 bg-ddhq-review-soft text-ddhq-review hover:bg-ddhq-review-soft/85"
          : "border-primary/20 bg-ddhq-accent-soft/45 text-primary hover:bg-ddhq-accent-soft/65";
  const selectedClass = day.isSelected
    ? "ring-1 ring-primary/25"
    : day.isToday
      ? "ring-1 ring-ddhq-border-strong/60"
      : "";
  const currentMonthClass = day.isCurrentMonth ? "" : "opacity-45";

  return [
    "min-h-[44px] rounded-[6px] border p-1 text-left text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    toneClass,
    selectedClass,
    currentMonthClass,
  ].join(" ");
}

function filterTasksByTimeScope(
  tasks: DashboardTaskRow[],
  timeScope: CalendarTimeScope,
): DashboardTaskRow[] {
  return tasks.filter(
    (task) =>
      task.currentDueDate >= timeScope.startDate && task.currentDueDate <= timeScope.endDate,
  );
}

function createCalendarTimeScope(
  mode: CalendarViewMode,
  anchorDate: string,
): CalendarTimeScope {
  const anchorParts = parseDateParts(anchorDate);

  if (mode === "year") {
    const startDate = createDateKey(anchorParts.year, 1, 1);
    const endDate = createDateKey(anchorParts.year, 12, 31);

    return {
      anchorDate,
      endDate,
      label: String(anchorParts.year),
      mode,
      startDate,
    };
  }

  if (mode === "month") {
    const startDate = createDateKey(anchorParts.year, anchorParts.month, 1);
    const endDate = getMonthEndDate(anchorParts.year, anchorParts.month);

    return {
      anchorDate: clampDateToRange(anchorDate, startDate, endDate),
      endDate,
      label: `${calendarMonthLabels[anchorParts.month - 1]} ${anchorParts.year}`,
      mode,
      startDate,
    };
  }

  if (mode === "week") {
    const anchor = parseDateKey(anchorDate);
    const weekStart = addUtcDays(anchor, -anchor.getUTCDay());
    const weekEnd = addUtcDays(weekStart, 6);

    return {
      anchorDate,
      endDate: toDateKey(weekEnd),
      label: `Week of ${formatCalendarShortDate(toDateKey(weekStart))}`,
      mode,
      startDate: toDateKey(weekStart),
    };
  }

  return {
    anchorDate,
    endDate: anchorDate,
    label: formatCalendarLongDate(anchorDate),
    mode,
    startDate: anchorDate,
  };
}

function shiftCalendarTimeScope(
  timeScope: CalendarTimeScope,
  amount: number,
): CalendarTimeScope {
  const anchor = parseDateKey(timeScope.anchorDate);

  if (timeScope.mode === "year") {
    const shifted = new Date(
      Date.UTC(anchor.getUTCFullYear() + amount, anchor.getUTCMonth(), anchor.getUTCDate()),
    );

    return createCalendarTimeScope("year", toDateKey(shifted));
  }

  if (timeScope.mode === "month") {
    return createCalendarTimeScope("month", toDateKey(addUtcMonths(anchor, amount)));
  }

  if (timeScope.mode === "week") {
    return createCalendarTimeScope("week", toDateKey(addUtcDays(anchor, amount * 7)));
  }

  return createCalendarTimeScope("day", toDateKey(addUtcDays(anchor, amount)));
}

function getAvailableCalendarYears(tasks: DashboardTaskRow[], anchorDate: string): number[] {
  const currentYear = new Date().getFullYear();
  const years = new Set<number>([
    currentYear,
    currentYear + 1,
    parseDateParts(anchorDate).year,
  ]);

  for (const task of tasks) {
    years.add(parseDateParts(task.currentDueDate).year);
  }

  return [...years].sort((left, right) => left - right);
}

function getCalendarScopeCaption(timeScope: CalendarTimeScope): string {
  if (timeScope.mode === "year") return "Year view";
  if (timeScope.mode === "month") return "Month view";
  if (timeScope.mode === "week") return "Week view";

  return "Day view";
}

function isSameCalendarTimeScope(
  left: CalendarTimeScope,
  right: CalendarTimeScope,
): boolean {
  return (
    left.mode === right.mode &&
    left.startDate === right.startDate &&
    left.endDate === right.endDate
  );
}

function parseDateParts(date: string): { day: number; month: number; year: number } {
  return {
    day: Number(date.slice(8, 10)),
    month: Number(date.slice(5, 7)),
    year: Number(date.slice(0, 4)),
  };
}

function parseDateKey(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function createDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getMonthEndDate(year: number, month: number): string {
  const end = new Date(Date.UTC(year, month, 0));

  return toDateKey(end);
}

function clampDateToRange(date: string, startDate: string, endDate: string): string {
  if (date < startDate) return startDate;
  if (date > endDate) return endDate;

  return date;
}

function setDateYear(date: string, year: number): string {
  const current = parseDateKey(date);
  const month = current.getUTCMonth();
  const maxDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(current.getUTCDate(), maxDay);

  return toDateKey(new Date(Date.UTC(year, month, day)));
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function addUtcMonths(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const targetMonthEnd = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(date.getUTCDate(), targetMonthEnd);

  return new Date(Date.UTC(year, month, day));
}

function toDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatCalendarShortDate(date: string): string {
  const parts = parseDateParts(date);

  return `${calendarMonthLabels[parts.month - 1].slice(0, 3)} ${parts.day}`;
}

function formatCalendarLongDate(date: string): string {
  const parts = parseDateParts(date);

  return `${calendarMonthLabels[parts.month - 1]} ${parts.day}, ${parts.year}`;
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
      <Select value={value} onValueChange={(nextValue) => onChange(nextValue ?? "")}>
        <SelectTrigger
          className={
            isActive
              ? "h-8 w-full min-w-0 overflow-hidden rounded-lg bg-ddhq-paper *:data-[slot=select-value]:min-w-0 *:data-[slot=select-value]:overflow-hidden *:data-[slot=select-value]:truncate *:data-[slot=select-value]:font-semibold *:data-[slot=select-value]:text-primary"
              : "h-8 w-full min-w-0 overflow-hidden rounded-lg bg-ddhq-paper *:data-[slot=select-value]:min-w-0 *:data-[slot=select-value]:overflow-hidden *:data-[slot=select-value]:truncate"
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
