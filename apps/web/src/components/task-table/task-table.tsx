import { Button } from "@due-date-hq/ui/components/button";
import { Checkbox } from "@due-date-hq/ui/components/checkbox";
import { cn } from "@due-date-hq/ui/lib/utils";
import { Input } from "@due-date-hq/ui/components/input";
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
  CalendarPlus,
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
  in_progress: "In progress",
  waiting_on_client: "Waiting on client",
  done: "Done",
} satisfies Record<DeadlineTaskStatus, string>;

const statusOptions = [
  { label: statusLabels.not_started, value: "not_started" },
  { label: statusLabels.in_progress, value: "in_progress" },
  { label: statusLabels.waiting_on_client, value: "waiting_on_client" },
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
  done: {
    indicator: "bg-ddhq-verified",
    label: statusLabels.done,
    tone: "text-ddhq-verified",
  },
} satisfies Record<DeadlineTaskStatus, { indicator: string; label: string; tone: string }>;

const statusSortRank: Record<DeadlineTaskStatus, number> = {
  not_started: 1,
  in_progress: 2,
  waiting_on_client: 3,
  done: 4,
};

const trustSortRank: Record<DashboardTaskRow["verificationStatus"], number> = {
  verified: 1,
  entered_deadline: 2,
  needs_review: 3,
  source_changed: 4,
  unsupported: 5,
};

const tableHeaderCellClass =
  "sticky top-0 z-20 bg-muted text-[11px] font-semibold uppercase text-muted-foreground";
const stickySelectHeaderClass =
  "sticky left-0 top-0 z-50 w-10 min-w-10 bg-muted";
const stickySelectCellClass =
  "sticky left-0 z-30 w-10 min-w-10 bg-background group-hover:bg-muted";
const stickyClientHeaderClass =
  "sticky left-10 top-0 z-50 w-48 min-w-48 bg-muted";
const stickyClientCellClass =
  "sticky left-10 z-30 w-48 min-w-48 bg-background group-hover:bg-muted";
const stickyProfileHeaderClass =
  "sticky left-[14.5rem] top-0 z-50 w-48 min-w-48 border-r border-border bg-muted shadow-[10px_0_14px_-14px_rgba(0,0,0,0.45)]";
const stickyProfileCellClass =
  "sticky left-[14.5rem] z-30 w-48 min-w-48 border-r border-border bg-background shadow-[10px_0_14px_-14px_rgba(0,0,0,0.45)] group-hover:bg-muted";
const stickyActionsHeaderClass =
  "sticky right-0 top-0 z-50 w-[188px] min-w-[188px] rounded-tr-lg border-l border-border bg-muted text-right shadow-[-10px_0_14px_-14px_rgba(0,0,0,0.45)]";
const stickyActionsCellClass =
  "sticky right-0 z-30 w-[188px] min-w-[188px] border-l border-border bg-background text-right shadow-[-10px_0_14px_-14px_rgba(0,0,0,0.45)] group-hover:bg-muted";

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
  const [extensionDates, setExtensionDates] = React.useState<Record<string, string>>({});
  const [activeExtensionTaskId, setActiveExtensionTaskId] = React.useState<string | null>(null);
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
  const markExtended = useMutation(
    trpc.tasks.markExtended.mutationOptions({
      onSuccess: (_result, variables) => {
        toast.success("Extension recorded.");
        setExtensionDates((current) => {
          const next = { ...current };
          delete next[variables.taskId];
          return next;
        });
        setActiveExtensionTaskId((current) => (current === variables.taskId ? null : current));
        void queryClient.invalidateQueries();
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const selectedInSection = section.tasks.filter((task) => selectedTaskIds.has(task.id)).length;
  const allSelected = section.tasks.length > 0 && selectedInSection === section.tasks.length;
  const activeExtensionTask = section.tasks.find((task) => task.id === activeExtensionTaskId);
  const activeExtensionDate = activeExtensionTask ? (extensionDates[activeExtensionTask.id] ?? "") : "";
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
    setActiveExtensionTaskId((current) =>
      current && section.tasks.some((task) => task.id === current) ? current : null,
    );
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
        <div className="grid min-h-60 place-items-center rounded-lg border border-border/80 bg-card px-3 py-8 text-center text-sm text-muted-foreground">
          No tasks in this horizon.
        </div>
      ) : (
        <div className="max-h-full max-w-full overflow-auto rounded-lg border border-border/80 bg-card [&_[data-slot=table-container]]:overflow-visible">
          <Table className="min-w-[1610px]">
            <TableHeader>
              <TableRow className="bg-muted/40">
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
                  stickyClientHeaderClass,
                )}
              >
                <SortHeader
                  label="Client"
                  sortKey="client"
                  sortState={sortState}
                  onSort={toggleSort}
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
                  label="Firm target"
                  sortKey="firmTargetDate"
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
                  label="EIN / SSN last 4"
                  sortKey="identifier"
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
                  className={cn("group", countdownUrgencyStyle?.rowClass)}
                >
                <TableCell className={cn(stickySelectCellClass, stickyUrgencyCellClass)}>
                  <Checkbox
                    aria-label={`Select ${task.title}`}
                    checked={selectedTaskIds.has(task.id)}
                    onCheckedChange={() => onToggleTask(task.id)}
                  />
                </TableCell>
                <TableCell className={cn(stickyClientCellClass, stickyUrgencyCellClass)}>
                  <div className="text-sm font-semibold">{task.clientRelationship.displayName}</div>
                </TableCell>
                <TableCell className={cn(stickyProfileCellClass, stickyUrgencyCellClass)}>
                  <div className="text-xs font-medium">{task.filingProfile.displayName}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {task.filingProfile.entityType}
                    {task.filingProfile.states.length > 0 ? ` · ${task.filingProfile.states.join(", ")}` : ""}
                  </div>
                </TableCell>
                <TableCell className="min-w-52">
                  <div className="text-xs font-medium">{task.title}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{task.taxCategory}</div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="text-xs font-semibold">{formatDate(task.currentDueDate)}</div>
                  {task.isExtended ? (
                    <div className="mt-1 flex flex-wrap items-center justify-end gap-1">
                      <StatusBadge status="review">Extended</StatusBadge>
                      {task.originalDueDate ? (
                        <span className="text-[11px] text-muted-foreground">
                          Original {formatDate(task.originalDueDate)}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  {task.hasDateHistory ? (
                    <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <History className="size-3" />
                      History
                    </div>
                  ) : null}
                </TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">
                  {task.firmTargetDate ? formatDate(task.firmTargetDate) : "None"}
                </TableCell>
                <TableCell>
                  <VerificationBadge task={task} />
                </TableCell>
                <TableCell className="text-right">
                  <CountdownBadge task={task} />
                </TableCell>
                <TableCell className="min-w-[11rem]">
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
                    <div className="inline-flex items-center gap-1">
                      <DeadlineStatusBadge status={task.status} />
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
                <TableCell className="min-w-32">
                  <div className="font-mono text-xs font-medium">
                    {profileIdentifierValue(task.filingProfile)}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {profileIdentifierLabel(task.filingProfile)}
                  </div>
                </TableCell>
                <TableCell className="text-xs font-medium">{task.jurisdiction}</TableCell>
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
                      disabled={markExtended.isPending}
                      onClick={() => setActiveExtensionTaskId(task.id)}
                    >
                      <CalendarPlus className="size-3.5" />
                      Extend
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onOpenEvidence(task.id)}
                    >
                      <Eye className="size-3.5" />
                      Evidence
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
        open={Boolean(activeExtensionTask)}
        onOpenChange={(open) => {
          if (!open && !markExtended.isPending) {
            setActiveExtensionTaskId(null);
          }
        }}
      >
        {activeExtensionTask ? (
          <DialogContent
            showCloseButton={false}
            className="w-[calc(100vw-2rem)] max-w-sm gap-0 rounded-lg p-0 sm:max-w-sm"
          >
            <DialogHeader className="border-b border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <DialogTitle>Mark task extended</DialogTitle>
                  <DialogDescription className="mt-1">
                    Enter the new official due date for {activeExtensionTask.title}.
                  </DialogDescription>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Cancel extension entry"
                  disabled={markExtended.isPending}
                  onClick={() => setActiveExtensionTaskId(null)}
                >
                  <X className="size-3" />
                </Button>
              </div>
            </DialogHeader>
            <div className="grid gap-1.5 p-4">
              <label className="text-xs font-medium" htmlFor="extension-date">
                New due date
              </label>
              <Input
                id="extension-date"
                aria-label={`Extension date for ${activeExtensionTask.title}`}
                className="h-8 text-xs"
                type="date"
                value={activeExtensionDate}
                onChange={(event) =>
                  setExtensionDates((current) => ({
                    ...current,
                    [activeExtensionTask.id]: event.target.value,
                  }))
                }
              />
            </div>
            <DialogFooter className="flex-row justify-end border-t border-border p-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={markExtended.isPending}
                onClick={() => setActiveExtensionTaskId(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!activeExtensionDate || markExtended.isPending}
                onClick={() =>
                  markExtended.mutate({
                    taskId: activeExtensionTask.id,
                    newCurrentDueDate: activeExtensionDate,
                  })
                }
              >
                <Check className="size-3.5" />
                Save extension
              </Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
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

function DeadlineStatusBadge({ status }: { status: DeadlineTaskStatus }) {
  const style = statusBadgeStyles[status];

  return (
    <span
      className={cn(
        "inline-flex min-w-[7.25rem] items-center gap-1.5 text-xs font-semibold leading-none whitespace-nowrap",
        style.tone,
      )}
    >
      <span className={cn("size-1.5 rounded-full", style.indicator)} aria-hidden="true" />
      {style.label}
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
        Due today
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
