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

const statusClasses = {
  done: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  in_progress: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  blocked: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  not_started: "border-border bg-muted text-muted-foreground",
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
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
          <div className="h-24 animate-pulse border bg-muted/30" />
          <div className="h-96 animate-pulse border bg-muted/30" />
        </div>
      </main>
    );
  }

  if (progress.isError) {
    return (
      <main className="min-h-0 overflow-auto">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            Progress data could not be loaded.
          </div>
        </div>
      </main>
    );
  }

  const { data } = progress;

  return (
    <main className="min-h-0 overflow-auto">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
        <section className="grid gap-4 border-b pb-5 md:grid-cols-[1fr_auto] md:items-end">
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

        <section className="grid gap-2 border-y py-3 sm:grid-cols-2 lg:grid-cols-4">
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
            <div key={group.category} className="border-b pb-5 last:border-b-0">
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

              <div className="overflow-x-auto border">
                <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                  <thead className="bg-muted/40 text-xs text-muted-foreground">
                    <tr>
                      <th className="w-28 px-3 py-2 font-medium">Priority</th>
                      <th className="px-3 py-2 font-medium">Feature</th>
                      <th className="w-40 px-3 py-2 font-medium">Status</th>
                      <th className="w-64 px-3 py-2 font-medium">Spec</th>
                      <th className="w-28 px-3 py-2 font-medium">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((item) => (
                      <tr key={item.id} className="border-t align-top">
                        <td className="px-3 py-3">
                          <PriorityBadge priority={item.priority} />
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-medium">{item.name}</div>
                          <div className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
                            {item.description}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge status={item.status} />
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <FileText className="size-3.5 shrink-0" />
                            <code className="break-all rounded-none bg-muted px-1.5 py-1 font-mono text-[11px] text-foreground">
                              {item.specPath}
                            </code>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-xs text-muted-foreground">
                          {formatDate(item.updatedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
    <div className="border p-4">
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{detail}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden bg-muted">
        <div className="h-full bg-primary" style={{ width: `${value}%` }} />
      </div>
      <div className="mt-2 text-xs text-muted-foreground">{value}% complete</div>
    </div>
  );
}

function StatusCount({ status, count }: { status: ProgressStatus; count: number }) {
  return (
    <div className="flex items-center justify-between gap-3 px-2 py-1.5">
      <StatusBadge status={status} />
      <span className="text-sm font-medium">{count}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: ProgressStatus }) {
  const Icon = statusIcons[status];

  return (
    <span
      className={`inline-flex h-7 items-center gap-1.5 whitespace-nowrap border px-2 text-xs font-medium ${statusClasses[status]}`}
    >
      <Icon className="size-3.5" />
      {statusLabels[status]}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: FeaturePriority }) {
  return (
    <span className="inline-flex h-6 items-center border bg-background px-2 text-xs font-medium text-muted-foreground">
      <Clock3 className="mr-1 size-3" />
      {priorityLabels[priority]}
    </span>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
