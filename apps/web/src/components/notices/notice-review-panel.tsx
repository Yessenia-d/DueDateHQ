import { Button } from "@due-date-hq/ui/components/button";
import { Checkbox } from "@due-date-hq/ui/components/checkbox";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Clock, ExternalLink, X } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/status-badge";
import { formatDate, formatDateTime } from "@/utils/date-format";
import { trpc } from "@/utils/trpc";

import type { NoticeAlertSummary } from "@due-date-hq/api/routers/notices";
import type { NoticeProposalListItem } from "@due-date-hq/api/routers/noticeProposals";

type NoticeReviewPanelProps = {
  notice: NoticeAlertSummary;
  proposals: NoticeProposalListItem[];
  compact?: boolean;
};

const proposalTypeLabels: Record<NoticeProposalListItem["proposalType"], string> = {
  coverage_review_status_update: "Coverage/review status",
  task_update: "Task date/status",
};

const proposalStatusLabels: Record<NoticeProposalListItem["status"], string> = {
  approved: "Approved",
  decide_later: "Decide later",
  pending: "Pending",
  rejected: "Rejected",
};

export function NoticeReviewPanel({ compact = false, notice, proposals }: NoticeReviewPanelProps) {
  const [selectedProposalIds, setSelectedProposalIds] = React.useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const pendingProposals = proposals.filter((proposal) =>
    proposal.status === "pending" || proposal.status === "decide_later",
  );
  const selectedActionableIds = [...selectedProposalIds].filter((proposalId) =>
    pendingProposals.some((proposal) => proposal.id === proposalId),
  );

  const invalidateNoticeData = React.useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: trpc.notices.list.queryKey() }),
      queryClient.invalidateQueries({ queryKey: trpc.notices.get.queryKey({ noticeId: notice.id }) }),
      queryClient.invalidateQueries({
        queryKey: trpc.noticeProposals.listForNotice.queryKey({ noticeId: notice.id }),
      }),
      queryClient.invalidateQueries({ queryKey: trpc.dashboard.summary.queryKey() }),
    ]);
  }, [notice.id, queryClient]);

  const approve = useMutation(
    trpc.noticeProposals.approve.mutationOptions({
      onSuccess: async () => {
        toast.success("Proposal approved.");
        await invalidateNoticeData();
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const reject = useMutation(
    trpc.noticeProposals.reject.mutationOptions({
      onSuccess: async () => {
        toast.success("Proposal rejected.");
        await invalidateNoticeData();
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const decideLater = useMutation(
    trpc.noticeProposals.decideLater.mutationOptions({
      onSuccess: async () => {
        toast.success("Proposal deferred.");
        await invalidateNoticeData();
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const bulkApprove = useMutation(
    trpc.noticeProposals.bulkApprove.mutationOptions({
      onSuccess: async (result) => {
        toast.success(`Approved ${result.updatedCount} proposals.`);
        setSelectedProposalIds(new Set());
        await invalidateNoticeData();
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const bulkReject = useMutation(
    trpc.noticeProposals.bulkReject.mutationOptions({
      onSuccess: async (result) => {
        toast.success(`Rejected ${result.updatedCount} proposals.`);
        setSelectedProposalIds(new Set());
        await invalidateNoticeData();
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const bulkDecideLater = useMutation(
    trpc.noticeProposals.bulkDecideLater.mutationOptions({
      onSuccess: async (result) => {
        toast.success(`Deferred ${result.updatedCount} proposals.`);
        setSelectedProposalIds(new Set());
        await invalidateNoticeData();
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const isMutating =
    approve.isPending ||
    reject.isPending ||
    decideLater.isPending ||
    bulkApprove.isPending ||
    bulkReject.isPending ||
    bulkDecideLater.isPending;

  function toggleProposal(proposalId: string, checked: boolean) {
    setSelectedProposalIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(proposalId);
      } else {
        next.delete(proposalId);
      }
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setSelectedProposalIds(checked ? new Set(pendingProposals.map((proposal) => proposal.id)) : new Set());
  }

  return (
    <div className="grid min-w-0 gap-3">
      <section className="min-w-0 rounded-lg border border-border/80 bg-card p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={notice.confidenceLabel === "high" ? "verified" : "review"}>
                {notice.confidenceLabel === "high" ? "High confidence" : "Medium confidence"}
              </StatusBadge>
              <StatusBadge status="source_changed">{notice.jurisdiction}</StatusBadge>
              <span className="text-xs text-muted-foreground">
                {notice.pendingCount} pending of {notice.affectedCount} affected
              </span>
            </div>
            <h2 className="mt-2 break-words text-base font-semibold leading-snug">{notice.noticeTitle}</h2>
            <p className="mt-1 max-w-3xl break-words text-sm leading-5 text-muted-foreground">
              {notice.noticeSummary}
            </p>
          </div>
          <a
            href={notice.noticeUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground hover:bg-muted"
          >
            <ExternalLink className="size-3.5" />
            Official link
          </a>
        </div>

        <div className="mt-3 grid gap-2 border-t border-border/70 pt-3 text-xs text-muted-foreground md:grid-cols-3">
          <div>
            <div className="font-semibold text-foreground">Official source</div>
            <div className="mt-1 break-words">{notice.sourceName}</div>
          </div>
          <div>
            <div className="font-semibold text-foreground">Published</div>
            <div className="mt-1">
              {notice.noticePublishedAt ? formatDate(notice.noticePublishedAt) : "Not provided"}
            </div>
          </div>
          <div>
            <div className="font-semibold text-foreground">Detected</div>
            <div className="mt-1">{formatDateTime(notice.detectedAt)}</div>
          </div>
        </div>

        <div className="mt-3 border-t border-border/70 pt-3 text-xs">
          <div className="font-semibold text-foreground">Captured official link</div>
          <a
            href={notice.noticeUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 block break-all font-mono text-primary hover:underline"
          >
            {notice.noticeUrl}
          </a>
        </div>

        <div className="mt-3 grid gap-3 border-t border-border/70 pt-3 md:grid-cols-2">
          <div>
            <div className="text-xs font-semibold text-foreground">Confidence reasons</div>
            <ul className="mt-1 grid gap-1 text-xs text-muted-foreground">
              {notice.confidenceReasons.map((reason) => (
                <li key={reason} className="break-words">{reason}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-xs font-semibold text-foreground">Affected conditions</div>
            <ul className="mt-1 grid gap-1 text-xs text-muted-foreground">
              {notice.impactConditions.map((condition) => (
                <li key={`${condition.jurisdiction}-${condition.summary}`} className="break-words">
                  {condition.summary}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="min-h-0 min-w-0 rounded-lg border border-border/80 bg-card">
        <div className="flex flex-col gap-2 border-b border-border/80 p-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-sm font-semibold">Affected proposal diffs</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Workspace changes are applied only after approval.
            </p>
          </div>
          {selectedActionableIds.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                size="sm"
                disabled={isMutating}
                onClick={() => bulkApprove.mutate({ proposalIds: selectedActionableIds })}
              >
                <Check className="size-3.5" />
                Approve selected
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isMutating}
                onClick={() => bulkDecideLater.mutate({ proposalIds: selectedActionableIds })}
              >
                <Clock className="size-3.5" />
                Decide later
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isMutating}
                onClick={() => bulkReject.mutate({ proposalIds: selectedActionableIds })}
              >
                <X className="size-3.5" />
                Reject selected
              </Button>
            </div>
          ) : null}
        </div>

        <div className={compact ? "max-h-[520px] overflow-y-auto overflow-x-hidden" : "overflow-x-hidden"}>
          <div className="sticky top-0 z-10 flex min-w-0 items-center gap-2 border-b border-border/80 bg-card px-3 py-2 text-xs font-semibold text-muted-foreground">
            <Checkbox
              aria-label="Select all actionable proposals"
              checked={
                pendingProposals.length > 0 &&
                pendingProposals.every((proposal) => selectedProposalIds.has(proposal.id))
              }
              disabled={pendingProposals.length === 0}
              onCheckedChange={(checked) => toggleAll(Boolean(checked))}
            />
            <span className="min-w-0">
              {pendingProposals.length} actionable proposal{pendingProposals.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="grid min-w-0 gap-3 p-3">
            {proposals.map((proposal) => (
              <ProposalDiffCard
                key={proposal.id}
                isMutating={isMutating}
                proposal={proposal}
                selected={selectedProposalIds.has(proposal.id)}
                onApprove={() => approve.mutate({ proposalId: proposal.id })}
                onDecideLater={() => decideLater.mutate({ proposalId: proposal.id })}
                onReject={() => reject.mutate({ proposalId: proposal.id })}
                onToggle={(checked) => toggleProposal(proposal.id, checked)}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function ProposalDiffCard({
  isMutating,
  onApprove,
  onDecideLater,
  onReject,
  onToggle,
  proposal,
  selected,
}: {
  isMutating: boolean;
  onApprove: () => void;
  onDecideLater: () => void;
  onReject: () => void;
  onToggle: (checked: boolean) => void;
  proposal: NoticeProposalListItem;
  selected: boolean;
}) {
  const actionable = proposal.status === "pending" || proposal.status === "decide_later";
  const affectedClient = proposal.target.clientDisplayName ?? "Client not linked";
  const affectedTask =
    proposal.target.taskTitle ??
    (proposal.deadlineTaskId ? `Task ${proposal.deadlineTaskId}` : "No deadline task");
  const profileMeta = [
    proposal.target.filingProfileDisplayName,
    proposal.target.jurisdiction,
    proposal.target.taxCategory,
  ]
    .filter(Boolean)
    .join(" / ");

  return (
    <article className="min-w-0 rounded-md border border-border/70 bg-background p-3">
      <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Checkbox
            aria-label={`Select ${proposal.id}`}
            checked={selected}
            disabled={!actionable}
            onCheckedChange={(checked) => onToggle(Boolean(checked))}
          />
          <div className="min-w-0">
            <div className="grid min-w-0 gap-1 text-sm">
              <div className="grid min-w-0 gap-0.5 sm:grid-cols-[112px_minmax(0,1fr)]">
                <span className="text-xs font-semibold text-muted-foreground">Affected client</span>
                <span className="min-w-0 break-words font-semibold text-foreground">{affectedClient}</span>
              </div>
              <div className="grid min-w-0 gap-0.5 sm:grid-cols-[112px_minmax(0,1fr)]">
                <span className="text-xs font-semibold text-muted-foreground">Task</span>
                <span className="min-w-0 break-words font-semibold text-foreground">{affectedTask}</span>
              </div>
              {profileMeta ? (
                <div className="grid min-w-0 gap-0.5 sm:grid-cols-[112px_minmax(0,1fr)]">
                  <span className="text-xs font-semibold text-muted-foreground">Filing profile</span>
                  <span className="min-w-0 break-words text-xs text-muted-foreground">{profileMeta}</span>
                </div>
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <StatusBadge status="neutral">
                {proposalTypeLabels[proposal.proposalType]}
              </StatusBadge>
              <StatusBadge status={statusTone(proposal.status)}>
                {proposalStatusLabels[proposal.status]}
              </StatusBadge>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-1.5 xl:justify-end">
          <Button
            type="button"
            size="xs"
            disabled={!actionable || isMutating}
            onClick={onApprove}
          >
            Approve
          </Button>
          <Button
            type="button"
            variant="outline"
            size="xs"
            disabled={!actionable || isMutating}
            onClick={onDecideLater}
          >
            Later
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="xs"
            disabled={!actionable || isMutating}
            onClick={onReject}
          >
            Reject
          </Button>
        </div>
      </div>

      <div className="mt-3 grid min-w-0 gap-3 md:grid-cols-2">
        <div className="min-w-0 rounded-md border border-border/70 bg-card p-3">
          <div className="mb-2 text-xs font-semibold text-muted-foreground">Current</div>
          <DiffState state={proposal.beforeState} />
        </div>
        <div className="min-w-0 rounded-md border border-border/70 bg-card p-3">
          <div className="mb-2 text-xs font-semibold text-muted-foreground">Proposed</div>
          <DiffState state={proposal.afterState} />
        </div>
      </div>
    </article>
  );
}

function statusTone(status: NoticeProposalListItem["status"]) {
  switch (status) {
    case "approved":
      return "verified";
    case "rejected":
      return "risk";
    case "decide_later":
      return "review";
    case "pending":
      return "neutral";
  }
}

function DiffState({ state }: { state: Record<string, unknown> }) {
  const entries = Object.entries(state).filter(([key]) => !["reason", "appliedTask", "appliedProfile"].includes(key));

  if (!entries.length) {
    return <span className="text-xs text-muted-foreground">No field changes</span>;
  }

  return (
    <dl className="grid min-w-0 gap-1.5 text-xs">
      {entries.map(([key, value]) => (
        <div key={key} className="grid min-w-0 gap-0.5">
          <dt className="font-semibold text-foreground">{formatFieldName(key)}</dt>
          <dd className="min-w-0 break-words font-mono text-muted-foreground">{formatStateValue(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function formatFieldName(key: string) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase());
}

function formatStateValue(value: unknown) {
  if (value === null || value === undefined) return "None";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value);
}
