import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@due-date-hq/ui/components/table";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  CheckCircle2,
  CircleAlert,
  CircleDashed,
  Clock3,
  FileText,
  ShieldCheck,
} from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/progress")({
  component: ProgressComponent,
});

const statusLabels = {
  done: "Done",
  in_progress: "In progress",
  blocked: "Blocked",
  not_started: "Not started",
} as const;

const statusToBadge = {
  done: "done",
  in_progress: "in_progress",
  blocked: "blocked",
  not_started: "not_started",
} as const;

const statusIcons = {
  done: CheckCircle2,
  in_progress: Activity,
  blocked: CircleAlert,
  not_started: CircleDashed,
} as const;

const priorityLabels = {
  p0: "P0",
  p1: "P1",
  p2: "P2",
} as const;

type ProgressStatus = keyof typeof statusLabels;
type FeaturePriority = keyof typeof priorityLabels;

function ProgressComponent() {
  const progress = useQuery(trpc.progress.list.queryOptions());

  if (progress.isPending) {
    return (
      <main className="min-h-0 overflow-auto">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-6">
          <div className="h-24 animate-pulse rounded-xl border border-border bg-card" />
          <div className="h-96 animate-pulse rounded-xl border border-border bg-card" />
        </div>
      </main>
    );
  }

  if (progress.isError) {
    return (
      <main className="min-h-0 overflow-auto">
        <div className="mx-auto max-w-6xl px-5 py-6">
          <div className="rounded-xl border border-ddhq-risk/30 bg-ddhq-risk-soft p-4 text-sm text-ddhq-risk">
            Progress data could not be loaded.
          </div>
        </div>
      </main>
    );
  }

  const { data } = progress;

  return (
    <main className="min-h-0 overflow-auto">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-6">
        <section className="grid gap-4 border-b border-border pb-5 md:grid-cols-[1fr_auto] md:items-end">
          <div className="max-w-3xl">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
              <ShieldCheck className="size-3.5" />
              Beta review
            </div>
            <h1 className="text-2xl font-semibold tracking-normal">Feature Progress</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Internal capability status for DueDateHQ Beta, grouped by product area with each
              feature tied back to its SDD spec.
            </p>
          </div>
          <div className="grid min-w-60 gap-1 text-xs text-muted-foreground">
            <span>Updated {formatDate(data.generatedAt)}</span>
            <span>
              {data.overall.completedCount} of {data.overall.totalCount} feature items complete
            </span>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2">
          <ProgressMeter
            label="Overall progress"
            value={data.overall.percentComplete}
            detail={`${data.overall.completedCount}/${data.overall.totalCount} done`}
          />
          <ProgressMeter
            label="P0 readiness"
            value={data.p0Readiness.percentComplete}
            detail={`${data.p0Readiness.completedCount}/${data.p0Readiness.totalCount} done`}
          />
        </section>

        <section className="grid gap-2 border-y border-border py-3 sm:grid-cols-2 lg:grid-cols-4">
          {data.statuses.map((status) => (
            <StatusCount
              key={status}
              status={status}
              count={data.overall.statusCounts[status]}
            />
          ))}
        </section>

        <section className="flex flex-col gap-5">
          {data.groups.map((group) => (
            <div key={group.category} className="border-b border-border pb-5 last:border-b-0">
              <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-base font-medium">{group.category}</h2>
                  <p className="text-xs text-muted-foreground">
                    {group.completedCount}/{group.totalCount} done - {group.percentComplete}%
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.statuses.map((status) => (
                    <span key={status} className="text-xs text-muted-foreground">
                      {statusLabels[status]}: {group.statusCounts[status]}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border">
                <Table className="min-w-[760px]">
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="w-28 text-[11px] font-semibold uppercase text-muted-foreground">Priority</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground">Feature</TableHead>
                      <TableHead className="w-40 text-[11px] font-semibold uppercase text-muted-foreground">Status</TableHead>
                      <TableHead className="w-64 text-[11px] font-semibold uppercase text-muted-foreground">Spec</TableHead>
                      <TableHead className="w-28 text-[11px] font-semibold uppercase text-muted-foreground">Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.items.map((item) => (
                      <TableRow key={item.id} className="align-top">
                        <TableCell>
                          <PriorityBadge priority={item.priority} />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{item.name}</div>
                          <div className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
                            {item.description}
                          </div>
                        </TableCell>
                        <TableCell>
                          <ProgressStatusBadge status={item.status} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <FileText className="size-3.5 shrink-0" />
                            <code className="break-all bg-muted px-1.5 py-1 font-mono text-[11px] text-foreground">
                              {item.specPath}
                            </code>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(item.updatedAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}

function ProgressMeter({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{detail}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
      </div>
      <div className="mt-2 text-xs text-muted-foreground">{value}% complete</div>
    </div>
  );
}

function StatusCount({ status, count }: { status: ProgressStatus; count: number }) {
  return (
    <div className="flex items-center justify-between gap-3 px-2 py-1.5">
      <ProgressStatusBadge status={status} />
      <span className="text-sm font-medium">{count}</span>
    </div>
  );
}

function ProgressStatusBadge({ status }: { status: ProgressStatus }) {
  const Icon = statusIcons[status];
  const badgeStatus = statusToBadge[status] as Parameters<typeof StatusBadge>[0]["status"];

  return (
    <StatusBadge status={badgeStatus}>
      <Icon className="size-3.5" />
      {statusLabels[status]}
    </StatusBadge>
  );
}

function PriorityBadge({ priority }: { priority: FeaturePriority }) {
  return (
    <StatusBadge status="neutral">
      <Clock3 className="mr-0.5 size-3" />
      {priorityLabels[priority]}
    </StatusBadge>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
