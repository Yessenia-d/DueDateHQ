import { Button } from "@due-date-hq/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@due-date-hq/ui/components/select";
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
} from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/status-badge";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/coverage")({
  component: CoverageComponent,
});

// -- Status display config --

type VerificationStatusKey =
  | "verified"
  | "needs_review"
  | "source_changed"
  | "unsupported"
  | "no_rule";

const statusIcons: Record<VerificationStatusKey, typeof CheckCircle2> = {
  verified: ShieldCheck,
  needs_review: Eye,
  source_changed: ShieldAlert,
  unsupported: HelpCircle,
  no_rule: CircleDashed,
};

const statusToBadge: Record<VerificationStatusKey, Parameters<typeof StatusBadge>[0]["status"]> = {
  verified: "verified",
  needs_review: "needs_review",
  source_changed: "source_changed",
  unsupported: "unsupported",
  no_rule: "no_rule",
};

const statusLabels: Record<VerificationStatusKey, string> = {
  verified: "Verified",
  needs_review: "Needs review",
  source_changed: "Source changed",
  unsupported: "Unsupported",
  no_rule: "Coverage gap",
};

const statusDescriptions: Record<VerificationStatusKey, string> = {
  verified: "Verified against official source evidence and eligible for official deadlines.",
  needs_review: "Known obligation or rule candidate that needs reviewer approval.",
  source_changed: "Official source changed and the rule needs reviewer approval again.",
  unsupported: "Known obligation that DueDateHQ does not schedule in beta.",
  no_rule: "Coverage gap with no verified scheduling rule yet.",
};

const statusHeaderKeys = [
  "verified",
  "needs_review",
  "source_changed",
  "unsupported",
  "no_rule",
] as const;

const statusHeaderTooltipLabel = statusHeaderKeys
  .map((statusKey) => `${statusLabels[statusKey]}: ${statusDescriptions[statusKey]}`)
  .join(" ");

const coverageFilterSelectTriggerClassName = "h-8 w-auto !rounded-[6px]";
const coverageFilterSelectContentClassName = "!rounded-[6px]";
const coverageFilterSelectItemClassName =
  "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[selected]:bg-accent data-[selected]:text-accent-foreground";

function getStatusKey(status: string | null): VerificationStatusKey {
  if (status === "verified") return "verified";
  if (status === "needs_review") return "needs_review";
  if (status === "source_changed") return "source_changed";
  if (status === "unsupported") return "unsupported";
  return "no_rule";
}

// -- Filters --

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
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-6">
          <div className="h-24 animate-pulse rounded-xl border border-border bg-card" />
          <div className="h-96 animate-pulse rounded-xl border border-border bg-card" />
        </div>
      </main>
    );
  }

  if (coverage.isError) {
    return (
      <main className="min-h-0 overflow-auto">
        <div className="mx-auto max-w-7xl px-5 py-6">
          <div className="rounded-xl border border-ddhq-risk/30 bg-ddhq-risk-soft p-4 text-sm text-ddhq-risk">
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
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-6">
        {/* Header */}
        <section className="grid gap-4 border-b border-border pb-5 md:grid-cols-[1fr_auto] md:items-end">
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
        <section className="grid gap-2 border-b border-border pb-3 sm:grid-cols-2 lg:grid-cols-5">
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
        <section className="border-b border-border pb-3">
          <h2 className="mb-2 text-xs font-medium uppercase text-muted-foreground">
            P0 supported official sources
          </h2>
          <div className="flex flex-wrap gap-2">
            {data.supportedSources.map((source) => (
              <span
                key={source}
                className="inline-flex items-center gap-1.5 rounded-[6px] border border-border bg-card px-2 py-1 text-xs text-muted-foreground"
              >
                <Globe className="size-3" />
                {source}
              </span>
            ))}
          </div>
        </section>

        {/* Coverage table by jurisdiction group */}
        <section className="overflow-visible rounded-xl border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/20 px-3 py-2">
            <div className="text-xs font-medium uppercase text-muted-foreground">
              Coverage table
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <span>Jurisdiction</span>
                <Select value={jurisdictionFilter} onValueChange={(v) => setJurisdictionFilter(v ?? "all")}>
                  <SelectTrigger
                    aria-label="Filter by jurisdiction"
                    className={coverageFilterSelectTriggerClassName}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    alignItemWithTrigger={false}
                    className={coverageFilterSelectContentClassName}
                  >
                    <SelectItem className={coverageFilterSelectItemClassName} value="all">
                      All jurisdictions
                    </SelectItem>
                    {jurisdictions.map((j) => (
                      <SelectItem
                        key={j}
                        className={coverageFilterSelectItemClassName}
                        value={j}
                      >
                        {j === "federal" ? "Federal" : j}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <span>Status</span>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                  <SelectTrigger
                    aria-label="Filter by verification status"
                    className={coverageFilterSelectTriggerClassName}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    alignItemWithTrigger={false}
                    className={coverageFilterSelectContentClassName}
                  >
                    <SelectItem className={coverageFilterSelectItemClassName} value="all">
                      All statuses
                    </SelectItem>
                    <SelectItem className={coverageFilterSelectItemClassName} value="verified">
                      Verified
                    </SelectItem>
                    <SelectItem className={coverageFilterSelectItemClassName} value="needs_review">
                      Needs review
                    </SelectItem>
                    <SelectItem className={coverageFilterSelectItemClassName} value="source_changed">
                      Source changed
                    </SelectItem>
                    <SelectItem className={coverageFilterSelectItemClassName} value="unsupported">
                      Unsupported
                    </SelectItem>
                    <SelectItem className={coverageFilterSelectItemClassName} value="no_rule">
                      Coverage gap
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          {filteredGroups.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No obligations match the current filters.
            </div>
          )}

          {filteredGroups.map((group) => (
            <div key={group.jurisdiction} className="border-b border-border last:border-b-0">
              <div className="flex flex-col gap-2 border-b border-border/70 px-3 py-3 md:flex-row md:items-end md:justify-between">
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

              <div className="overflow-visible">
                <Table className="min-w-[960px] table-fixed">
                  <colgroup>
                    <col className="w-[36%]" />
                    <col className="w-[13%]" />
                    <col className="w-[15%]" />
                    <col className="w-[14%]" />
                    <col className="w-[10%]" />
                    <col className="w-[12%]" />
                  </colgroup>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground">Obligation</TableHead>
                      <TableHead className="w-36 text-[11px] font-semibold uppercase text-muted-foreground">Tax category</TableHead>
                      <TableHead className="w-40 text-[11px] font-semibold uppercase text-muted-foreground">Entity types</TableHead>
                      <TableHead className="w-36 text-[11px] font-semibold uppercase text-muted-foreground">
                        <StatusColumnHeader />
                      </TableHead>
                      <TableHead className="w-28 text-[11px] font-semibold uppercase text-muted-foreground">Last verified</TableHead>
                      <TableHead className="w-24 text-[11px] font-semibold uppercase text-muted-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.obligations.map((obl) => {
                      const sk = getStatusKey(obl.verificationStatus);
                      return (
                        <TableRow key={obl.obligationId} className="align-top">
                          <TableCell className="min-w-0 whitespace-normal">
                            <div className="max-w-full break-words font-medium leading-5 [overflow-wrap:anywhere]">
                              {obl.obligationName}
                            </div>
                            {obl.ruleSummary && (
                              <div className="mt-1 max-w-full break-words text-xs leading-5 text-muted-foreground [overflow-wrap:anywhere]">
                                {obl.ruleSummary}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {obl.taxCategory}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {obl.entityTypes.map((et) => (
                                <span
                                  key={et}
                                  className="rounded-[6px] border border-border bg-card px-1.5 py-0.5 text-[11px] text-muted-foreground"
                                >
                                  {formatEntityType(et)}
                                </span>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <VerificationBadge statusKey={sk} />
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {obl.lastVerifiedAt ? formatDate(obl.lastVerifiedAt) : "-"}
                          </TableCell>
                          <TableCell>
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
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </section>
      </div>

      {/* Rule evidence drawer */}
      <Sheet open={Boolean(selectedRuleId)} onOpenChange={(open) => { if (!open) setSelectedRuleId(null); }}>
        <SheetContent side="right" className="w-full max-w-lg p-0 sm:max-w-lg">
          <SheetTitle className="sr-only">Rule evidence</SheetTitle>
          {selectedRuleId && (
            <RuleDetailContent ruleId={selectedRuleId} />
          )}
        </SheetContent>
      </Sheet>
    </main>
  );
}

// -- Components --

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

  return (
    <div className="flex items-center justify-between gap-3 px-2 py-1.5">
      <StatusBadge status={statusToBadge[statusKey]}>
        <Icon className="size-3" />
        {label}
      </StatusBadge>
      <span className="text-sm font-medium">{count}</span>
    </div>
  );
}

function VerificationBadge({ statusKey }: { statusKey: VerificationStatusKey }) {
  const Icon = statusIcons[statusKey];

  return (
    <StatusBadge status={statusToBadge[statusKey]}>
      <Icon className="size-3 shrink-0" aria-hidden="true" />
      {statusLabels[statusKey]}
    </StatusBadge>
  );
}

function StatusColumnHeader() {
  const tooltipId = useId();

  return (
    <div className="flex min-w-0 items-center gap-1">
      <span>STATUS</span>
      <span className="group relative inline-flex shrink-0 items-center">
        <button
          type="button"
          aria-label={statusHeaderTooltipLabel}
          aria-describedby={tooltipId}
          className="inline-flex size-4 items-center justify-center rounded-full border border-border/70 bg-background/70 text-muted-foreground/80 transition-colors hover:border-border hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        >
          <HelpCircle className="size-3" aria-hidden="true" />
        </button>
        <span
          id={tooltipId}
          role="tooltip"
          className="pointer-events-none absolute right-0 top-full z-30 mt-1.5 hidden w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-[6px] border border-border bg-popover p-2.5 text-left text-[11px] font-normal normal-case leading-4 text-popover-foreground shadow-md group-hover:block group-focus-within:block"
        >
          <span className="block whitespace-normal text-[11px] font-semibold uppercase text-muted-foreground">
            Status meanings
          </span>
          <span className="mt-2 grid gap-1.5">
            {statusHeaderKeys.map((statusKey) => (
              <span
                key={statusKey}
                className="grid min-w-0 grid-cols-[max-content_minmax(0,1fr)] items-start gap-2"
              >
                <VerificationBadge statusKey={statusKey} />
                <span className="min-w-0 whitespace-normal break-words text-muted-foreground">
                  {statusDescriptions[statusKey]}
                </span>
              </span>
            ))}
          </span>
        </span>
      </span>
    </div>
  );
}

function RuleDetailContent({
  ruleId,
}: {
  ruleId: string;
}) {
  const ruleDetail = useQuery(trpc.coverage.getRule.queryOptions({ ruleId }));

  return (
    <>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-base font-medium">Rule evidence</h2>
      </div>

      {ruleDetail.isPending && (
        <div className="p-4 text-sm text-muted-foreground">Loading evidence...</div>
      )}

      {ruleDetail.isError && (
        <div className="p-4 text-sm text-ddhq-risk">Could not load rule evidence.</div>
      )}

      {ruleDetail.data && (
        <div className="flex flex-col gap-4 overflow-y-auto p-4">
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
                  className="rounded-[6px] border border-border bg-card px-1.5 py-0.5 text-[11px] text-muted-foreground"
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
            <div className="mt-2 rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground">Tax year</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground">Quarter</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground">Due date</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground">Extension</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ruleDetail.data.exampleDueDates.map((ed) => (
                    <TableRow
                      key={`${ed.taxYear}-${ed.quarter ?? "annual"}`}
                    >
                      <TableCell className="font-mono">{ed.taxYear}</TableCell>
                      <TableCell className="font-mono">
                        {ed.quarter ? `Q${ed.quarter}` : "-"}
                      </TableCell>
                      <TableCell className="font-mono">{formatDate(ed.dueDate)}</TableCell>
                      <TableCell className="font-mono">
                        {ed.extensionDate ? formatDate(ed.extensionDate) : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// -- Utilities --

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
