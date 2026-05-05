import type { DashboardSection, DashboardTaskRow } from "@due-date-hq/api/routers/dashboard";
import { Button } from "@due-date-hq/ui/components/button";
import { Input } from "@due-date-hq/ui/components/input";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList, FileUp, Search, Users } from "lucide-react";
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

const sectionOrder: Array<DashboardSection["id"]> = [
  "overdue",
  "due_this_week",
  "this_month",
  "long_range",
];

const sectionLabels: Record<DashboardSection["id"], string> = {
  overdue: "Overdue",
  due_this_week: "Due this week",
  this_month: "This month",
  long_range: "Later",
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
  const visibleClients = React.useMemo(() => {
    const allClients = clients.data?.clients ?? [];
    const query = clientSearchQuery.trim().toLocaleLowerCase();

    if (!query) return allClients;

    return allClients.filter((client) =>
      client.displayName.toLocaleLowerCase().includes(query),
    );
  }, [clients.data, clientSearchQuery]);
  const filteredTasks = React.useMemo(() => {
    if (!dashboard.data || !selectedClientId) return [];
    return dashboard.data.allTasks.filter(
      (task) => task.clientRelationship.id === selectedClientId,
    );
  }, [dashboard.data, selectedClientId]);
  const sections = React.useMemo(() => buildSections(filteredTasks), [filteredTasks]);
  const activeSection = React.useMemo(
    () =>
      sections.find((section) => section.id === activeHorizon) ?? {
        id: activeHorizon,
        label: sectionLabels[activeHorizon],
        count: 0,
        tasks: [],
      },
    [activeHorizon, sections],
  );
  const clientQueueSummary = React.useMemo(
    () => summarizeClientQueue(filteredTasks),
    [filteredTasks],
  );

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
    <main className="min-h-0 overflow-auto bg-background text-foreground">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-5 py-5">
        <section className="grid gap-4 pb-1 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <ClipboardList className="size-3.5" />
              Tax Work
            </div>
            <h1 className="mt-1 text-2xl font-semibold leading-tight tracking-normal">
              Client tax workbench
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Work one client at a time: pick a relationship, import tax information, then
              clear the selected client's deadline queue.
            </p>
          </div>
          {selectedClientId ? (
            <a
              href={`/import?clientIds=${encodeURIComponent(selectedClientId)}`}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <FileUp className="size-3.5" />
              Import tax info
            </a>
          ) : (
            <Button type="button" disabled>
              <FileUp className="size-3.5" />
              Import tax info
            </Button>
          )}
        </section>

        {clients.data.clients.length === 0 ? (
          <section className="rounded-xl border border-border bg-muted/20 p-6 text-sm text-muted-foreground">
            No clients yet. Add clients before importing tax information.
          </section>
        ) : (
          <section className="grid min-h-[560px] gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="overflow-hidden rounded-lg border border-border/80 bg-card">
              <div className="px-3 py-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <Users className="size-3.5" />
                  Client worklist
                </div>
                <div className="mt-1 text-sm font-semibold text-foreground">
                  {clients.data.clients.length} relationships
                </div>
                <div className="relative mt-3">
                  <Search
                    className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    type="search"
                    value={clientSearchQuery}
                    aria-label="Search clients"
                    placeholder="Search clients"
                    className="h-8 pl-8 text-xs"
                    onChange={(event) => setClientSearchQuery(event.target.value)}
                  />
                </div>
              </div>
              <div className="max-h-[520px] overflow-auto p-2">
                {visibleClients.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border bg-muted/20 px-3 py-3 text-xs leading-5 text-muted-foreground">
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
                      className={`w-full rounded-md border px-2.5 py-2 text-left transition-colors ${
                        isSelected
                          ? "border-primary/35 bg-ddhq-accent-soft/65 text-foreground"
                          : "border-transparent text-foreground hover:border-border hover:bg-muted/40"
                      }`}
                      onClick={() => setSelectedClientId(client.id)}
                    >
                      <div className="truncate text-sm font-semibold">{client.displayName}</div>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span>{client.filingProfileCount} profiles</span>
                        <span aria-hidden="true">/</span>
                        <span>{client.deadlineTaskCount} tasks</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            <section className="min-w-0">
              {!selectedClientId || !selectedClient ? (
                <div className="rounded-xl border border-border bg-muted/20 p-6 text-sm text-muted-foreground">
                  Select a client to review tax work.
                </div>
              ) : (
                <div className="grid gap-3">
                  <section className="rounded-lg border border-border/80 bg-card p-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-muted-foreground">
                          Active client
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-semibold leading-tight">
                            {selectedClient.displayName}
                          </h2>
                          <StatusBadge status="neutral">
                            {filteredTasks.length} visible tasks
                          </StatusBadge>
                        </div>
                      </div>
                      <a
                        href={`/import?clientIds=${encodeURIComponent(selectedClient.id)}`}
                        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <FileUp className="size-3.5" />
                        Import for this client
                      </a>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                      <QueueMetric label="Overdue" tone="risk" value={clientQueueSummary.overdue} />
                      <QueueMetric label="This week" tone="review" value={clientQueueSummary.dueThisWeek} />
                      <QueueMetric label="Open" tone="neutral" value={clientQueueSummary.open} />
                      <QueueMetric label="Done" tone="verified" value={clientQueueSummary.done} />
                    </div>
                  </section>

                  <section className="rounded-lg border border-border/80 bg-card p-2">
                    <div className="flex flex-wrap items-center gap-1">
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
                  </section>

                  <section className="grid gap-1">
                    <BulkTaskActions
                      selectedTaskIds={selectedTaskIds}
                      taskStatuses={dashboard.data.filterOptions.taskStatuses}
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
    open: tasks.filter((task) => task.status !== "done").length,
    overdue: tasks.filter((task) => task.horizon === "overdue").length,
  };
}

function QueueMetric({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "neutral" | "review" | "risk" | "verified";
  value: number;
}) {
  const toneClass = {
    neutral: "bg-muted/45 text-foreground",
    review: "bg-ddhq-review-soft/75 text-ddhq-review",
    risk: "bg-ddhq-risk-soft/75 text-ddhq-risk",
    verified: "bg-ddhq-verified-soft/75 text-ddhq-verified",
  }[tone];

  return (
    <div className={`rounded-md px-2.5 py-2 ${toneClass}`}>
      <div className="text-[11px] font-semibold text-current/75">{label}</div>
      <div className="mt-1 text-xl font-semibold leading-none">{value}</div>
    </div>
  );
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
  const isDueThisWeek = horizon === "due_this_week";
  const selectedClass = isDueThisWeek
    ? "border-ddhq-review/45 bg-ddhq-review-soft text-ddhq-review"
    : "border-primary/35 bg-ddhq-accent-soft text-primary";

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      className={`inline-flex h-8 items-center gap-2 rounded-md border px-2.5 text-xs font-semibold transition-colors ${
        isSelected
          ? selectedClass
          : "border-transparent text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground"
      }`}
      onClick={onSelect}
    >
      {sectionLabels[horizon]}
      <span
        className={`rounded-full px-1.5 py-0.5 text-[11px] ${
          isSelected ? "bg-background/70" : "bg-muted text-muted-foreground"
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
    return {
      id: sectionId,
      label: sectionLabels[sectionId],
      count: sectionTasks.length,
      tasks: sectionTasks,
    };
  });
}
