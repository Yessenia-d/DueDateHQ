import { Button } from "@due-date-hq/ui/components/button";
import { Checkbox } from "@due-date-hq/ui/components/checkbox";
import { useMutation } from "@tanstack/react-query";
import { Eye, History, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

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
    <div className="border border-[#ded8ce] bg-white">
      <div className="flex flex-col gap-2 border-b border-[#e7e2da] px-3 py-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Checkbox
            aria-label={`Select ${section.label}`}
            checked={allSelected}
            onCheckedChange={(checked) => onToggleSection(section.tasks, checked === true)}
          />
          <h2 className="text-base font-semibold">{section.label}</h2>
          <span className="border border-[#ddd6cb] bg-[#f6f3ee] px-2 py-0.5 text-xs font-semibold text-[#655e55]">
            {section.count}
          </span>
        </div>
      </div>

      {section.tasks.length === 0 ? (
        <div className="px-3 py-8 text-center text-sm text-[#6f685f]">
          No tasks in this horizon.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] border-collapse text-left text-xs">
            <thead className="bg-[#f6f3ee] text-[#6f685f]">
              <tr className="[&>th]:border-b [&>th]:border-[#e7e2da] [&>th]:px-3 [&>th]:py-2 [&>th]:font-semibold">
                <th className="w-8">Select</th>
                <th>Client / profile</th>
                <th>Obligation</th>
                <th>Jurisdiction</th>
                <th className="text-right">Official due date</th>
                <th className="text-right">Firm target</th>
                <th className="text-right">Countdown</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Trust</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ece7df]">
              {section.tasks.map((task) => (
                <tr key={task.id} className="align-middle hover:bg-[#fbfaf7]">
                  <td className="px-3 py-2">
                    <Checkbox
                      aria-label={`Select ${task.title}`}
                      checked={selectedTaskIds.has(task.id)}
                      onCheckedChange={() => onToggleTask(task.id)}
                    />
                  </td>
                  <td className="min-w-56 px-3 py-2">
                    <div className="font-semibold">{task.clientRelationship.displayName}</div>
                    <div className="mt-0.5 text-[#6f685f]">{task.filingProfile.displayName}</div>
                    <div className="mt-0.5 text-[#6f685f]">{task.filingProfile.entityType}</div>
                  </td>
                  <td className="min-w-52 px-3 py-2">
                    <div className="font-medium">{task.title}</div>
                    <div className="mt-0.5 text-[#6f685f]">{task.taxCategory}</div>
                    {task.isExtended ? <StatusBadge tone="review">Extended</StatusBadge> : null}
                  </td>
                  <td className="px-3 py-2 font-medium">{task.jurisdiction}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="font-semibold">{formatDate(task.currentDueDate)}</div>
                    {task.hasDateHistory ? (
                      <div className="mt-1 inline-flex items-center gap-1 text-[#6f685f]">
                        <History className="size-3" />
                        History
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-right text-[#6f685f]">
                    {task.firmTargetDate ? formatDate(task.firmTargetDate) : "None"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <CountdownBadge task={task} />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      className="h-8 border border-[#cfc7bc] bg-white px-2 text-xs"
                      value={task.status}
                      disabled={updateStatus.isPending}
                      onChange={(event) =>
                        updateStatus.mutate({
                          taskId: task.id,
                          status: event.target.value as DeadlineTaskStatus,
                        })
                      }
                    >
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge tone={task.priority === "urgent" ? "risk" : task.priority === "high" ? "review" : "neutral"}>
                      {priorityLabels[task.priority]}
                    </StatusBadge>
                  </td>
                  <td className="px-3 py-2">
                    <VerificationBadge task={task} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onOpenEvidence(task.id)}
                    >
                      <Eye className="size-3.5" />
                      Evidence
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CountdownBadge({ task }: { task: DashboardTaskRow }) {
  if (task.urgency === "overdue") {
    return <StatusBadge tone="risk">{Math.abs(task.daysRemaining)} days overdue</StatusBadge>;
  }

  if (task.urgency === "due_today") {
    return <StatusBadge tone="risk">Due today</StatusBadge>;
  }

  if (task.horizon === "due_this_week") {
    return <StatusBadge tone="review">{task.daysRemaining} days</StatusBadge>;
  }

  return <span className="text-[#6f685f]">{task.daysRemaining} days</span>;
}

function VerificationBadge({ task }: { task: DashboardTaskRow }) {
  if (task.verificationStatus === "verified") {
    return (
      <StatusBadge tone="verified">
        <ShieldCheck className="size-3" />
        Verified
      </StatusBadge>
    );
  }

  if (task.verificationStatus === "source_changed") {
    return (
      <StatusBadge tone="review">
        <ShieldAlert className="size-3" />
        Source changed
      </StatusBadge>
    );
  }

  if (task.verificationStatus === "user_provided") {
    return <StatusBadge tone="neutral">User provided, not verified</StatusBadge>;
  }

  return <StatusBadge tone="review">{task.verificationLabel}</StatusBadge>;
}

function StatusBadge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "verified" | "review" | "risk" | "neutral";
}) {
  const toneClass = {
    verified: "border-[#b7dec6] bg-[#eef8f1] text-[#287347]",
    review: "border-[#ead28e] bg-[#fff7dc] text-[#806218]",
    risk: "border-[#e2afa1] bg-[#fff1ed] text-[#9b3321]",
    neutral: "border-[#ddd6cb] bg-[#f6f3ee] text-[#655e55]",
  }[tone];

  return (
    <span className={`mt-1 inline-flex min-h-6 items-center gap-1 border px-2 text-[11px] font-semibold ${toneClass}`}>
      {children}
    </span>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}
