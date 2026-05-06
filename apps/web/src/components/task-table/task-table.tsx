import { Button } from "@due-date-hq/ui/components/button";
import { Checkbox } from "@due-date-hq/ui/components/checkbox";
import { cn } from "@due-date-hq/ui/lib/utils";
import { Textarea } from "@due-date-hq/ui/components/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@due-date-hq/ui/components/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@due-date-hq/ui/components/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@due-date-hq/ui/components/table";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  Eye,
  History,
  Pencil,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/status-badge";
import { formatDueTodayCountdown } from "@/utils/deadline-countdown";
import { formatDate } from "@/utils/date-format";
import { queryClient, trpc } from "@/utils/trpc";

import type { DashboardSection, DashboardTaskRow } from "@due-date-hq/api/routers/dashboard";

type DeadlineTaskStatus = DashboardTaskRow["status"];
type SortDirection = "asc" | "desc";
type SortKey =
  | "client"
  | "filingProfile"
  | "identifier"
  | "obligation"
  | "jurisdiction"
  | "currentDueDate"
  | "firmTargetDate"
  | "trust"
  | "countdown"
  | "status";

type SortState = {
  direction: SortDirection;
  key: SortKey;
} | null;
type CountdownUrgencyStyle = {
  badgeClass: string;
  rowClass: string;
  stickyCellClass: string;
};

const statusLabels = {
  not_started: "Not started",
  waiting_on_client: "Waiting on client",
  ready_to_work: "Ready to work",
  in_progress: "In progress",
  done: "Done",
} satisfies Record<DeadlineTaskStatus, string>;

const statusOptions = [
  { label: statusLabels.not_started, value: "not_started" },
  { label: statusLabels.waiting_on_client, value: "waiting_on_client" },
  { label: statusLabels.ready_to_work, value: "ready_to_work" },
  { label: statusLabels.in_progress, value: "in_progress" },
  { label: statusLabels.done, value: "done" },
] satisfies readonly { label: string; value: DeadlineTaskStatus }[];

const statusBadgeStyles = {
  not_started: {
    indicator: "bg-muted-foreground/20",
    label: statusLabels.not_started,
    tone: "text-muted-foreground/65",
  },
  in_progress: {
    indicator: "bg-primary",
    label: statusLabels.in_progress,
    tone: "text-primary brightness-110",
  },
  waiting_on_client: {
    indicator: "bg-ddhq-review",
    label: statusLabels.waiting_on_client,
    tone: "text-ddhq-review",
  },
  ready_to_work: {
    indicator: "bg-primary/65",
    label: statusLabels.ready_to_work,
    tone: "text-primary",
  },
  done: {
    indicator: "bg-ddhq-verified",
    label: statusLabels.done,
    tone: "text-ddhq-verified",
  },
} satisfies Record<DeadlineTaskStatus, { indicator: string; label: string; tone: string }>;

const statusSortRank: Record<DeadlineTaskStatus, number> = {
  not_started: 1,
  waiting_on_client: 2,
  ready_to_work: 3,
  in_progress: 4,
  done: 5,
};

const trustSortRank: Record<DashboardTaskRow["verificationStatus"], number> = {
  verified: 1,
  entered_deadline: 2,
  needs_review: 3,
  source_changed: 4,
  unsupported: 5,
};

const tableHeaderCellClass =
  "sticky top-0 z-20 bg-ddhq-paper-muted text-[11px] font-semibold uppercase text-muted-foreground";
const stickySelectHeaderClass =
  "sticky left-0 top-0 z-50 w-10 min-w-10 bg-ddhq-paper-muted";
const stickySelectCellClass =
  "sticky left-0 z-30 w-10 min-w-10 bg-ddhq-paper-raised group-hover:bg-ddhq-paper-muted/80";
const stickyProfileHeaderClass =
  "sticky left-10 top-0 z-50 w-56 min-w-56 border-r border-ddhq-line bg-ddhq-paper-muted shadow-[10px_0_18px_-18px_oklch(0.28_0.025_78/0.32)]";
const stickyProfileCellClass =
  "sticky left-10 z-30 w-56 min-w-56 border-r border-ddhq-line bg-ddhq-paper-raised shadow-[10px_0_18px_-18px_oklch(0.28_0.025_78/0.28)] group-hover:bg-ddhq-paper-muted/80";
const stickyActionsHeaderClass =
  "sticky right-0 top-0 z-50 w-[116px] min-w-[116px] rounded-tr-lg border-l border-ddhq-line bg-ddhq-paper-muted text-right shadow-[-10px_0_18px_-18px_oklch(0.28_0.025_78/0.32)]";
const stickyActionsCellClass =
  "sticky right-0 z-30 w-[116px] min-w-[116px] border-l border-ddhq-line bg-ddhq-paper-raised text-right shadow-[-10px_0_18px_-18px_oklch(0.28_0.025_78/0.28)] group-hover:bg-ddhq-paper-muted/80";

const countdownUrgencyStyles = {
  overdue: {
    badgeClass: "border-ddhq-risk/45 bg-ddhq-risk-soft text-ddhq-risk",
    rowClass: "",
    stickyCellClass: "",
  },
  dueToday: {
    badgeClass: "border-ddhq-review/35 bg-ddhq-review-soft/70 text-ddhq-review",
    rowClass: "",
    stickyCellClass: "",
  },
  oneOrTwoDays: {
    badgeClass: "border-primary/25 bg-ddhq-accent-soft/65 text-primary",
    rowClass: "",
    stickyCellClass: "",
  },
  threeDays: {
    badgeClass: "border-primary/20 bg-ddhq-accent-soft/45 text-primary",
    rowClass: "",
    stickyCellClass: "",
  },
} satisfies Record<string, CountdownUrgencyStyle>;

export function TaskTable({
  onOpenEvidence,
  onToggleSection,
  onToggleTask,
  section,
  selectedTaskIds,
}: {
  onOpenEvidence: (taskId: string) => void;
  onToggleSection: (tasks: DashboardTaskRow[], checked: boolean) => void;
  onToggleTask: (taskId: string) => void;
  section: DashboardSection;
  selectedTaskIds: Set<string>;
}) {
  const [statusEdit, setStatusEdit] = React.useState<{
    status: DeadlineTaskStatus;
    taskId: string;
  } | null>(null);
  const [notesEdit, setNotesEdit] = React.useState<{
    clientRelationshipId: string;
    notes: string;
  } | null>(null);
  const [sortState, setSortState] = React.useState<SortState>(null);
  const updateStatus = useMutation(
    trpc.tasks.updateStatus.mutationOptions({
      onSuccess: (_result, variables) => {
        toast.success("Task status updated.");
        setStatusEdit((current) => (current?.taskId === variables.taskId ? null : current));
        void queryClient.invalidateQueries();
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const updateClientNotes = useMutation(
    trpc.clients.updateNotes.mutationOptions({
      onSuccess: (_result, variables) => {
        toast.success("Client notes updated.");
        setNotesEdit((current) =>
          current?.clientRelationshipId === variables.clientRelationshipId ? null : current,
        );
        void Promise.all([
          queryClient.invalidateQueries(trpc.dashboard.summary.queryFilter()),
          queryClient.invalidateQueries(trpc.clients.list.queryFilter()),
          queryClient.invalidateQueries(trpc.clients.get.queryFilter()),
        ]);
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const selectedInSection = section.tasks.filter((task) => selectedTaskIds.has(task.id)).length;
  const allSelected = section.tasks.length > 0 && selectedInSection === section.tasks.length;
  const activeNotesTask = notesEdit
    ? section.tasks.find(
        (task) => task.clientRelationship.id === notesEdit.clientRelationshipId,
      )
    : null;
  const sortedTasks = React.useMemo(
    () => sortTasks(section.tasks, sortState),
    [section.tasks, sortState],
  );

  function toggleSort(key: SortKey) {
    setSortState((current) => {
      if (current?.key !== key) {
        return { key, direction: "asc" };
      }

      if (current.direction === "asc") {
        return { key, direction: "desc" };
      }

      return null;
    });
  }

  React.useEffect(() => {
    setStatusEdit((current) =>
      current && section.tasks.some((task) => task.id === current.taskId) ? current : null,
    );
    setNotesEdit((current) =>
      current &&
      section.tasks.some((task) => task.clientRelationship.id === current.clientRelationshipId)
        ? current
        : null,
    );
  }, [section.tasks]);

  return (
    <div className="min-h-0 min-w-0 flex-1">
      {section.tasks.length === 0 ? (
        <div className="grid min-h-60 place-items-center ddhq-panel px-3 py-8 text-center text-sm text-muted-foreground">
          No tasks in this horizon.
        </div>
      ) : (
        <div className="max-h-full max-w-full overflow-auto ddhq-table-shell [&_[data-slot=table-container]]:overflow-visible">
          <Table className="min-w-[1510px]">
            <TableHeader>
              <TableRow className="bg-ddhq-paper-muted/70 hover:bg-ddhq-paper-muted/70">
              <TableHead
                className={cn(
                  tableHeaderCellClass,
                  stickySelectHeaderClass,
                )}
              >
                <Checkbox
                  aria-label={`Select all ${section.label} tasks`}
                  checked={allSelected}
                  onCheckedChange={(checked) => onToggleSection(section.tasks, checked === true)}
                />
              </TableHead>
              <TableHead
                className={cn(
                  tableHeaderCellClass,
                  stickyProfileHeaderClass,
                )}
              >
                <SortHeader
                  label="Filing profile"
                  sortKey="filingProfile"
                  sortState={sortState}
                  onSort={toggleSort}
                />
              </TableHead>
              <TableHead className={tableHeaderCellClass}>
                <SortHeader
                  label="Obligation"
                  sortKey="obligation"
                  sortState={sortState}
                  onSort={toggleSort}
                />
              </TableHead>
              <TableHead className={cn(tableHeaderCellClass, "text-right")}>
                <SortHeader
                  align="right"
                  label="Official due date"
                  sortKey="currentDueDate"
                  sortState={sortState}
                  onSort={toggleSort}
                />
              </TableHead>
              <TableHead className={cn(tableHeaderCellClass, "text-right")}>
                <SortHeader
                  align="right"
                  label="Countdown"
                  sortKey="countdown"
                  sortState={sortState}
                  onSort={toggleSort}
                />
              </TableHead>
              <TableHead className={cn(tableHeaderCellClass, "min-w-[11rem]")}>
                <SortHeader
                  label="Status"
                  sortKey="status"
                  sortState={sortState}
                  onSort={toggleSort}
                />
              </TableHead>
              <TableHead className={tableHeaderCellClass}>
                <SortHeader
                  label="Trust"
                  sortKey="trust"
                  sortState={sortState}
                  onSort={toggleSort}
                />
              </TableHead>
              <TableHead className={cn(tableHeaderCellClass, "min-w-44")}>
                <SortHeader
                  label="Client"
                  sortKey="client"
                  sortState={sortState}
                  onSort={toggleSort}
                />
              </TableHead>
              <TableHead className={tableHeaderCellClass}>
                <SortHeader
                  label="Jurisdiction"
                  sortKey="jurisdiction"
                  sortState={sortState}
                  onSort={toggleSort}
                />
              </TableHead>
              <TableHead className={tableHeaderCellClass}>
                <SortHeader
                  label="EIN / SSN last 4"
                  sortKey="identifier"
                  sortState={sortState}
                  onSort={toggleSort}
                />
              </TableHead>
              <TableHead className={cn(tableHeaderCellClass, "text-right")}>
                <SortHeader
                  align="right"
                  label="Firm target"
                  sortKey="firmTargetDate"
                  sortState={sortState}
                  onSort={toggleSort}
                />
              </TableHead>
              <TableHead className={cn(tableHeaderCellClass, "min-w-56")}>
                Notes
              </TableHead>
              <TableHead
                className={cn(
                  tableHeaderCellClass,
                  stickyActionsHeaderClass,
                )}
              >
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTasks.map((task, taskIndex) => {
              const countdownUrgencyStyle = getCountdownUrgencyStyle(task);
              const stickyUrgencyCellClass = countdownUrgencyStyle?.stickyCellClass ?? "";

              return (
                <TableRow
                  key={task.id}
                  className={cn("group h-[54px]", countdownUrgencyStyle?.rowClass)}
                >
                <TableCell className={cn(stickySelectCellClass, stickyUrgencyCellClass)}>
                  <Checkbox
                    aria-label={`Select ${task.title}`}
                    checked={selectedTaskIds.has(task.id)}
                    onCheckedChange={() => onToggleTask(task.id)}
                  />
                </TableCell>
                <TableCell className={cn(stickyProfileCellClass, stickyUrgencyCellClass)}>
                  <div className="text-sm font-semibold">{task.filingProfile.displayName}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {task.filingProfile.entityType}
                    {task.filingProfile.states.length > 0 ? ` · ${task.filingProfile.states.join(", ")}` : ""}
                  </div>
                </TableCell>
                <TableCell className="min-w-52">
                  <div className="text-[13px] font-medium">{task.title}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{task.taxCategory}</div>
                </TableCell>
                <TableCell className="text-right align-middle">
                  <DueDateCell task={task} />
                </TableCell>
                <TableCell className="text-right">
                  <CountdownBadge task={task} />
                </TableCell>
                <TableCell className="min-w-[11rem] align-middle">
                  {statusEdit?.taskId === task.id ? (
                    <div className="flex min-w-72 items-center gap-1.5">
                      <Select
                        value={statusEdit.status}
                        onValueChange={(value) => {
                          const nextStatus = parseDeadlineTaskStatus(value);
                          if (!nextStatus) return;

                          setStatusEdit({
                            taskId: task.id,
                            status: nextStatus,
                          });
                        }}
                        disabled={updateStatus.isPending}
                      >
                        <SelectTrigger size="sm" className="h-7 w-40 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map(({ label, value }) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={updateStatus.isPending || statusEdit.status === task.status}
                        onClick={() =>
                          updateStatus.mutate({
                            taskId: task.id,
                            status: statusEdit.status,
                          })
                        }
                      >
                        <Check className="size-3.5" />
                        Save
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={updateStatus.isPending}
                        onClick={() => setStatusEdit(null)}
                      >
                        <X className="size-3.5" />
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex min-w-0 items-center gap-1">
                      <TaskStatusStack task={task} />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="size-6 text-muted-foreground hover:text-foreground"
                        aria-label={`Edit status for ${task.title}`}
                        disabled={updateStatus.isPending}
                        onClick={() =>
                          setStatusEdit({
                            taskId: task.id,
                            status: task.status,
                          })
                        }
                      >
                        <Pencil className="size-3" />
                      </Button>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <VerificationBadge task={task} />
                </TableCell>
                <TableCell className="min-w-44 text-xs text-muted-foreground">
                  <div className="font-medium text-foreground/75">{task.clientRelationship.displayName}</div>
                </TableCell>
                <TableCell className="text-xs font-medium">{task.jurisdiction}</TableCell>
                <TableCell className="min-w-32">
                  <div className="font-mono text-xs font-medium">
                    {profileIdentifierValue(task.filingProfile)}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {profileIdentifierLabel(task.filingProfile)}
                  </div>
                </TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">
                  {task.firmTargetDate ? formatDate(task.firmTargetDate) : "None"}
                </TableCell>
                <TableCell className="min-w-56 max-w-72">
                  <div className="flex items-start gap-1.5">
                    <div className="min-w-0 flex-1">
                      {task.clientRelationship.notes ? (
                        <div className="line-clamp-2 text-xs leading-5 text-foreground/80">
                          {task.clientRelationship.notes}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/55">No notes</span>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="size-6 text-muted-foreground hover:text-foreground"
                      aria-label={`Edit notes for ${task.clientRelationship.displayName}`}
                      disabled={updateClientNotes.isPending}
                      onClick={() =>
                        setNotesEdit({
                          clientRelationshipId: task.clientRelationship.id,
                          notes: task.clientRelationship.notes ?? "",
                        })
                      }
                    >
                      <Pencil className="size-3" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell
                  className={cn(
                    stickyActionsCellClass,
                    stickyUrgencyCellClass,
                    taskIndex === sortedTasks.length - 1 ? "rounded-br-lg" : "",
                  )}
                >
                  <div className="flex justify-end gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-ddhq-line bg-ddhq-paper hover:bg-muted/55"
                      aria-label={`Open detail for ${task.title}`}
                      onClick={() => onOpenEvidence(task.id)}
                    >
                      <Eye className="size-3.5" />
                      Detail
                    </Button>
                  </div>
                </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          </Table>
        </div>
      )}
      <Dialog
        open={Boolean(activeNotesTask)}
        onOpenChange={(open) => {
          if (!open && !updateClientNotes.isPending) {
            setNotesEdit(null);
          }
        }}
      >
        {activeNotesTask && notesEdit ? (
          <DialogContent
            showCloseButton={false}
            className="w-[calc(100vw-2rem)] max-w-lg gap-0 rounded-lg p-0 sm:max-w-lg"
          >
            <DialogHeader className="border-b border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <DialogTitle>Edit client notes</DialogTitle>
                  <DialogDescription className="mt-1">
                    Notes for {activeNotesTask.clientRelationship.displayName}.
                  </DialogDescription>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Cancel notes editing"
                  disabled={updateClientNotes.isPending}
                  onClick={() => setNotesEdit(null)}
                >
                  <X className="size-3" />
                </Button>
              </div>
            </DialogHeader>
            <div className="grid gap-1.5 p-4">
              <label className="text-xs font-medium" htmlFor="client-notes">
                Notes
              </label>
              <Textarea
                id="client-notes"
                aria-label={`Notes for ${activeNotesTask.clientRelationship.displayName}`}
                className="min-h-36 resize-y text-sm leading-5"
                disabled={updateClientNotes.isPending}
                value={notesEdit.notes}
                onChange={(event) =>
                  setNotesEdit({
                    clientRelationshipId: activeNotesTask.clientRelationship.id,
                    notes: event.target.value,
                  })
                }
              />
            </div>
            <DialogFooter className="flex-row justify-end border-t border-border p-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={updateClientNotes.isPending}
                onClick={() => setNotesEdit(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={
                  updateClientNotes.isPending ||
                  normalizeNote(notesEdit.notes) ===
                    normalizeNote(activeNotesTask.clientRelationship.notes)
                }
                onClick={() =>
                  updateClientNotes.mutate({
                    clientRelationshipId: activeNotesTask.clientRelationship.id,
                    notes: notesEdit.notes,
                  })
                }
              >
                <Check className="size-3.5" />
                Save notes
              </Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}

function parseDeadlineTaskStatus(value: string | null): DeadlineTaskStatus | null {
  return statusOptions.find((option) => option.value === value)?.value ?? null;
}

function normalizeNote(value: string | null): string {
  return value?.trim() ?? "";
}

function SortHeader({
  align = "left",
  label,
  onSort,
  sortKey,
  sortState,
}: {
  align?: "left" | "right";
  label: string;
  onSort: (key: SortKey) => void;
  sortKey: SortKey;
  sortState: SortState;
}) {
  const isActive = sortState?.key === sortKey;
  const Icon = isActive
    ? sortState.direction === "asc"
      ? ArrowUp
      : ArrowDown
    : ArrowUpDown;
  const directionLabel = isActive
    ? sortState.direction === "asc"
      ? "ascending"
      : "descending"
    : "not sorted";

  return (
    <button
      type="button"
      aria-label={`Sort by ${label}; currently ${directionLabel}`}
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-[6px] px-1.5 text-[11px] font-semibold uppercase transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35",
        isActive ? "text-foreground" : "text-muted-foreground",
        align === "right" ? "ml-auto justify-end" : "justify-start",
      )}
      onClick={() => onSort(sortKey)}
    >
      <span>{label}</span>
      <Icon className={cn("size-3", isActive ? "text-primary" : "text-muted-foreground")} />
    </button>
  );
}

function DueDateCell({ task }: { task: DashboardTaskRow }) {
  const originalDate = task.originalDueDate;
  const hasOriginalDatePair = Boolean(
    task.isExtended && originalDate && originalDate !== task.currentDueDate,
  );

  return (
    <div className="grid justify-items-end gap-1">
      <div className="text-xs font-semibold">{formatDate(task.currentDueDate)}</div>
      {hasOriginalDatePair ? (
        <div className="inline-flex items-center gap-1 rounded-md bg-ddhq-review-soft/70 px-1.5 py-0.5 text-[11px] font-medium text-ddhq-review">
          <span className="font-semibold">Extended</span>
          <span aria-hidden="true">·</span>
          <span>original {formatDate(originalDate!)}</span>
        </div>
      ) : task.hasDateHistory ? (
        <div className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <History className="size-3" />
          History
        </div>
      ) : null}
    </div>
  );
}

function TaskStatusStack({ task }: { task: DashboardTaskRow }) {
  const tooltipLabel = getStatusTooltipLabel(task);
  const tooltipId = tooltipLabel ? `status-tooltip-${task.id}` : undefined;

  return (
    <DeadlineStatusBadge
      ariaDescribedBy={tooltipId}
      status={task.status}
      tooltipId={tooltipId}
      tooltipLabel={tooltipLabel}
    />
  );
}

function getStatusTooltipLabel(task: DashboardTaskRow): string | null {
  if (task.status === "waiting_on_client") {
    return task.statusDetailLabel;
  }

  return null;
}

function DeadlineStatusBadge({
  ariaDescribedBy,
  status,
  tooltipId,
  tooltipLabel,
}: {
  ariaDescribedBy?: string;
  status: DeadlineTaskStatus;
  tooltipId?: string;
  tooltipLabel?: string | null;
}) {
  const style = statusBadgeStyles[status];

  return (
    <span className="group/status relative inline-flex min-w-[7.25rem] items-center">
      <span
        aria-describedby={ariaDescribedBy}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-[4px] text-xs font-semibold leading-none whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-ring/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          style.tone,
          tooltipLabel ? "cursor-help" : "",
        )}
        tabIndex={tooltipLabel ? 0 : undefined}
      >
        <span className={cn("size-1.5 rounded-full", style.indicator)} aria-hidden="true" />
        {style.label}
      </span>
      {tooltipLabel && tooltipId ? (
        <span
          id={tooltipId}
          role="tooltip"
          className="pointer-events-none absolute left-0 top-full z-[80] mt-2 hidden max-w-56 rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs font-medium leading-5 text-popover-foreground shadow-lg group-hover/status:block group-focus-within/status:block"
        >
          {tooltipLabel}
        </span>
      ) : null}
    </span>
  );
}

function sortTasks(tasks: DashboardTaskRow[], sortState: SortState): DashboardTaskRow[] {
  if (!sortState) return tasks;

  const directionMultiplier = sortState.direction === "asc" ? 1 : -1;

  return [...tasks].sort((a, b) => {
    const result = compareTasksByKey(a, b, sortState.key);
    if (result !== 0) return result * directionMultiplier;

    return compareStrings(a.id, b.id);
  });
}

function compareTasksByKey(a: DashboardTaskRow, b: DashboardTaskRow, key: SortKey): number {
  switch (key) {
    case "client":
      return compareStrings(a.clientRelationship.displayName, b.clientRelationship.displayName);
    case "filingProfile":
      return compareStrings(a.filingProfile.displayName, b.filingProfile.displayName);
    case "identifier":
      return compareNullableStrings(
        profileIdentifierValueForSort(a.filingProfile),
        profileIdentifierValueForSort(b.filingProfile),
      );
    case "obligation":
      return compareStrings(a.title, b.title) || compareStrings(a.taxCategory, b.taxCategory);
    case "jurisdiction":
      return compareStrings(a.jurisdiction, b.jurisdiction);
    case "currentDueDate":
      return compareStrings(a.currentDueDate, b.currentDueDate);
    case "firmTargetDate":
      return compareNullableStrings(a.firmTargetDate, b.firmTargetDate);
    case "trust":
      return compareNumbers(trustSortRank[a.verificationStatus], trustSortRank[b.verificationStatus]) ||
        compareStrings(a.verificationLabel, b.verificationLabel);
    case "countdown":
      return compareNumbers(a.daysRemaining, b.daysRemaining);
    case "status":
      return compareNumbers(statusSortRank[a.status], statusSortRank[b.status]);
  }
}

function compareNullableStrings(a: string | null, b: string | null): number {
  if (a && !b) return -1;
  if (!a && b) return 1;
  if (!a && !b) return 0;

  return compareStrings(a ?? "", b ?? "");
}

function compareNumbers(a: number, b: number): number {
  return a - b;
}

function compareStrings(a: string, b: string): number {
  return a.localeCompare(b, "en", { numeric: true, sensitivity: "base" });
}

function profileIdentifierLabel(profile: DashboardTaskRow["filingProfile"]): string {
  return profile.entityType === "individual" ? "SSN last 4" : "EIN";
}

function profileIdentifierValue(profile: DashboardTaskRow["filingProfile"]): string {
  const identifier = profileIdentifierValueForSort(profile);

  return identifier?.trim() || "Not provided";
}

function profileIdentifierValueForSort(profile: DashboardTaskRow["filingProfile"]): string | null {
  return profile.entityType === "individual" ? profile.ssnLast4 : profile.ein;
}

function getCountdownUrgencyStyle(task: DashboardTaskRow): CountdownUrgencyStyle | null {
  if (task.urgency === "overdue") return countdownUrgencyStyles.overdue;
  if (task.urgency === "due_today" || task.daysRemaining === 0) return countdownUrgencyStyles.dueToday;
  if (task.daysRemaining === 1 || task.daysRemaining === 2) return countdownUrgencyStyles.oneOrTwoDays;
  if (task.daysRemaining === 3) return countdownUrgencyStyles.threeDays;

  return null;
}

function CountdownBadge({ task }: { task: DashboardTaskRow }) {
  const urgencyStyle = getCountdownUrgencyStyle(task);

  if (task.urgency === "overdue") {
    return (
      <StatusBadge status="risk" className={urgencyStyle?.badgeClass}>
        {formatDays(Math.abs(task.daysRemaining))} overdue
      </StatusBadge>
    );
  }

  if (task.urgency === "due_today" || task.daysRemaining === 0) {
    return (
      <StatusBadge status="review" className={urgencyStyle?.badgeClass}>
        {formatDueTodayCountdown({ dateKey: task.currentDueDate })}
      </StatusBadge>
    );
  }

  if (task.daysRemaining > 0 && task.daysRemaining <= 3) {
    return (
      <StatusBadge status="neutral" className={urgencyStyle?.badgeClass}>
        {formatDays(task.daysRemaining)}
      </StatusBadge>
    );
  }

  if (task.horizon === "due_this_week") {
    return (
      <StatusBadge
        status="neutral"
        className="border-ddhq-gap/15 bg-ddhq-gap-soft/35 text-ddhq-gap/80"
      >
        {formatDays(task.daysRemaining)}
      </StatusBadge>
    );
  }

  return <span className="text-xs text-muted-foreground">{formatDays(task.daysRemaining)}</span>;
}

function formatDays(days: number): string {
  return `${days} ${days === 1 ? "day" : "days"}`;
}

function VerificationBadge({ task }: { task: DashboardTaskRow }) {
  if (task.verificationStatus === "verified") {
    return (
      <StatusBadge status="verified">
        <ShieldCheck className="size-3" />
        Verified
      </StatusBadge>
    );
  }

  if (task.verificationStatus === "source_changed") {
    return (
      <StatusBadge status="source_changed">
        <ShieldAlert className="size-3" />
        Source changed
      </StatusBadge>
    );
  }

  if (task.verificationStatus === "entered_deadline") {
    return (
      <div className="grid gap-1">
        <StatusBadge status="entered_deadline">Entered deadline</StatusBadge>
        <span className="text-xs text-muted-foreground">Not verified by DueDateHQ</span>
      </div>
    );
  }

  return (
    <StatusBadge
      status="gap"
      className="border-ddhq-gap/25 bg-ddhq-gap-soft text-ddhq-gap"
    >
      {task.verificationLabel}
    </StatusBadge>
  );
}
