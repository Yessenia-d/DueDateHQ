import { Button } from "@due-date-hq/ui/components/button";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle2,
  CircleDashed,
  ExternalLink,
  Eye,
  Globe,
  HelpCircle,
  Shield,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/coverage")({
  component: CoverageComponent,
});

// ── Status display config ──

type VerificationStatusKey =
  | "verified"
  | "needs_review"
  | "source_changed"
  | "unsupported"
  | "no_rule";

const statusConfig: Record<
  VerificationStatusKey,
  { label: string; className: string }
> = {
  verified: {
    label: "Verified",
    className:
      "border-emerald-600/30 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/30 dark:text-emerald-300",
  },
  needs_review: {
    label: "Needs review",
    className:
      "border-amber-600/30 bg-amber-500/10 text-amber-700 dark:border-amber-400/30 dark:text-amber-300",
  },
  source_changed: {
    label: "Source changed",
    className:
      "border-amber-600/40 bg-amber-500/15 text-amber-800 dark:border-amber-400/40 dark:text-amber-200",
  },
  unsupported: {
    label: "Unsupported",
    className:
      "border-slate-500/30 bg-slate-400/10 text-slate-600 dark:border-slate-400/30 dark:text-slate-300",
  },
  no_rule: {
    label: "Coverage gap",
    className:
      "border-slate-500/30 bg-slate-400/10 text-slate-600 dark:border-slate-400/30 dark:text-slate-300",
  },
};

const statusIcons: Record<VerificationStatusKey, typeof CheckCircle2> = {
  verified: ShieldCheck,
  needs_review: Eye,
  source_changed: ShieldAlert,
  unsupported: HelpCircle,
  no_rule: CircleDashed,
};

function getStatusKey(status: string | null): VerificationStatusKey {
  if (status === "verified") return "verified";
  if (status === "needs_review") return "needs_review";
  if (status === "source_changed") return "source_changed";
  if (status === "unsupported") return "unsupported";
  return "no_rule";
}

// ── Filters ──

type JurisdictionFilter = "all" | string;
type StatusFilter = "all" | VerificationStatusKey;

function CoverageComponent() {
  const coverage = useQuery(trpc.coverage.matrix.queryOptions());
  const requestCoverage = useMutation(
    trpc.coverage.requestCoverage.mutationOptions({
      onSuccess: (result) => toast.success(result.message),
      onError: (error) => toast.error(error.message),
    }),
  );
  const addUserDeadline = useMutation(
    trpc.coverage.addUserProvidedDeadlineFromGap.mutationOptions({
      onSuccess: (result) => toast.success(result.message),
      onError: (error) => toast.error(error.message),
    }),
  );
  const dismissGap = useMutation(
    trpc.coverage.dismissGapForNow.mutationOptions({
      onSuccess: (result) => toast.success(result.message),
      onError: (error) => toast.error(error.message),
    }),
  );
  const [jurisdictionFilter, setJurisdictionFilter] = useState<JurisdictionFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);

  if (coverage.isPending) {
    return (
      <main className="min-h-0 overflow-auto">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6">
          <div className="h-24 animate-pulse border bg-muted/30" />
          <div className="h-96 animate-pulse border bg-muted/30" />
        </div>
      </main>
    );
  }

  if (coverage.isError) {
    return (
      <main className="min-h-0 overflow-auto">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            Coverage data could not be loaded.
          </div>
        </div>
      </main>
    );
  }

  const { data } = coverage;

  const jurisdictions = data.groups.map((g) => g.jurisdiction);

  const filteredGroups = data.groups
    .filter((g) => jurisdictionFilter === "all" || g.jurisdiction === jurisdictionFilter)
    .map((g) => {
      if (statusFilter === "all") return g;
      const filtered = g.obligations.filter(
        (o) => getStatusKey(o.verificationStatus) === statusFilter,
      );
      if (filtered.length === 0) return null;
      return { ...g, obligations: filtered };
    })
    .filter(Boolean) as typeof data.groups;

  return (
    <main className="min-h-0 overflow-auto">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6">
        {/* Header */}
        <section className="grid gap-4 border-b pb-5 md:grid-cols-[1fr_auto] md:items-end">
          <div className="max-w-3xl">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
              <Shield className="size-3.5" />
              Tax obligation library
            </div>
            <h1 className="text-2xl font-semibold tracking-normal">Coverage Matrix</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Tax obligations and verified scheduling rules across supported jurisdictions. Beta
              coverage is limited to P0 official sources. Coverage gaps are visible and do not imply
              verified deadline support.
            </p>
          </div>
          <div className="grid min-w-60 gap-1 text-xs text-muted-foreground">
            <span>Updated {formatDate(data.generatedAt)}</span>
            <span>
              {data.summary.totalObligations} obligations across {data.summary.jurisdictionCount}{" "}
              jurisdictions
            </span>
          </div>
        </section>

        {/* Summary counts */}
        <section className="grid gap-2 border-b pb-3 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryCount label="Verified" count={data.summary.totalVerified} statusKey="verified" />
          <SummaryCount
            label="Needs review"
            count={data.summary.totalNeedsReview}
            statusKey="needs_review"
          />
          <SummaryCount
            label="Source changed"
            count={data.summary.totalSourceChanged}
            statusKey="source_changed"
          />
          <SummaryCount
            label="Unsupported"
            count={data.summary.totalUnsupported}
            statusKey="unsupported"
          />
          <SummaryCount label="Coverage gap" count={data.summary.totalNoRule} statusKey="no_rule" />
        </section>

        {/* Supported sources */}
        <section className="border-b pb-3">
          <h2 className="mb-2 text-xs font-medium uppercase text-muted-foreground">
            P0 supported official sources
          </h2>
          <div className="flex flex-wrap gap-2">
            {data.supportedSources.map((source) => (
              <span
                key={source}
                className="inline-flex items-center gap-1.5 border bg-background px-2 py-1 text-xs text-muted-foreground"
              >
                <Globe className="size-3" />
                {source}
              </span>
            ))}
          </div>
        </section>

        {/* Filters */}
        <section className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-medium text-muted-foreground">
            Jurisdiction
            <select
              className="ml-2 border bg-background px-2 py-1.5 text-xs"
              value={jurisdictionFilter}
              onChange={(e) => setJurisdictionFilter(e.target.value)}
            >
              <option value="all">All jurisdictions</option>
              {jurisdictions.map((j) => (
                <option key={j} value={j}>
                  {j === "federal" ? "Federal" : j}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-medium text-muted-foreground">
            Status
            <select
              className="ml-2 border bg-background px-2 py-1.5 text-xs"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            >
              <option value="all">All statuses</option>
              <option value="verified">Verified</option>
              <option value="needs_review">Needs review</option>
              <option value="source_changed">Source changed</option>
              <option value="unsupported">Unsupported</option>
              <option value="no_rule">Coverage gap</option>
            </select>
          </label>
        </section>

        {/* Coverage table by jurisdiction group */}
        <section className="flex flex-col gap-5">
          {filteredGroups.length === 0 && (
            <div className="border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
              No obligations match the current filters.
            </div>
          )}

          {filteredGroups.map((group) => (
            <div key={group.jurisdiction} className="border-b pb-5 last:border-b-0">
              <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-base font-medium">
                    {group.jurisdictionLevel === "federal"
                      ? "Federal"
                      : group.jurisdiction}{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      {group.agencyName}
                    </span>
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {group.counts.verified}/{group.counts.total} verified
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <span className="text-xs text-muted-foreground">
                    Verified: {group.counts.verified}
                  </span>
                  {group.counts.needsReview > 0 && (
                    <span className="text-xs text-muted-foreground">
                      Needs review: {group.counts.needsReview}
                    </span>
                  )}
                  {group.counts.sourceChanged > 0 && (
                    <span className="text-xs text-muted-foreground">
                      Source changed: {group.counts.sourceChanged}
                    </span>
                  )}
                  {group.counts.unsupported > 0 && (
                    <span className="text-xs text-muted-foreground">
                      Unsupported: {group.counts.unsupported}
                    </span>
                  )}
                  {group.counts.noRule > 0 && (
                    <span className="text-xs text-muted-foreground">
                      Coverage gap: {group.counts.noRule}
                    </span>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto border">
                <table className="w-full min-w-[800px] border-collapse text-left text-sm">
                  <thead className="bg-muted/40 text-xs font-semibold text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Obligation</th>
                      <th className="w-36 px-3 py-2">Tax category</th>
                      <th className="w-40 px-3 py-2">Entity types</th>
                      <th className="w-36 px-3 py-2">Status</th>
                      <th className="w-28 px-3 py-2">Last verified</th>
                      <th className="w-24 px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.obligations.map((obl) => {
                      const sk = getStatusKey(obl.verificationStatus);
                      return (
                        <tr key={obl.obligationId} className="border-t align-top">
                          <td className="px-3 py-3">
                            <div className="font-medium">{obl.obligationName}</div>
                            {obl.ruleSummary && (
                              <div className="mt-1 max-w-lg text-xs leading-5 text-muted-foreground">
                                {obl.ruleSummary}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3 text-xs text-muted-foreground">
                            {obl.taxCategory}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap gap-1">
                              {obl.entityTypes.map((et) => (
                                <span
                                  key={et}
                                  className="border bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground"
                                >
                                  {formatEntityType(et)}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <VerificationBadge statusKey={sk} />
                          </td>
                          <td className="px-3 py-3 font-mono text-xs text-muted-foreground">
                            {obl.lastVerifiedAt ? formatDate(obl.lastVerifiedAt) : "-"}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap gap-1">
                              {obl.ruleId && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="xs"
                                  onClick={() => setSelectedRuleId(obl.ruleId)}
                                >
                                  Evidence
                                </Button>
                              )}
                              {sk !== "verified" && (
                                <>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="xs"
                                    disabled={requestCoverage.isPending}
                                    onClick={() =>
                                      requestCoverage.mutate({
                                        obligationId: obl.obligationId,
                                      })
                                    }
                                  >
                                    Request
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="xs"
                                    disabled={addUserDeadline.isPending}
                                    onClick={() =>
                                      addUserDeadline.mutate({
                                        obligationId: obl.obligationId,
                                      })
                                    }
                                  >
                                    User deadline
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="xs"
                                    disabled={dismissGap.isPending}
                                    onClick={() =>
                                      dismissGap.mutate({
                                        obligationId: obl.obligationId,
                                      })
                                    }
                                  >
                                    Dismiss
                                  </Button>
                                </>
                              )}
                            </div>
                            {sk === "verified" && !obl.ruleId && (
                              <span className="text-xs text-muted-foreground">No action</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </section>
      </div>

      {/* Rule evidence drawer */}
      {selectedRuleId && (
        <RuleDetailDrawer ruleId={selectedRuleId} onClose={() => setSelectedRuleId(null)} />
      )}
    </main>
  );
}

// ── Components ──

function SummaryCount({
  label,
  count,
  statusKey,
}: {
  label: string;
  count: number;
  statusKey: VerificationStatusKey;
}) {
  const Icon = statusIcons[statusKey];
  const config = statusConfig[statusKey];

  return (
    <div className="flex items-center justify-between gap-3 px-2 py-1.5">
      <span
        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-[6px] border px-1.5 py-0.5 text-[11px] font-semibold leading-[1.1] ${config.className}`}
      >
        <Icon className="size-3" />
        {label}
      </span>
      <span className="text-sm font-medium">{count}</span>
    </div>
  );
}

function VerificationBadge({ statusKey }: { statusKey: VerificationStatusKey }) {
  const config = statusConfig[statusKey];
  const Icon = statusIcons[statusKey];

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-[6px] border px-1.5 py-0.5 text-[11px] font-semibold leading-[1.1] ${config.className}`}
    >
      <Icon className="size-3" />
      {config.label}
    </span>
  );
}

function RuleDetailDrawer({
  ruleId,
  onClose,
}: {
  ruleId: string;
  onClose: () => void;
}) {
  const ruleDetail = useQuery(trpc.coverage.getRule.queryOptions({ ruleId }));

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* backdrop */}
        <Button
          type="button"
          variant="ghost"
          className="absolute inset-0 h-auto w-auto justify-start rounded-none border-0 bg-black/20 p-0 hover:bg-black/20"
          onClick={onClose}
          aria-label="Close evidence drawer"
        />
      {/* drawer */}
      <div className="relative z-10 flex w-full max-w-lg flex-col overflow-y-auto border-l bg-background shadow-lg">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-base font-medium">Rule evidence</h2>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </Button>
        </div>

        {ruleDetail.isPending && (
          <div className="p-4 text-sm text-muted-foreground">Loading evidence...</div>
        )}

        {ruleDetail.isError && (
          <div className="p-4 text-sm text-destructive">Could not load rule evidence.</div>
        )}

        {ruleDetail.data && (
          <div className="flex flex-col gap-4 p-4">
            {/* Obligation info */}
            <div>
              <div className="text-xs font-medium uppercase text-muted-foreground">Obligation</div>
              <div className="mt-1 font-medium">{ruleDetail.data.obligationName}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {ruleDetail.data.jurisdiction === "federal"
                  ? "Federal"
                  : ruleDetail.data.jurisdiction}{" "}
                / {ruleDetail.data.taxCategory}
              </div>
            </div>

            {/* Entity types */}
            <div>
              <div className="text-xs font-medium uppercase text-muted-foreground">
                Entity types
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {ruleDetail.data.entityTypes.map((et) => (
                  <span
                    key={et}
                    className="border bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground"
                  >
                    {formatEntityType(et)}
                  </span>
                ))}
              </div>
            </div>

            {/* Verification status */}
            <div>
              <div className="text-xs font-medium uppercase text-muted-foreground">
                Verification status
              </div>
              <div className="mt-1">
                <VerificationBadge
                  statusKey={getStatusKey(ruleDetail.data.verificationStatus)}
                />
              </div>
            </div>

            {/* Rule summary */}
            <div>
              <div className="text-xs font-medium uppercase text-muted-foreground">
                Rule summary
              </div>
              <div className="mt-1 text-sm leading-relaxed">{ruleDetail.data.ruleSummary}</div>
            </div>

            {/* Source */}
            <div>
              <div className="text-xs font-medium uppercase text-muted-foreground">
                Official source
              </div>
              <div className="mt-1 text-sm">{ruleDetail.data.sourceName}</div>
              {ruleDetail.data.sourceUrl && (
                <a
                  href={ruleDetail.data.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="size-3" />
                  {ruleDetail.data.sourceUrl}
                </a>
              )}
            </div>

            {/* Timestamps */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs font-medium uppercase text-muted-foreground">
                  Last verified
                </div>
                <div className="mt-1 font-mono text-xs">
                  {ruleDetail.data.lastVerifiedAt
                    ? formatDate(ruleDetail.data.lastVerifiedAt)
                    : "-"}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase text-muted-foreground">
                  Source last checked
                </div>
                <div className="mt-1 font-mono text-xs">
                  {ruleDetail.data.sourceLastCheckedAt
                    ? formatDate(ruleDetail.data.sourceLastCheckedAt)
                    : "-"}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase text-muted-foreground">
                  Source last changed
                </div>
                <div className="mt-1 font-mono text-xs">
                  {ruleDetail.data.sourceLastChangedAt
                    ? formatDate(ruleDetail.data.sourceLastChangedAt)
                    : "No changes detected"}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase text-muted-foreground">
                  Rule version
                </div>
                <div className="mt-1 font-mono text-xs">v{ruleDetail.data.currentVersion}</div>
              </div>
            </div>

            {/* Verification notes */}
            {ruleDetail.data.verificationNotes && (
              <div>
                <div className="text-xs font-medium uppercase text-muted-foreground">
                  Verification notes
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {ruleDetail.data.verificationNotes}
                </div>
              </div>
            )}

            {/* Example due dates */}
            <div>
              <div className="text-xs font-medium uppercase text-muted-foreground">
                Calculated due dates
              </div>
              <div className="mt-2 overflow-x-auto border">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="bg-muted/40 font-semibold text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1.5">Tax year</th>
                      <th className="px-2 py-1.5">Quarter</th>
                      <th className="px-2 py-1.5">Due date</th>
                      <th className="px-2 py-1.5">Extension</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ruleDetail.data.exampleDueDates.map((ed) => (
                      <tr
                        key={`${ed.taxYear}-${ed.quarter ?? "annual"}`}
                        className="border-t"
                      >
                        <td className="px-2 py-1.5 font-mono">{ed.taxYear}</td>
                        <td className="px-2 py-1.5 font-mono">
                          {ed.quarter ? `Q${ed.quarter}` : "-"}
                        </td>
                        <td className="px-2 py-1.5 font-mono">{formatDate(ed.dueDate)}</td>
                        <td className="px-2 py-1.5 font-mono">
                          {ed.extensionDate ? formatDate(ed.extensionDate) : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Utilities ──

function formatEntityType(et: string): string {
  return et
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
