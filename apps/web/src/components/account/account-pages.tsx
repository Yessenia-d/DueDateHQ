import type { AccountAchievementsResponse } from "@due-date-hq/api/routers/account";
import { Badge } from "@due-date-hq/ui/components/badge";
import { Button } from "@due-date-hq/ui/components/button";
import { Input } from "@due-date-hq/ui/components/input";
import { Label } from "@due-date-hq/ui/components/label";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Building2,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ImageIcon,
  ListChecks,
  MapPinned,
  Save,
  Settings,
  Tags,
  Trash2,
  UserCircle,
  Users,
} from "lucide-react";
import * as React from "react";
import { Cell, Pie, PieChart, Tooltip, type TooltipContentProps } from "recharts";
import { toast } from "sonner";

import { formatDate, formatDateTime } from "@/utils/date-format";
import { trpc } from "@/utils/trpc";

const compactNumberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

export function ProfilePage() {
  const session = useQuery(trpc.auth.session.queryOptions());
  const queryClient = useQueryClient();
  const [avatarUrl, setAvatarUrl] = React.useState("");
  const [isAvatarEditing, setIsAvatarEditing] = React.useState(false);
  const updateAvatar = useMutation(
    trpc.account.updateAvatar.mutationOptions({
      onError: (error) => toast.error(error.message),
      onSuccess: (result) => {
        setAvatarUrl(result.image ?? "");
        setIsAvatarEditing(false);
        toast.success("Avatar updated.");
        void queryClient.invalidateQueries(trpc.auth.session.queryFilter());
      },
    }),
  );

  React.useEffect(() => {
    setAvatarUrl(session.data?.user.image ?? "");
  }, [session.data?.user.image]);

  if (session.isPending) {
    return <AccountPageSkeleton title="Profile" />;
  }

  if (session.isError || !session.data) {
    return <AccountPageError title="Profile unavailable" />;
  }

  const accountSession = session.data;

  return (
    <AccountPageChrome
      eyebrow="Account"
      icon={UserCircle}
      title="Profile"
      description="Current signed-in user and workspace identity."
    >
      <ProfileIdentitySection
        avatarUrl={avatarUrl}
        isEditing={isAvatarEditing}
        isSaving={updateAvatar.isPending}
        rows={[
          { label: "Name", value: accountSession.user.name || "Name not set" },
          { label: "Email", value: accountSession.user.email },
          { label: "User ID", value: accountSession.user.id, mono: true },
          { label: "Account created", value: formatDate(accountSession.user.createdAt) },
        ]}
        userEmail={accountSession.user.email}
        userName={accountSession.user.name}
        onAvatarUrlChange={setAvatarUrl}
        onCancelEdit={() => {
          setAvatarUrl(accountSession.user.image ?? "");
          setIsAvatarEditing(false);
        }}
        onClear={() => updateAvatar.mutate({ image: null })}
        onEdit={() => setIsAvatarEditing(true)}
        onSubmit={() => {
          const image = avatarUrl.trim();
          updateAvatar.mutate({ image: image || null });
        }}
      />
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
      description="Workspace configuration and active access records."
    >
      <section className="overflow-hidden rounded-lg border border-border bg-card">
        <SectionHeader
          icon={BriefcaseBusiness}
          label="Workspace settings"
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

      <section className="overflow-hidden rounded-lg border border-border bg-card">
        <SectionHeader
          icon={Clock3}
          label="Access session"
          meta={<Badge variant="outline">Current browser</Badge>}
        />
        <FieldRows
          rows={[
            {
              label: "Workspace role",
              value: session.data.user.id === session.data.firm.ownerUserId ? "Owner" : "Member",
            },
            { label: "Session expires", value: formatDateTime(session.data.session.expiresAt) },
          ]}
        />
      </section>
    </AccountPageChrome>
  );
}

function ProfileIdentitySection({
  avatarUrl,
  isEditing,
  isSaving,
  onAvatarUrlChange,
  onCancelEdit,
  onClear,
  onEdit,
  onSubmit,
  rows,
  userEmail,
  userName,
}: {
  avatarUrl: string;
  isEditing: boolean;
  isSaving: boolean;
  onAvatarUrlChange: (value: string) => void;
  onCancelEdit: () => void;
  onClear: () => void;
  onEdit: () => void;
  onSubmit: () => void;
  rows: Array<{ label: string; mono?: boolean; value: string }>;
  userEmail: string;
  userName: string | null;
}) {
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <SectionHeader
        icon={UserCircle}
        label="Signed-in user"
        meta={<Badge variant="outline">Current session</Badge>}
      />
      <div className="grid gap-4 p-4 md:grid-cols-[88px_minmax(0,1fr)]">
        <div className="grid content-start justify-items-center gap-2">
          <button
            type="button"
            className="rounded-full outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring/50"
            aria-label="Change user avatar"
            onClick={onEdit}
          >
            <AccountAvatarPreview image={avatarUrl} userEmail={userEmail} userName={userName} />
          </button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-md"
            disabled={isSaving}
            onClick={onEdit}
          >
            <ImageIcon className="size-3.5" />
            Change
          </Button>
        </div>
        <div className="min-w-0">
          <FieldRows rows={rows} />

          {isEditing ? (
            <form
              className="mt-4 grid gap-3 rounded-lg border border-border bg-muted/25 p-3"
              onSubmit={handleSubmit}
            >
              <div className="grid gap-1.5">
                <Label htmlFor="avatar-url">Avatar image URL</Label>
                <Input
                  id="avatar-url"
                  type="url"
                  inputMode="url"
                  autoComplete="photo"
                  placeholder="https://example.com/avatar.jpg"
                  value={avatarUrl}
                  onChange={(event) => onAvatarUrlChange(event.target.value)}
                  disabled={isSaving}
                  className="rounded-md"
                />
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-md"
                  disabled={isSaving}
                  onClick={onCancelEdit}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-md"
                  disabled={isSaving || !avatarUrl.trim()}
                  onClick={onClear}
                >
                  <Trash2 className="size-3.5" />
                  Remove
                </Button>
                <Button type="submit" className="rounded-md" disabled={isSaving}>
                  <Save className="size-3.5" />
                  {isSaving ? "Saving" : "Save avatar"}
                </Button>
              </div>
            </form>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function AccountAvatarPreview({
  image,
  userEmail,
  userName,
}: {
  image: string;
  userEmail: string;
  userName: string | null;
}) {
  const [hasImageError, setHasImageError] = React.useState(false);
  const fallback = (userName || userEmail || "Account").slice(0, 1).toUpperCase();

  React.useEffect(() => {
    setHasImageError(false);
  }, [image]);

  if (image.trim() && !hasImageError) {
    return (
      <img
        alt=""
        className="size-[72px] rounded-full border border-border bg-background object-cover"
        src={image.trim()}
        onError={() => setHasImageError(true)}
      />
    );
  }

  return (
    <div className="grid size-[72px] place-items-center rounded-full border border-border bg-background text-xl font-semibold text-primary">
      {fallback}
    </div>
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
  const averageLabel =
    metrics.totalDeadlineTasks === 0
      ? "No average"
      : `${metrics.averageCompletedTasksPerDay.toFixed(1)}/day`;
  const hasCompletedWork = metrics.completedDeadlineTasks > 0;
  const capabilityLine = hasCompletedWork
    ? `Completed work spans ${metrics.handledStateCount} jurisdiction buckets, ${metrics.handledTaxCategoryCount} tax categories, and ${metrics.handledEntityTypeCount} entity types.`
    : "Completed work breakdowns will appear after Deadline Tasks are marked Done.";
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
      description={`${data.workspace.name} workspace record.`}
    >
      <section className="grid gap-4" aria-labelledby="daily-usage-heading">
        <SectionTitleRow
          eyebrow="Daily workspace usage"
          title="Routine workspace activity"
          titleId="daily-usage-heading"
        />

        <section className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              Usage period
            </span>
            <span className="size-1 rounded-full bg-muted-foreground/70" aria-hidden="true" />
            <span className="text-sm font-medium text-foreground">
              Day {metrics.currentUsageDay} of this DueDateHQ workspace
            </span>
            <span className="size-1 rounded-full bg-muted-foreground/70" aria-hidden="true" />
            <span className="text-xs font-medium text-muted-foreground">
              Started {data.workspace.usageStartDate}
            </span>
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
          ]}
        />

        <section className="grid gap-4 rounded-lg border border-border bg-card p-4 lg:grid-cols-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-medium uppercase text-muted-foreground">
                  Work balance
                </div>
                <h3 className="mt-1 text-base font-semibold">
                  {metrics.completedDeadlineTasks} done, {metrics.remainingDeadlineTasks} remaining
                </h3>
              </div>
              <Badge variant="outline">
                {metrics.totalDeadlineTasks === 0 ? "No tasks" : `${completedShare}% done`}
              </Badge>
            </div>
            <WorkBalanceRing
              completedCount={metrics.completedDeadlineTasks}
              completedShare={completedShare}
              remainingCount={metrics.remainingDeadlineTasks}
              remainingShare={remainingShare}
              totalCount={metrics.totalDeadlineTasks}
            />
          </div>
          <div className="min-w-0 border-t border-border pt-4 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
            <div className="text-xs font-medium uppercase text-muted-foreground">
              Processing rate
            </div>
            <div className="mt-2 text-2xl font-semibold tabular-nums">{averageLabel}</div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{throughputNote}</p>
          </div>
        </section>
      </section>

      <section className="grid gap-4 py-1" aria-labelledby="work-achievements-heading">
        <div>
          <SectionTitleRow
            eyebrow="Work achievements"
            title="Completed-work capability"
            titleId="work-achievements-heading"
          />
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            {capabilityLine}
          </p>
        </div>

        <section className="grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-3">
          <CapabilityCount
            icon={MapPinned}
            label="Handled jurisdiction buckets"
            value={metrics.handledStateCount}
            detail="From completed work"
          />
          <CapabilityCount
            icon={Tags}
            label="Handled tax categories"
            value={metrics.handledTaxCategoryCount}
            detail="From completed work"
          />
          <CapabilityCount
            icon={Building2}
            label="Handled entity types"
            value={metrics.handledEntityTypeCount}
            detail="From completed work"
          />
        </section>

        <div className="grid gap-4 xl:grid-cols-3">
          <BreakdownPanel
            emptyLabel="No handled jurisdiction buckets yet."
            icon={MapPinned}
            items={data.completedWork.states}
            title="Jurisdiction buckets"
          />
          <BreakdownPanel
            emptyLabel="No handled tax categories yet."
            icon={Tags}
            items={data.completedWork.taxCategories}
            title="Tax categories"
          />
          <BreakdownPanel
            emptyLabel="No handled entity types yet."
            formatter={formatEntityType}
            icon={Building2}
            items={data.completedWork.entityTypes}
            title="Entity types"
          />
        </div>
      </section>
    </AccountPageChrome>
  );
}

function SectionTitleRow({
  eyebrow,
  meta,
  title,
  titleId,
}: {
  eyebrow: string;
  meta?: string;
  title: string;
  titleId: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 py-1">
      <span className="text-xs font-semibold uppercase text-ddhq-ink-soft">
        {eyebrow}
      </span>
      <span className="size-1 rounded-full bg-ddhq-ink-soft/70" aria-hidden="true" />
      <h2 id={titleId} className="text-base font-semibold text-ddhq-ink">
        {title}
      </h2>
      {meta ? (
        <>
          <span className="size-1 rounded-full bg-ddhq-ink-soft/70" aria-hidden="true" />
          <span className="text-xs font-medium text-ddhq-ink-soft">{meta}</span>
        </>
      ) : null}
    </div>
  );
}

type BreakdownItem = AccountAchievementsResponse["completedWork"]["states"][number];
type RingChartItem = BreakdownItem & { chartColor: string };

const breakdownPalette = [
  { chartColor: "var(--ddhq-verified)", swatchClass: "bg-ddhq-verified" },
  { chartColor: "var(--primary)", swatchClass: "bg-primary" },
  { chartColor: "var(--ddhq-review)", swatchClass: "bg-ddhq-review" },
  { chartColor: "var(--ddhq-gap)", swatchClass: "bg-ddhq-gap" },
  { chartColor: "var(--ddhq-risk)", swatchClass: "bg-ddhq-risk" },
] as const;

function CapabilityCount({
  detail,
  icon: Icon,
  label,
  value,
}: {
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="min-w-0 bg-card p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5 shrink-0" />
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-2 font-mono text-2xl font-semibold tabular-nums">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
    </div>
  );
}

function WorkBalanceRing({
  completedCount,
  completedShare,
  remainingCount,
  remainingShare,
  totalCount,
}: {
  completedCount: number;
  completedShare: number;
  remainingCount: number;
  remainingShare: number;
  totalCount: number;
}) {
  const items = [
    {
      chartColor: "var(--ddhq-verified)",
      count: completedCount,
      label: "Done",
      percent: completedShare,
      swatchClass: "bg-ddhq-verified",
    },
    {
      chartColor: "var(--ddhq-gap)",
      count: remainingCount,
      label: "Remaining",
      percent: remainingShare,
      swatchClass: "bg-ddhq-gap",
    },
  ].filter((item) => item.count > 0);

  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-[132px_minmax(0,1fr)] sm:items-center">
      <RingChart
        ariaLabel={`Work balance: ${completedCount} done, ${remainingCount} remaining`}
        centerLabel="tasks"
        centerValue={totalCount}
        items={items}
      />
      <BreakdownList items={items} />
    </div>
  );
}

function BreakdownPanel({
  emptyLabel,
  formatter = (label) => label,
  icon: Icon,
  items,
  title,
}: {
  emptyLabel: string;
  formatter?: (label: string) => string;
  icon: React.ComponentType<{ className?: string }>;
  items: BreakdownItem[];
  title: string;
}) {
  const visualItems = toVisualBreakdownItems(items, formatter);
  const total = items.reduce((sum, item) => sum + item.count, 0);
  const ariaLabel =
    visualItems.length > 0
      ? `${title}: ${visualItems.map((item) => `${item.label} ${item.count}`).join(", ")}`
      : `${title}: ${emptyLabel}`;

  return (
    <section className="rounded-lg border border-border bg-background p-4" aria-label={title}>
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {visualItems.length > 0 ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-[120px_minmax(0,1fr)] xl:grid-cols-1 2xl:grid-cols-[120px_minmax(0,1fr)]">
          <RingChart
            ariaLabel={ariaLabel}
            centerLabel="handled"
            centerValue={total}
            items={visualItems}
          />
          <BreakdownList items={visualItems} />
        </div>
      ) : (
        <div className="mt-4 rounded-md border border-dashed border-border bg-muted/30 p-3 text-sm text-muted-foreground">
          {emptyLabel}
        </div>
      )}
    </section>
  );
}

function RingChart({
  ariaLabel,
  centerLabel,
  centerValue,
  items,
}: {
  ariaLabel: string;
  centerLabel: string;
  centerValue: number;
  items: RingChartItem[];
}) {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className="relative size-[120px] overflow-visible"
      onMouseLeave={() => setActiveIndex(null)}
    >
      <PieChart width={120} height={120}>
        <Tooltip
          allowEscapeViewBox={{ x: true, y: true }}
          content={RingTooltip}
          cursor={false}
          isAnimationActive={false}
          wrapperStyle={{ outline: "none", zIndex: 20 }}
        />
        <Pie
          data={items}
          dataKey="count"
          nameKey="label"
          cx={60}
          cy={60}
          innerRadius={38}
          outerRadius={54}
          startAngle={90}
          endAngle={-270}
          isAnimationActive={false}
          onMouseEnter={(_data, index) => setActiveIndex(index)}
          onMouseLeave={() => setActiveIndex(null)}
          stroke="var(--ddhq-surface)"
          strokeWidth={2}
        >
          {items.map((item, index) => {
            const isActive = activeIndex === index;

            return (
              <Cell
                key={item.label}
                fill={item.chartColor}
                opacity={activeIndex === null || isActive ? 1 : 0.48}
                stroke={isActive ? "var(--ddhq-ink)" : "var(--ddhq-surface)"}
                strokeWidth={isActive ? 3 : 2}
              />
            );
          })}
        </Pie>
      </PieChart>
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="font-mono text-xl font-semibold tabular-nums">{centerValue}</div>
          <div className="text-xs text-muted-foreground">{centerLabel}</div>
        </div>
      </div>
    </div>
  );
}

function RingTooltip({
  active,
  payload,
}: TooltipContentProps) {
  const item = payload[0]?.payload as RingChartItem | undefined;

  if (!active || !item) {
    return null;
  }

  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 text-xs shadow-sm">
      <div className="font-medium text-foreground">{item.label}</div>
      <div className="mt-1 font-mono text-muted-foreground tabular-nums">
        {item.count} ({item.percent}%)
      </div>
    </div>
  );
}

function BreakdownList({
  items,
}: {
  items: Array<BreakdownItem & { swatchClass: string }>;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/30 p-3 text-sm text-muted-foreground">
        No task counts yet.
      </div>
    );
  }

  return (
    <ul className="grid content-center gap-2.5">
      {items.map((item) => (
        <li key={item.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className={`size-2.5 shrink-0 rounded-full ${item.swatchClass}`} />
            <span className="truncate text-sm font-medium">{item.label}</span>
          </div>
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {item.count} ({item.percent}%)
          </span>
        </li>
      ))}
    </ul>
  );
}

function toVisualBreakdownItems(
  items: BreakdownItem[],
  formatter: (label: string) => string,
) {
  return items.map((item, index) => ({
    ...item,
    ...breakdownPalette[index % breakdownPalette.length],
    label: formatter(item.label),
  }));
}

function formatEntityType(entityType: string) {
  return entityType
    .split("_")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function AccountPageChrome({
  children,
  description,
  eyebrow,
  headingLayout = "compact",
  icon: Icon,
  title,
}: {
  children: React.ReactNode;
  description: string;
  eyebrow: string;
  headingLayout?: "compact" | "inline" | "stacked";
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <main className="min-h-0 overflow-auto">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6">
        <section className="grid gap-4 pb-4 md:grid-cols-[1fr_auto] md:items-end">
          <div className="max-w-3xl">
            {headingLayout === "compact" ? (
              <>
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <Icon className="size-5 text-muted-foreground" />
                  <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
              </>
            ) : headingLayout === "inline" ? (
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
                <span className="size-1 rounded-full bg-muted-foreground/70" aria-hidden="true" />
                <p className="text-sm leading-6 text-muted-foreground">{description}</p>
              </div>
            ) : (
              <>
                <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
                  <Icon className="size-3.5" />
                  {eyebrow}
                </div>
                <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
              </>
            )}
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
        <div className="h-44 animate-pulse rounded-lg border border-border bg-card" />
        <div className="h-44 animate-pulse rounded-lg border border-border bg-card" />
        <span className="sr-only">Loading {title}</span>
      </div>
    </main>
  );
}

function AccountPageError({ title }: { title: string }) {
  return (
    <main className="min-h-0 overflow-auto">
      <div className="mx-auto max-w-7xl px-5 py-6">
        <div className="rounded-lg border border-ddhq-risk/30 bg-ddhq-risk-soft p-4">
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
    <section className="overflow-hidden rounded-lg border border-border bg-border">
      <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
