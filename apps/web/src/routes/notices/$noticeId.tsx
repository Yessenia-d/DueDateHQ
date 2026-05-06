import { Button } from "@due-date-hq/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { NoticeReviewPanel } from "@/components/notices/notice-review-panel";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/notices/$noticeId")({
  component: NoticeDetailRoute,
});

function NoticeDetailRoute() {
  const { noticeId } = Route.useParams();
  const notice = useQuery(trpc.notices.get.queryOptions({ noticeId }));
  const proposals = useQuery(trpc.noticeProposals.listForNotice.queryOptions({ noticeId }));

  return (
    <main className="min-h-full bg-background text-foreground">
      <div className="mx-auto grid max-w-[1240px] gap-4 px-5 py-5">
        <section className="flex flex-col gap-3 border-b border-border pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-semibold text-muted-foreground">Official notice</div>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal">Notice detail</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" render={<Link to="/" />}>
              <ArrowLeft className="size-3.5" />
              Dashboard
            </Button>
            <Button type="button" variant="ghost" size="sm" render={<Link to="/notices" />}>
              All notices
            </Button>
          </div>
        </section>

        {notice.isPending || proposals.isPending ? (
          <div className="h-[520px] animate-pulse rounded-xl border border-border bg-card" />
        ) : notice.isError || proposals.isError ? (
          <div className="rounded-xl border border-ddhq-risk/30 bg-ddhq-risk-soft p-4 text-sm text-ddhq-risk">
            Notice detail could not be loaded.
          </div>
        ) : (
          <NoticeReviewPanel
            notice={notice.data}
            proposals={proposals.data.proposals}
          />
        )}
      </div>
    </main>
  );
}
