import type { AccountAchievementsResponse } from "@due-date-hq/api/routers/account";
import { Badge } from "@due-date-hq/ui/components/badge";
import { Button } from "@due-date-hq/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ListChecks,
  Settings,
  UserCircle,
  Users,
} from "lucide-react";
import * as React from "react";

import { formatDate, formatDateTime } from "@/utils/date-format";
import { trpc } from "@/utils/trpc";

const compactNumberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

export function ProfilePage() {
  const session = useQuery(trpc.auth.session.queryOptions());

  if (session.isPending) {
    return <AccountPageSkeleton title="Profile" />;
  }

  if (session.isError || !session.data) {
    return <AccountPageError title="Profile unavailable" />;
  }

  return (
    <AccountPageChrome
      eyebrow="Account"
      icon={UserCircle}
      title="Profile"
      description="Current signed-in user and workspace identity."
    >
      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <SectionHeader
          icon={UserCircle}
          label="Signed-in user"
          meta={<Badge variant="outline">Current session</Badge>}
        />
        <FieldRows
          rows={[
            { label: "Name", value: session.data.user.name || "Name not set" },
            { label: "Email", value: session.data.user.email },
            { label: "User ID", value: session.data.user.id, mono: true },
            { label: "Account created", value: formatDate(session.data.user.createdAt) },
          ]}
        />
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <SectionHeader
          icon={BriefcaseBusiness}
          label="Workspace identity"
          meta={<Badge variant="outline">Firm-scoped</Badge>}
        />
        <FieldRows
          rows={[
            { label: "Workspace", value: session.data.firm.name },
            { label: "Workspace ID", value: session.data.firm.id, mono: true },
            {
              label: "Role",
              value: session.data.user.id === session.data.firm.ownerUserId ? "Owner" : "Member",
            },
            { label: "Workspace started", value: formatDate(session.data.firm.createdAt) },
          ]}
        />
      </section>
    </AccountPageChrome>
  );
}

export function SettingsPage() {
  const session = useQuery(trpc.auth.session.queryOptions());

  if (session.isPending) {
    return <AccountPageSkeleton title="Settings" />;
  }

  if (session.isError || !session.data) {
    return <AccountPageError title="Settings unavailable" />;
  }

  return (
    <AccountPageChrome
      eyebrow="Account"
      icon={Settings}
      title="Settings"
      description="Read-only account and workspace records for this Beta workspace."
    >
      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <SectionHeader
          icon={UserCircle}
          label="Account record"
          meta={<Badge variant="outline">Read-only</Badge>}
        />
        <FieldRows
          rows={[
            { label: "Email", value: session.data.user.email },
            { label: "User ID", value: session.data.user.id, mono: true },
            { label: "Session expires", value: formatDateTime(session.data.session.expiresAt) },
          ]}
        />
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <SectionHeader
          icon={BriefcaseBusiness}
          label="Workspace record"
          meta={<Badge variant="outline">Firm boundary</Badge>}
        />
        <FieldRows
          rows={[
            { label: "Workspace name", value: session.data.firm.name },
            { label: "Workspace ID", value: session.data.firm.id, mono: true },
            { label: "Owner user ID", value: session.data.firm.ownerUserId, mono: true },
            { label: "Workspace created", value: formatDate(session.data.firm.createdAt) },
          ]}
        />
      </section>
    </AccountPageChrome>
  );
}

export function AchievementsPage() {
  const achievements = useQuery(trpc.account.achievements.queryOptions());

  if (achievements.isPending) {
    return <AccountPageSkeleton title="Achievements" />;
  }

  if (achievements.isError) {
    return <AccountPageError title="Achievements unavailable" />;
  }

  return <AchievementsLedger data={achievements.data} />;
}

function AchievementsLedger({ data }: { data: AccountAchievementsResponse }) {
  const { metrics } = data;
  const completedShare = metrics.totalDeadlineTasks
    ? Math.round((metrics.completedDeadlineTasks / metrics.totalDeadlineTasks) * 100)
    : 0;
  const remainingShare = metrics.totalDeadlineTasks ? 100 - completedShare : 0;
  const averageLabel = `${metrics.averageCompletedTasksPerDay.toFixed(1)}/day`;
  const throughputNote =
    metrics.totalDeadlineTasks === 0
      ? "No Deadline Tasks have been entered in this workspace yet."
      : metrics.completedDeadlineTasks === 0
        ? "No completed Deadline Tasks yet. The daily average will move after tasks are marked Done."
        : `${metrics.completedDeadlineTasks} Deadline Tasks completed across ${metrics.totalUsageDays} inclusive workspace days.`;

  return (
    <AccountPageChrome
      eyebrow="Workspace ledger"
      icon={BarChart3}
      title="Achievements"
      description={`${data.workspace.name} started using DueDateHQ on ${data.workspace.usageStartDate}.`}
    >
      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs font-medium uppercase text-muted-foreground">
              Usage period
            </div>
            <h2 className="mt-1 text-base font-semibold">
              Day {metrics.currentUsageDay} of this DueDateHQ workspace
            </h2>
          </div>
          <Badge variant="outline">Started {data.workspace.usageStartDate}</Badge>
        </div>
      </section>

      <MetricStrip
        metrics={[
          {
            icon: CalendarDays,
            label: "Usage days",
            value: String(metrics.totalUsageDays),
            detail: "Inclusive total",
          },
          {
            icon: Clock3,
            label: "Current day",
            value: String(metrics.currentUsageDay),
            detail: "Today in period",
          },
          {
            icon: Users,
            label: "Client Relationships",
            value: compactNumberFormatter.format(metrics.totalClientRelationships),
            detail: "Firm-scoped",
          },
          {
            icon: ListChecks,
            label: "Deadline Tasks",
            value: compactNumberFormatter.format(metrics.totalDeadlineTasks),
            detail: "Entered work",
          },
          {
            icon: CheckCircle2,
            label: "Done",
            value: compactNumberFormatter.format(metrics.completedDeadlineTasks),
            detail: "Status is Done",
          },
          {
            icon: BarChart3,
            label: "Remaining",
            value: compactNumberFormatter.format(metrics.remainingDeadlineTasks),
            detail: "All non-Done statuses",
          },
          {
            icon: Clock3,
            label: "Daily average",
            value: averageLabel,
            detail: metrics.totalDeadlineTasks === 0 ? "No task average yet" : "Done per day",
          },
        ]}
      />

      <section className="grid gap-4 rounded-xl border border-border bg-card p-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-medium uppercase text-muted-foreground">
                Work balance
              </div>
              <h2 className="mt-1 text-base font-semibold">
                {metrics.completedDeadlineTasks} done, {metrics.remainingDeadlineTasks} remaining
              </h2>
            </div>
            <Badge variant="outline">{completedShare}% done</Badge>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-ddhq-verified"
              style={{ width: `${completedShare}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>{completedShare}% completed</span>
            <span>{remainingShare}% remaining</span>
          </div>
        </div>
        <div className="border-t border-border pt-4 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
          <div className="text-xs font-medium uppercase text-muted-foreground">
            Processing rate
          </div>
          <div className="mt-2 text-2xl font-semibold tabular-nums">{averageLabel}</div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{throughputNote}</p>
        </div>
      </section>
    </AccountPageChrome>
  );
}

function AccountPageChrome({
  children,
  description,
  eyebrow,
  icon: Icon,
  title,
}: {
  children: React.ReactNode;
  description: string;
  eyebrow: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <main className="min-h-0 overflow-auto">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6">
        <section className="grid gap-4 pb-4 md:grid-cols-[1fr_auto] md:items-end">
          <div className="max-w-3xl">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
              <Icon className="size-3.5" />
              {eyebrow}
            </div>
            <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
          </div>
        </section>
        {children}
      </div>
    </main>
  );
}

function AccountPageSkeleton({ title }: { title: string }) {
  return (
    <main className="min-h-0 overflow-auto">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6">
        <div>
          <div className="h-4 w-28 animate-pulse rounded bg-muted" />
          <div className="mt-3 h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="mt-3 h-4 w-full max-w-lg animate-pulse rounded bg-muted" />
        </div>
        <div className="h-44 animate-pulse rounded-xl border border-border bg-card" />
        <div className="h-44 animate-pulse rounded-xl border border-border bg-card" />
        <span className="sr-only">Loading {title}</span>
      </div>
    </main>
  );
}

function AccountPageError({ title }: { title: string }) {
  return (
    <main className="min-h-0 overflow-auto">
      <div className="mx-auto max-w-7xl px-5 py-6">
        <div className="rounded-xl border border-ddhq-risk/30 bg-ddhq-risk-soft p-4">
          <h1 className="text-base font-semibold text-ddhq-risk">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-ddhq-risk">
            Sign in again to load this account workspace.
          </p>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="mt-3"
            onClick={() => window.location.assign("/login")}
          >
            Go to login
          </Button>
        </div>
      </div>
    </main>
  );
}

function SectionHeader({
  icon: Icon,
  label,
  meta,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  meta?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/25 px-4 py-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="size-4 text-muted-foreground" />
        {label}
      </div>
      {meta}
    </div>
  );
}

function FieldRows({
  rows,
}: {
  rows: Array<{ label: string; mono?: boolean; value: string }>;
}) {
  return (
    <div className="divide-y divide-border">
      {rows.map((row) => (
        <div
          key={row.label}
          className="grid gap-1 px-4 py-3 text-sm md:grid-cols-[220px_minmax(0,1fr)]"
        >
          <div className="text-muted-foreground">{row.label}</div>
          <div
            className={
              row.mono
                ? "break-all font-mono text-xs font-medium text-foreground"
                : "break-words font-medium text-foreground"
            }
          >
            {row.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function MetricStrip({
  metrics,
}: {
  metrics: Array<{
    detail: string;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
  }>;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-border">
      <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {metrics.map((metric) => (
          <div key={metric.label} className="min-w-0 bg-card p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <metric.icon className="size-3.5 shrink-0" />
              <span className="truncate">{metric.label}</span>
            </div>
            <div className="mt-2 truncate text-2xl font-semibold tabular-nums">
              {metric.value}
            </div>
            <div className="mt-1 truncate text-xs text-muted-foreground">{metric.detail}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
