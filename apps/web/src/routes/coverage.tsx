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
import { useState } from "react";
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

const statusHeaderIconStyles: Record<VerificationStatusKey, string> = {
  verified: "bg-ddhq-verified-soft text-ddhq-verified",
  needs_review: "bg-ddhq-review-soft text-ddhq-review",
  source_changed: "border-ddhq-review/30 bg-ddhq-review-soft text-ddhq-review",
  unsupported: "bg-ddhq-gap-soft text-ddhq-gap",
  no_rule: "bg-ddhq-gap-soft text-ddhq-gap",
};

const coverageFilterSelectTriggerClassName = "h-8 w-auto !rounded-[6px]";
const coverageFilterSelectContentClassName = "!rounded-[6px]";
const coverageFilterSelectItemClassName =
  "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[selected]:bg-accent data-[selected]:text-accent-foreground";
const coverageActionButtonClassName =
  "w-full cursor-pointer rounded-[6px] !border-ddhq-border-strong !bg-background px-2 text-[11px] font-semibold shadow-[inset_0_-1px_0_rgba(0,0,0,0.04)] hover:!border-primary/60 hover:!bg-ddhq-accent-soft/60 hover:!text-foreground focus-visible:!border-primary focus-visible:!ring-primary/25";
const evidenceLabelClassName =
  "text-[11px] font-semibold uppercase leading-4 text-muted-foreground";
const evidenceValueClassName = "mt-1.5 text-sm leading-5 text-foreground";
const evidenceMetadataValueClassName = "mt-1 font-mono text-[12px] leading-5 text-foreground";
const dateHighlightClassName =
  "inline-flex min-w-[6.5rem] items-center rounded-[6px] border border-ddhq-review/35 bg-ddhq-review-soft/55 px-2 py-1 font-mono text-[12px] font-semibold leading-4 text-foreground";
const extensionDateHighlightClassName =
  "inline-flex min-w-[6.5rem] items-center rounded-[6px] border border-ddhq-accent/25 bg-ddhq-accent-soft/50 px-2 py-1 font-mono text-[12px] font-semibold leading-4 text-foreground";

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
  const addEnteredDeadline = useMutation(
    trpc.coverage.addEnteredDeadlineFromGap.mutationOptions({
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

        {/* Filters */}
        <section className="flex flex-wrap items-center gap-3">
          <div className="grid gap-1 text-xs font-medium text-muted-foreground">
            Jurisdiction
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

          <div className="grid gap-1 text-xs font-medium text-muted-foreground">
            Status
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
        </section>

        {/* Coverage table by jurisdiction group */}
        <section className="flex flex-col gap-5">

          {filteredGroups.length === 0 && (
            <div className="rounded-xl border border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
              No obligations match the current filters.
            </div>
          )}

          {filteredGroups.map((group) => (
            <div key={group.jurisdiction} className="border-b border-border pb-5 last:border-b-0">
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

              <div className="rounded-xl border border-border">
                <Table className="min-w-[960px] table-fixed">
                  <colgroup>
                    <col className="w-[34%]" />
                    <col className="w-[13%]" />
                    <col className="w-[15%]" />
                    <col className="w-[14%]" />
                    <col className="w-[10%]" />
                    <col className="w-[14%]" />
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
                      <TableHead className="w-28 text-right text-[11px] font-semibold uppercase text-muted-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.obligations.map((obl) => {
                      const sk = getStatusKey(obl.verificationStatus);
                      const hasActions = Boolean(obl.ruleId) || sk !== "verified";

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
                          <TableCell className="align-top">
                            {hasActions ? (
                              <div
                                role="group"
                                aria-label={`Coverage actions for ${obl.obligationName}`}
                                className="ml-auto grid w-28 grid-cols-1 gap-1"
                              >
                                {obl.ruleId && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="xs"
                                    className={coverageActionButtonClassName}
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
                                      className={coverageActionButtonClassName}
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
                                      className={coverageActionButtonClassName}
                                      disabled={addEnteredDeadline.isPending}
                                      onClick={() =>
                                        addEnteredDeadline.mutate({
                                          obligationId: obl.obligationId,
                                        })
                                      }
                                    >
                                      Entered deadline
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="xs"
                                      className={coverageActionButtonClassName}
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
                            ) : (
                              <span className="block text-right text-xs text-muted-foreground">
                                No action
                              </span>
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
        <SheetContent side="right" className="w-full max-w-2xl p-0 sm:max-w-2xl">
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
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span>Status</span>
      <span className="flex shrink-0 items-center gap-0.5" aria-label="Status meanings">
        {statusHeaderKeys.map((statusKey) => (
          <StatusHeaderIcon key={statusKey} statusKey={statusKey} />
        ))}
      </span>
    </div>
  );
}

function StatusHeaderIcon({ statusKey }: { statusKey: VerificationStatusKey }) {
  const Icon = statusIcons[statusKey];
  const description = `${statusLabels[statusKey]}: ${statusDescriptions[statusKey]}`;

  return (
    <span
      role="img"
      tabIndex={0}
      title={description}
      aria-label={description}
      className={`inline-flex size-4 items-center justify-center rounded-[6px] border border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${statusHeaderIconStyles[statusKey]}`}
    >
      <Icon className="size-3" aria-hidden="true" />
    </span>
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
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="text-base font-semibold">Rule evidence</h2>
      </div>

      {ruleDetail.isPending && (
        <div className="p-4 text-sm text-muted-foreground">Loading evidence...</div>
      )}

      {ruleDetail.isError && (
        <div className="p-4 text-sm text-ddhq-risk">Could not load rule evidence.</div>
      )}

      {ruleDetail.data && (
        <div className="flex flex-col gap-5 overflow-y-auto px-5 py-5">
          {/* Obligation info */}
          <section className="border-b border-border pb-5">
            <div className={evidenceLabelClassName}>Obligation</div>
            <div className="mt-1.5 text-sm font-semibold leading-5 text-foreground">
              {ruleDetail.data.obligationName}
            </div>
            <div className="mt-1 text-xs leading-4 text-muted-foreground">
              {ruleDetail.data.jurisdiction === "federal"
                ? "Federal"
                : ruleDetail.data.jurisdiction}{" "}
              / {ruleDetail.data.taxCategory}
            </div>
          </section>

          {/* Entity types */}
          <section className="border-b border-border pb-5">
            <div className={evidenceLabelClassName}>Entity types</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ruleDetail.data.entityTypes.map((et) => (
                <span
                  key={et}
                  className="rounded-[6px] border border-border bg-card px-1.5 py-0.5 text-[11px] text-muted-foreground"
                >
                  {formatEntityType(et)}
                </span>
              ))}
            </div>
          </section>

          {/* Verification status */}
          <section className="border-b border-border pb-5">
            <div className={evidenceLabelClassName}>Verification status</div>
            <div className="mt-2">
              <VerificationBadge
                statusKey={getStatusKey(ruleDetail.data.verificationStatus)}
              />
            </div>
          </section>

          {/* Rule summary */}
          <section className="border-b border-border pb-5">
            <div className={evidenceLabelClassName}>Rule summary</div>
            <div className={evidenceValueClassName}>{ruleDetail.data.ruleSummary}</div>
          </section>

          {/* Source */}
          <section className="border-b border-border pb-5">
            <div className={evidenceLabelClassName}>Official source</div>
            <div className="mt-2 rounded-[8px] border border-ddhq-accent/25 bg-ddhq-accent-soft/45 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
              <div className="flex items-start gap-2.5">
                <span className="grid size-7 shrink-0 place-items-center rounded-[6px] border border-ddhq-accent/25 bg-background text-ddhq-accent">
                  <ShieldCheck className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold leading-5 text-foreground">
                    {ruleDetail.data.sourceName}
                  </div>
                  {ruleDetail.data.sourceUrl && (
                    <a
                      href={ruleDetail.data.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 inline-flex max-w-full items-start gap-1.5 font-mono text-[12px] leading-5 text-ddhq-accent [overflow-wrap:anywhere] hover:text-foreground"
                    >
                      <ExternalLink className="mt-0.5 size-3 shrink-0" />
                      {ruleDetail.data.sourceUrl}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Timestamps */}
          <section className="grid grid-cols-2 gap-x-4 gap-y-4 border-b border-border pb-5">
            <EvidenceDateCard
              label="Last verified"
              value={
                ruleDetail.data.lastVerifiedAt
                  ? formatDate(ruleDetail.data.lastVerifiedAt)
                  : "-"
              }
            />
            <EvidenceDateCard
              label="Source last checked"
              value={
                ruleDetail.data.sourceLastCheckedAt
                  ? formatDate(ruleDetail.data.sourceLastCheckedAt)
                  : "-"
              }
            />
            <EvidenceDateCard
              label="Source last changed"
              tone={ruleDetail.data.sourceLastChangedAt ? "changed" : "stable"}
              value={
                ruleDetail.data.sourceLastChangedAt
                  ? formatDate(ruleDetail.data.sourceLastChangedAt)
                  : "No changes detected"
              }
            />
            <div>
              <div className={evidenceLabelClassName}>Rule version</div>
              <div className={evidenceMetadataValueClassName}>v{ruleDetail.data.currentVersion}</div>
            </div>
          </section>

          {/* Verification notes */}
          {ruleDetail.data.verificationNotes && (
            <section className="border-b border-border pb-5">
              <div className={evidenceLabelClassName}>Verification notes</div>
              <div className="mt-1.5 text-sm leading-5 text-muted-foreground">
                {ruleDetail.data.verificationNotes}
              </div>
            </section>
          )}

          {/* Example due dates */}
          <section>
            <div className={evidenceLabelClassName}>Calculated due dates</div>
            <div className="mt-2 overflow-hidden rounded-[8px] border border-border bg-background">
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
                      <TableCell className="font-mono text-[12px]">{ed.taxYear}</TableCell>
                      <TableCell className="font-mono text-[12px]">
                        {ed.quarter ? `Q${ed.quarter}` : "-"}
                      </TableCell>
                      <TableCell>
                        <span className={dateHighlightClassName}>{formatDate(ed.dueDate)}</span>
                      </TableCell>
                      <TableCell className="font-mono text-[12px]">
                        {ed.extensionDate ? (
                          <span className={extensionDateHighlightClassName}>
                            {formatDate(ed.extensionDate)}
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function EvidenceDateCard({
  label,
  tone = "date",
  value,
}: {
  label: string;
  tone?: "date" | "changed" | "stable";
  value: string;
}) {
  const toneClassName =
    tone === "stable"
      ? "border-ddhq-verified/25 bg-ddhq-verified-soft/45"
      : tone === "changed"
        ? "border-ddhq-review/35 bg-ddhq-review-soft/55"
        : "border-ddhq-accent/25 bg-ddhq-accent-soft/45";

  return (
    <div className={`rounded-[8px] border px-3 py-2.5 ${toneClassName}`}>
      <div className={evidenceLabelClassName}>{label}</div>
      <div className="mt-1 font-mono text-[12px] font-semibold leading-5 text-foreground">
        {value}
      </div>
    </div>
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
    timeZone: "UTC",
  }).format(new Date(value));
}
