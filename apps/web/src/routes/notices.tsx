import { Button, buttonVariants } from "@due-date-hq/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@due-date-hq/ui/components/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@due-date-hq/ui/components/table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, Play, Power, PowerOff } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { NoticeReviewPanel } from "@/components/notices/notice-review-panel";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTime } from "@/utils/date-format";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/notices")({
  component: NoticesRoute,
});

function NoticesRoute() {
  const queryClient = useQueryClient();
  const [selectedNoticeId, setSelectedNoticeId] = React.useState<string | null>(null);
  const notices = useQuery(trpc.notices.list.queryOptions({ limit: 10 }));
  const selectedNotice =
    notices.data?.notices.find((notice) => notice.id === selectedNoticeId) ?? null;
  const selectedNoticeProposals = useQuery({
    ...trpc.noticeProposals.listForNotice.queryOptions({
      noticeId: selectedNoticeId ?? "__none__",
    }),
    enabled: Boolean(selectedNoticeId),
    retry: 1,
  });
  const selectedNoticeProposalLoadFailed =
    selectedNoticeProposals.isError || selectedNoticeProposals.failureCount > 0;
  const selectedNoticeProposalLoadMessage =
    selectedNoticeProposals.error?.message ??
    selectedNoticeProposals.failureReason?.message ??
    "The proposals request failed.";
  const officialSources = useQuery(trpc.officialSources.list.queryOptions());
  const invalidateSources = async () => {
    await queryClient.invalidateQueries({
      queryKey: trpc.officialSources.list.queryKey(),
    });
  };
  const setSourceActive = useMutation(
    trpc.officialSources.setActive.mutationOptions({
      onSuccess: async (result) => {
        toast.success(result.message);
        await invalidateSources();
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const enqueueCheck = useMutation(
    trpc.officialSources.enqueueCheck.mutationOptions({
      onSuccess: (result) => toast.success(result.message),
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <main className="min-h-0 overflow-auto bg-background text-foreground">
      <div className="mx-auto grid max-w-7xl gap-5 px-5 py-5">
        <section className="flex flex-col gap-3 border-b border-border pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-semibold text-muted-foreground">Official notices</div>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal">Notice review</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Return to pending and deferred notice proposals, then check which supported official
              sources are actively monitored.
            </p>
          </div>
          <Link to="/" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <ArrowLeft className="size-3.5" />
            Dashboard
          </Link>
        </section>

        <section className="grid gap-2">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-base font-semibold">Pending and deferred review</h2>
              <p className="text-xs text-muted-foreground">
                Notice impacts remain read-only until a CPA approves a proposed change.
              </p>
            </div>
          </div>

          {notices.isPending ? (
            <div className="h-32 animate-pulse rounded-lg border border-border bg-card" />
          ) : notices.isError ? (
            <div className="rounded-lg border border-ddhq-risk/30 bg-ddhq-risk-soft p-4 text-sm text-ddhq-risk">
              Notices could not be loaded.
            </div>
          ) : notices.data.notices.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
              No pending or deferred notice proposals.
            </div>
          ) : (
            <div className="grid gap-2">
              {notices.data.notices.map((notice) => (
                <button
                  key={notice.id}
                  type="button"
                  className="grid gap-2 rounded-lg border border-border bg-card p-3 text-left text-sm transition-colors hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setSelectedNoticeId(notice.id)}
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge
                          status={notice.confidenceLabel === "high" ? "verified" : "review"}
                        >
                          {notice.confidenceLabel === "high" ? "High confidence" : "Medium confidence"}
                        </StatusBadge>
                        <StatusBadge status="source_changed">{notice.jurisdiction}</StatusBadge>
                        <span className="text-xs text-muted-foreground">
                          {notice.pendingCount} pending / {notice.decideLaterCount} deferred /{" "}
                          {notice.affectedCount} affected
                        </span>
                      </div>
                      <div className="mt-2 font-semibold">{notice.noticeTitle}</div>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                        {notice.noticeSummary}
                      </p>
                      <div className="mt-2 truncate font-mono text-[11px] text-primary">
                        Official link: {notice.noticeUrl}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                      <ExternalLink className="size-3.5" />
                      Review details
                      <span aria-hidden="true">/</span>
                      {formatDateTime(notice.detectedAt)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-2">
          <div>
            <h2 className="text-base font-semibold">Official source monitors</h2>
            <p className="text-xs text-muted-foreground">
              Supported P0 sources can be disabled without deleting check history.
            </p>
          </div>

          {officialSources.isPending ? (
            <div className="h-56 animate-pulse rounded-lg border border-border bg-card" />
          ) : officialSources.isError ? (
            <div className="rounded-lg border border-ddhq-risk/30 bg-ddhq-risk-soft p-4 text-sm text-ddhq-risk">
              Official source monitors could not be loaded.
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/35 hover:bg-muted/35">
                    <TableHead className="w-[26%]">Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last checked</TableHead>
                    <TableHead>Last changed</TableHead>
                    <TableHead>Last error</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {officialSources.data.sources.map((source) => {
                    const isToggling =
                      setSourceActive.isPending &&
                      setSourceActive.variables?.sourceId === source.id;
                    const isChecking =
                      enqueueCheck.isPending && enqueueCheck.variables?.sourceId === source.id;

                    return (
                      <TableRow key={source.id}>
                        <TableCell>
                          <div className="grid gap-1">
                            <div className="font-medium">{source.agencyName}</div>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                              <span>{source.jurisdiction}</span>
                              <span>{source.sourceType.toUpperCase()}</span>
                              <a
                                href={source.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-primary hover:underline"
                              >
                                Source <ExternalLink className="size-3" />
                              </a>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <StatusBadge status={source.active ? "verified" : "neutral"}>
                              {source.active ? "Active" : "Inactive"}
                            </StatusBadge>
                            <StatusBadge status={statusTone(source.monitorStatus)}>
                              {statusLabel(source.monitorStatus)}
                            </StatusBadge>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-[12px]">
                          {formatNullableDateTime(source.lastCheckedAt)}
                        </TableCell>
                        <TableCell className="font-mono text-[12px]">
                          {formatNullableDateTime(source.lastChangedAt)}
                        </TableCell>
                        <TableCell className="max-w-[220px] truncate text-muted-foreground">
                          {source.lastErrorMessage ?? "None"}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1.5">
                            <Button
                              type="button"
                              variant={source.active ? "outline" : "default"}
                              size="sm"
                              disabled={isToggling}
                              onClick={() =>
                                setSourceActive.mutate({
                                  sourceId: source.id,
                                  active: !source.active,
                                })
                              }
                            >
                              {source.active ? (
                                <PowerOff className="size-3.5" />
                              ) : (
                                <Power className="size-3.5" />
                              )}
                              {source.active ? "Disable" : "Enable"}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={!source.active || isChecking}
                              onClick={() => enqueueCheck.mutate({ sourceId: source.id })}
                            >
                              <Play className="size-3.5" />
                              Check
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
        </section>
      </div>

      <Sheet
        open={Boolean(selectedNotice)}
        onOpenChange={(open) => {
          if (!open) setSelectedNoticeId(null);
        }}
      >
        <SheetContent
          side="right"
          className="!w-[min(100vw,720px)] !max-w-[720px] overflow-hidden p-0 sm:!w-[min(42vw,720px)] sm:!max-w-[720px]"
        >
          <SheetTitle className="sr-only">Review official notice proposals</SheetTitle>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
            <div className="border-b border-border bg-card px-4 py-4 pr-12">
              <div className="text-xs font-semibold text-muted-foreground">Notice detail</div>
              <div className="mt-1 text-base font-semibold leading-snug">
                {selectedNotice?.noticeTitle ?? "Official notice"}
              </div>
            </div>
            <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-3">
              {!selectedNotice ? null : selectedNoticeProposalLoadFailed ? (
                <div className="rounded-lg border border-ddhq-risk/30 bg-ddhq-risk-soft p-3 text-sm text-ddhq-risk">
                  <div className="font-semibold">Notice proposal diffs could not be loaded.</div>
                  <p className="mt-1 text-xs leading-5">
                    The notice detail remains available. Proposal review changes could not load.
                  </p>
                  <p className="mt-2 break-words font-mono text-[11px]">
                    {selectedNoticeProposalLoadMessage}
                  </p>
                </div>
              ) : selectedNoticeProposals.isPending ? (
                <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
                  <div className="font-semibold text-foreground">Loading proposal diffs</div>
                  <p className="mt-1 text-xs leading-5">
                    Checking pending official-notice changes before showing approval actions.
                  </p>
                </div>
              ) : (
                <NoticeReviewPanel
                  compact
                  notice={selectedNotice}
                  proposals={selectedNoticeProposals.data?.proposals ?? []}
                />
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </main>
  );
}

function formatNullableDateTime(value: string | null): string {
  return value ? formatDateTime(value) : "Not checked";
}

function statusLabel(status: "success" | "failed" | "skipped" | "not_checked"): string {
  switch (status) {
    case "success":
      return "Last check passed";
    case "failed":
      return "Last check failed";
    case "skipped":
      return "Last check skipped";
    case "not_checked":
      return "Not checked";
  }
}

function statusTone(
  status: "success" | "failed" | "skipped" | "not_checked",
): Parameters<typeof StatusBadge>[0]["status"] {
  switch (status) {
    case "success":
      return "verified";
    case "failed":
      return "risk";
    case "skipped":
      return "review";
    case "not_checked":
      return "neutral";
  }
}
