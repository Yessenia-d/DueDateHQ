import { Button } from "@due-date-hq/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@due-date-hq/ui/components/sheet";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, ChevronDown, ChevronUp, ExternalLink, X } from "lucide-react";
import * as React from "react";

import { NoticeReviewPanel } from "@/components/notices/notice-review-panel";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTime } from "@/utils/date-format";
import { trpc } from "@/utils/trpc";

export function NoticeAlertBanner() {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [dismissedNoticeId, setDismissedNoticeId] = React.useState<string | null>(null);
  const notices = useQuery(trpc.notices.list.queryOptions({ limit: 1 }));
  const notice = notices.data?.notices[0] ?? null;
  const proposals = useQuery({
    ...trpc.noticeProposals.listForNotice.queryOptions({ noticeId: notice?.id ?? "__none__" }),
    enabled: isExpanded && Boolean(notice),
    retry: 1,
  });
  const proposalLoadFailed = proposals.isError || proposals.failureCount > 0;
  const proposalLoadMessage =
    proposals.error?.message ??
    proposals.failureReason?.message ??
    "The proposals request failed.";

  if (notices.isPending) return null;

  if (!notice || notice.id === dismissedNoticeId) return null;

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-14 z-40 min-w-0 px-3 lg:left-[236px] lg:top-3 sm:px-5">
        <div className="mx-auto w-full min-w-0 max-w-[1440px]">
          <section
            aria-live="polite"
            className="pointer-events-auto min-w-0 overflow-hidden rounded-lg border border-ddhq-review/35 bg-ddhq-review-soft/90 shadow-lg shadow-ddhq-review/10 backdrop-blur"
          >
            <div className="flex min-w-0 flex-col gap-3 px-3 py-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md bg-card text-ddhq-review">
                  <AlertTriangle className="size-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={notice.confidenceLabel === "high" ? "verified" : "review"}>
                      {notice.confidenceLabel === "high" ? "High confidence" : "Medium confidence"}
                    </StatusBadge>
                    <StatusBadge status="source_changed">{notice.jurisdiction}</StatusBadge>
                    <span className="text-xs font-medium text-ddhq-ink-muted">
                      {notice.pendingCount} pending / {notice.affectedCount} affected
                    </span>
                    <span className="text-xs text-ddhq-ink-soft">
                      Detected {formatDateTime(notice.detectedAt)}
                    </span>
                  </div>
                  <div className="mt-1 truncate text-sm font-semibold">{notice.noticeTitle}</div>
                  <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-ddhq-ink-muted">
                    {notice.sourceName}: {notice.noticeSummary}
                  </p>
                </div>
              </div>

              <div className="flex min-w-0 flex-wrap gap-1.5 xl:shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-expanded={isExpanded}
                  className="border-ddhq-review/30 bg-card/90"
                  onClick={() => setIsExpanded((current) => !current)}
                >
                  {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                  {isExpanded ? "Collapse" : "Review here"}
                </Button>
                <Link
                  to="/notices/$noticeId"
                  params={{ noticeId: notice.id }}
                  className="inline-flex h-7 items-center justify-center gap-1 rounded-md bg-card/55 px-2.5 text-xs font-medium text-ddhq-ink-muted hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <ExternalLink className="size-3.5" />
                  Detail
                </Link>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Dismiss notice banner"
                  className="bg-card/55 text-ddhq-ink-muted hover:bg-card hover:text-foreground"
                  onClick={() => {
                    setIsExpanded(false);
                    setDismissedNoticeId(notice.id);
                  }}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>

      <Sheet open={isExpanded} onOpenChange={setIsExpanded}>
        <SheetContent
          side="right"
          className="!w-[min(100vw,720px)] !max-w-[720px] overflow-hidden p-0 sm:!w-[min(42vw,720px)] sm:!max-w-[720px]"
        >
          <SheetTitle className="sr-only">Review official notice proposals</SheetTitle>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
            <div className="border-b border-border bg-card px-4 py-4 pr-12">
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={notice.confidenceLabel === "high" ? "verified" : "review"}>
                      {notice.confidenceLabel === "high" ? "High confidence" : "Medium confidence"}
                    </StatusBadge>
                    <StatusBadge status="source_changed">{notice.jurisdiction}</StatusBadge>
                    <span className="text-xs font-medium text-muted-foreground">
                      {notice.pendingCount} pending / {notice.affectedCount} affected
                    </span>
                  </div>
                  <div className="mt-2 break-words text-base font-semibold leading-snug">{notice.noticeTitle}</div>
                  <p className="mt-1 break-words text-sm leading-5 text-muted-foreground">{notice.noticeSummary}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setIsExpanded(false)}
                >
                  <ChevronUp className="size-3.5" />
                  Collapse
                </Button>
              </div>
            </div>

            <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-3">
              {proposalLoadFailed ? (
                <NoticeProposalErrorState
                  isRetrying={proposals.isFetching}
                  message={proposalLoadMessage}
                  onRetry={() => void proposals.refetch()}
                />
              ) : proposals.isPending ? (
                <NoticeProposalLoadingState />
              ) : (
                <NoticeReviewPanel
                  compact
                  notice={notice}
                  proposals={proposals.data?.proposals ?? []}
                />
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function NoticeProposalLoadingState() {
  return (
    <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
      <div className="font-semibold text-foreground">Loading proposal diffs</div>
      <p className="mt-1 text-xs leading-5">
        Checking pending official-notice changes before showing approval actions.
      </p>
    </div>
  );
}

function NoticeProposalErrorState({
  isRetrying,
  message,
  onRetry,
}: {
  isRetrying: boolean;
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-lg border border-ddhq-risk/30 bg-ddhq-risk-soft p-4 text-sm text-ddhq-risk">
      <div className="font-semibold">Notice proposal diffs could not be loaded.</div>
      <p className="mt-1 text-xs leading-5">
        The notice header is still available. Proposal review changes could not load, and the
        coverage matrix behind this drawer is unaffected.
      </p>
      <p className="mt-2 break-words font-mono text-[11px]">{message}</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isRetrying}
        className="mt-3 border-ddhq-risk/30 bg-card text-ddhq-risk hover:bg-card/80"
        onClick={onRetry}
      >
        {isRetrying ? "Retrying proposals" : "Retry proposals"}
      </Button>
    </div>
  );
}
