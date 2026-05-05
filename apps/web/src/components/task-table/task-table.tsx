import { Button } from "@due-date-hq/ui/components/button";
import { Checkbox } from "@due-date-hq/ui/components/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@due-date-hq/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@due-date-hq/ui/components/table";
import { useMutation } from "@tanstack/react-query";
import { Eye, History, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/status-badge";
import { queryClient, trpc } from "@/utils/trpc";

import type { DashboardSection, DashboardTaskRow } from "@due-date-hq/api/routers/dashboard";

type DeadlineTaskStatus = DashboardTaskRow["status"];

const statusLabels: Record<DeadlineTaskStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  waiting_on_client: "Waiting on client",
  done: "Done",
};

const priorityLabels: Record<DashboardTaskRow["priority"], string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

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
  const updateStatus = useMutation(
    trpc.tasks.updateStatus.mutationOptions({
      onSuccess: () => {
        toast.success("Task status updated.");
        void queryClient.invalidateQueries();
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const selectedInSection = section.tasks.filter((task) => selectedTaskIds.has(task.id)).length;
  const allSelected = section.tasks.length > 0 && selectedInSection === section.tasks.length;

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex flex-col gap-2 border-b border-border px-3 py-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Checkbox
            aria-label={`Select ${section.label}`}
            checked={allSelected}
            onCheckedChange={(checked) => onToggleSection(section.tasks, checked === true)}
          />
          <h2 className="text-base font-semibold">{section.label}</h2>
          <StatusBadge status="neutral">{section.count}</StatusBadge>
        </div>
      </div>

      {section.tasks.length === 0 ? (
        <div className="px-3 py-8 text-center text-sm text-muted-foreground">
          No tasks in this horizon.
        </div>
      ) : (
        <Table className="min-w-[1180px]">
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-8 text-[11px] font-semibold uppercase text-muted-foreground">Select</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground">Client / profile</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground">Obligation</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground">Jurisdiction</TableHead>
              <TableHead className="text-right text-[11px] font-semibold uppercase text-muted-foreground">Official due date</TableHead>
              <TableHead className="text-right text-[11px] font-semibold uppercase text-muted-foreground">Firm target</TableHead>
              <TableHead className="text-right text-[11px] font-semibold uppercase text-muted-foreground">Countdown</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground">Status</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground">Priority</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground">Trust</TableHead>
              <TableHead className="text-right text-[11px] font-semibold uppercase text-muted-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {section.tasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell>
                  <Checkbox
                    aria-label={`Select ${task.title}`}
                    checked={selectedTaskIds.has(task.id)}
                    onCheckedChange={() => onToggleTask(task.id)}
                  />
                </TableCell>
                <TableCell className="min-w-56">
                  <div className="text-sm font-semibold">{task.clientRelationship.displayName}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{task.filingProfile.displayName}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{task.filingProfile.entityType}</div>
                </TableCell>
                <TableCell className="min-w-52">
                  <div className="text-xs font-medium">{task.title}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{task.taxCategory}</div>
                  {task.isExtended ? <StatusBadge status="review" className="mt-1">Extended</StatusBadge> : null}
                </TableCell>
                <TableCell className="text-xs font-medium">{task.jurisdiction}</TableCell>
                <TableCell className="text-right">
                  <div className="text-xs font-semibold">{formatDate(task.currentDueDate)}</div>
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
                <TableCell className="text-right">
                  <CountdownBadge task={task} />
                </TableCell>
                <TableCell>
                  <Select
                    value={task.status}
                    onValueChange={(value) =>
                      updateStatus.mutate({
                        taskId: task.id,
                        status: value as DeadlineTaskStatus,
                      })
                    }
                    disabled={updateStatus.isPending}
                  >
                    <SelectTrigger size="sm" className="h-7 w-auto text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <StatusBadge
                    status={task.priority === "urgent" ? "risk" : task.priority === "high" ? "review" : "neutral"}
                  >
                    {priorityLabels[task.priority]}
                  </StatusBadge>
                </TableCell>
                <TableCell>
                  <VerificationBadge task={task} />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenEvidence(task.id)}
                  >
                    <Eye className="size-3.5" />
                    Evidence
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function CountdownBadge({ task }: { task: DashboardTaskRow }) {
  if (task.urgency === "overdue") {
    return <StatusBadge status="risk">{Math.abs(task.daysRemaining)} days overdue</StatusBadge>;
  }

  if (task.urgency === "due_today") {
    return <StatusBadge status="risk">Due today</StatusBadge>;
  }

  if (task.horizon === "due_this_week") {
    return <StatusBadge status="review">{task.daysRemaining} days</StatusBadge>;
  }

  return <span className="text-xs text-muted-foreground">{task.daysRemaining} days</span>;
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

  if (task.verificationStatus === "user_provided") {
    return <StatusBadge status="user_provided">User provided, not verified</StatusBadge>;
  }

  return <StatusBadge status="needs_review">{task.verificationLabel}</StatusBadge>;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}
