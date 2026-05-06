import type {
  CoverageJurisdictionGroup,
  CoverageObligationItem,
} from "@due-date-hq/api/routers/coverage";
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
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  ExternalLink,
  Eye,
  FilePlus2,
  FilterX,
  Globe,
  HelpCircle,
  Info,
  ListFilter,
  Shield,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/status-badge";
import { formatDate, formatDateTime } from "@/utils/date-format";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/coverage")({
  component: CoverageComponent,
});

type VerificationStatusKey =
  | "verified"
  | "needs_review"
  | "source_changed"
  | "unsupported"
  | "no_rule";

type SourceMonitorStatus = CoverageObligationItem["sourceMonitorStatus"];
type JurisdictionFilter = "all" | string;
type EntityTypeFilter = "all" | string;
type TaxCategoryFilter = "all" | string;
type StatusFilter = "all" | VerificationStatusKey;
type SelectedCoverageDetail =
  | { mode: "coverage"; obligationId: string }
  | { mode: "evidence"; ruleId: string };

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
  source_changed: "needs_review",
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

const statusSummaryOrder = [
  "source_changed",
  "needs_review",
  "no_rule",
  "unsupported",
  "verified",
] as const;

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

const statusSummaryButtonStyles: Record<VerificationStatusKey, string> = {
  verified: "bg-ddhq-verified-soft/70 text-ddhq-verified hover:bg-ddhq-verified-soft",
  needs_review: "bg-ddhq-review-soft/75 text-ddhq-review hover:bg-ddhq-review-soft",
  source_changed: "bg-ddhq-review-soft/75 text-ddhq-review hover:bg-ddhq-review-soft",
  unsupported: "bg-ddhq-gap-soft/80 text-ddhq-gap hover:bg-ddhq-gap-soft",
  no_rule: "bg-ddhq-gap-soft/80 text-ddhq-gap hover:bg-ddhq-gap-soft",
};

const sourceMonitorBadgeStatus: Record<SourceMonitorStatus, Parameters<typeof StatusBadge>[0]["status"]> = {
  monitored: "verified",
  source_changed: "needs_review",
  not_monitored: "neutral",
  unsupported: "unsupported",
};

const coverageFilterSelectTriggerClassName = "h-8 min-w-36 !rounded-[6px]";
const coverageFilterSelectContentClassName = "!rounded-[6px]";
const coverageFilterSelectItemClassName =
  "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[selected]:bg-accent data-[selected]:text-accent-foreground";
const coverageActionButtonClassName =
  "min-h-7 w-full cursor-pointer rounded-[6px] !border-ddhq-border-strong !bg-background px-2 py-1 text-[11px] font-semibold leading-3 shadow-[inset_0_-1px_0_rgba(0,0,0,0.04)] hover:!border-primary/60 hover:!bg-ddhq-accent-soft/60 hover:!text-foreground focus-visible:!border-primary focus-visible:!ring-primary/25";
const evidenceLabelClassName =
  "text-[11px] font-semibold uppercase leading-4 text-muted-foreground";
const dateHighlightClassName =
  "inline-flex min-w-[6.5rem] items-center rounded-[6px] border border-ddhq-review/35 bg-ddhq-review-soft/55 px-2 py-1 font-mono text-[12px] font-semibold leading-4 text-foreground";
const extensionDateHighlightClassName =
  "inline-flex min-w-[6.5rem] items-center rounded-[6px] border border-ddhq-accent/25 bg-ddhq-accent-soft/50 px-2 py-1 font-mono text-[12px] font-semibold leading-4 text-foreground";

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
  const [entityTypeFilter, setEntityTypeFilter] = useState<EntityTypeFilter>("all");
  const [taxCategoryFilter, setTaxCategoryFilter] = useState<TaxCategoryFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedDetail, setSelectedDetail] = useState<SelectedCoverageDetail | null>(null);

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
  const allObligations = data.groups.flatMap((group) => group.obligations);
  const jurisdictions = data.groups.map((group) => group.jurisdiction);
  const entityTypes = [
    ...new Set(allObligations.flatMap((obligation) => obligation.entityTypes)),
  ].sort(compareStrings);
  const taxCategories = [
    ...new Set(allObligations.map((obligation) => obligation.taxCategory)),
  ].sort(compareStrings);
  const filteredGroups: CoverageJurisdictionGroup[] = data.groups.flatMap((group) => {
      const obligations = group.obligations.filter((obligation) => {
        if (jurisdictionFilter !== "all" && obligation.jurisdiction !== jurisdictionFilter) {
          return false;
        }
        if (entityTypeFilter !== "all" && !obligation.entityTypes.includes(entityTypeFilter)) {
          return false;
        }
        if (taxCategoryFilter !== "all" && obligation.taxCategory !== taxCategoryFilter) {
          return false;
        }
        if (statusFilter !== "all" && getStatusKey(obligation.verificationStatus) !== statusFilter) {
          return false;
        }
        return true;
      });

      if (obligations.length === 0) return [];
      return [{ ...group, obligations, counts: summarizeObligations(obligations) }];
    });
  const filteredObligationCount = filteredGroups.reduce(
    (total, group) => total + group.obligations.length,
    0,
  );
  const activeFilterCount = [
    jurisdictionFilter,
    entityTypeFilter,
    taxCategoryFilter,
    statusFilter,
  ].filter((value) => value !== "all").length;
  const actionableCount =
    data.summary.totalSourceChanged +
    data.summary.totalNeedsReview +
    data.summary.totalNoRule +
    data.summary.totalUnsupported;
  const selectedObligation =
    selectedDetail?.mode === "coverage"
      ? allObligations.find((obligation) => obligation.obligationId === selectedDetail.obligationId)
      : null;

  function resetFilters() {
    setJurisdictionFilter("all");
    setEntityTypeFilter("all");
    setTaxCategoryFilter("all");
    setStatusFilter("all");
  }

  function requestVerification(obligationId: string) {
    requestCoverage.mutate({ obligationId });
  }

  function startEnteredDeadline(obligationId: string) {
    addEnteredDeadline.mutate({ obligationId });
  }

  function dismissCoverageGap(obligationId: string) {
    dismissGap.mutate({ obligationId });
  }

  return (
    <main className="min-h-0 overflow-auto">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6">
        <section className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <div className="max-w-3xl">
            <div className="mb-1.5 flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
              <Shield className="size-3.5" />
              Tax obligation library
            </div>
            <h1 className="text-2xl font-semibold tracking-normal">Coverage Matrix</h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
              Beta coverage is limited to P0 official sources. Non-verified obligations stay
              visible, but they cannot generate DueDateHQ Verified deadline tasks.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground md:max-w-xs md:justify-end">
            <span className="font-medium text-foreground">{actionableCount} non-verified</span>
            <span>Updated {formatDate(data.generatedAt)}</span>
            <span>{data.summary.jurisdictionCount} jurisdictions</span>
          </div>
        </section>

        <section className="-mx-5 bg-muted/20 px-5 py-3">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
              <div
                role="group"
                aria-label="Filter by verification status"
                className="flex flex-wrap items-center gap-1.5"
              >
                {statusSummaryOrder.map((statusKey) => (
                  <StatusSummaryButton
                    key={statusKey}
                    active={statusFilter === statusKey}
                    count={getSummaryCount(data.summary, statusKey)}
                    statusKey={statusKey}
                    onClick={() => setStatusFilter(statusFilter === statusKey ? "all" : statusKey)}
                  />
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <ListFilter className="size-3.5" />
                  Showing {filteredObligationCount} of {data.summary.totalObligations}
                </span>
                {activeFilterCount > 0 && (
                  <span>{activeFilterCount} active filter{activeFilterCount === 1 ? "" : "s"}</span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <FilterField label="Jurisdiction">
                <Select value={jurisdictionFilter} onValueChange={(value) => setJurisdictionFilter(value ?? "all")}>
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
                    {jurisdictions.map((jurisdiction) => (
                      <SelectItem
                        key={jurisdiction}
                        className={coverageFilterSelectItemClassName}
                        value={jurisdiction}
                      >
                        {formatJurisdiction(jurisdiction)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>

              <FilterField label="Entity type">
                <Select value={entityTypeFilter} onValueChange={(value) => setEntityTypeFilter(value ?? "all")}>
                  <SelectTrigger
                    aria-label="Filter by entity type"
                    className={coverageFilterSelectTriggerClassName}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    alignItemWithTrigger={false}
                    className={coverageFilterSelectContentClassName}
                  >
                    <SelectItem className={coverageFilterSelectItemClassName} value="all">
                      All entity types
                    </SelectItem>
                    {entityTypes.map((entityType) => (
                      <SelectItem
                        key={entityType}
                        className={coverageFilterSelectItemClassName}
                        value={entityType}
                      >
                        {formatEntityType(entityType)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>

              <FilterField label="Tax category">
                <Select value={taxCategoryFilter} onValueChange={(value) => setTaxCategoryFilter(value ?? "all")}>
                  <SelectTrigger
                    aria-label="Filter by tax category"
                    className={coverageFilterSelectTriggerClassName}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    alignItemWithTrigger={false}
                    className={coverageFilterSelectContentClassName}
                  >
                    <SelectItem className={coverageFilterSelectItemClassName} value="all">
                      All tax categories
                    </SelectItem>
                    {taxCategories.map((taxCategory) => (
                      <SelectItem
                        key={taxCategory}
                        className={coverageFilterSelectItemClassName}
                        value={taxCategory}
                      >
                        {taxCategory}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>

              <FilterField label="Status">
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
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
                    {statusHeaderKeys.map((statusKey) => (
                      <SelectItem
                        key={statusKey}
                        className={coverageFilterSelectItemClassName}
                        value={statusKey}
                      >
                        {statusLabels[statusKey]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-[6px]"
                disabled={activeFilterCount === 0}
                onClick={resetFilters}
              >
                <FilterX className="size-3.5" />
                Reset filters
              </Button>
            </div>

            <details className="text-sm">
              <summary className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground">
                <Globe className="size-3.5" />
                Supported P0 sources
                <span className="font-normal">({data.supportedSources.length})</span>
              </summary>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
                {data.supportedSources.map((source) => (
                  <span key={source} className="inline-flex items-center gap-1.5">
                    <Globe className="size-3" />
                    {source}
                  </span>
                ))}
              </div>
            </details>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          {filteredGroups.length === 0 && (
            <div className="rounded-xl border border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
              No obligations match the current filters.
            </div>
          )}

          {filteredGroups.map((group) => (
            <div key={group.jurisdiction} className="grid gap-2">
              <div className="flex flex-col gap-1 px-1 md:flex-row md:items-end md:justify-between">
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold">
                    {formatJurisdiction(group.jurisdiction)}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      {group.agencyName}
                    </span>
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {group.counts.verified}/{group.counts.total} verified in this view
                  </p>
                </div>
                <GroupCountList counts={group.counts} />
              </div>

              <div className="overflow-hidden rounded-[8px] border border-border/80">
                <Table className="min-w-[1120px] table-fixed">
                  <colgroup>
                    <col className="w-[27%]" />
                    <col className="w-[18%]" />
                    <col className="w-[13%]" />
                    <col className="w-[21%]" />
                    <col className="w-[9%]" />
                    <col className="w-[12%]" />
                  </colgroup>
                  <TableHeader>
                    <TableRow className="border-border/70 bg-muted/30 hover:bg-muted/30">
                      <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground">Obligation</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground">Scope</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground">
                        <StatusColumnHeader />
                      </TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground">Source monitor</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground">Last verified</TableHead>
                      <TableHead className="text-right text-[11px] font-semibold uppercase text-muted-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.obligations.map((obligation) => {
                      const statusKey = getStatusKey(obligation.verificationStatus);

                      return (
                        <TableRow key={obligation.obligationId} className="border-border/70 align-top">
                          <TableCell className="min-w-0 whitespace-normal">
                            <div className="max-w-full break-words font-medium leading-5 [overflow-wrap:anywhere]">
                              {obligation.obligationName}
                            </div>
                            {obligation.ruleSummary && (
                              <div className="mt-1 max-w-full break-words text-xs leading-5 text-muted-foreground [overflow-wrap:anywhere]">
                                {obligation.ruleSummary}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="grid gap-1.5">
                              <span className="text-xs text-muted-foreground">{obligation.taxCategory}</span>
                              <div className="flex flex-wrap gap-1">
                                {obligation.entityTypes.map((entityType) => (
                                  <span
                                    key={entityType}
                                    className="rounded-[6px] border border-border bg-card px-1.5 py-0.5 text-[11px] text-muted-foreground"
                                  >
                                    {formatEntityType(entityType)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <VerificationBadge statusKey={statusKey} />
                          </TableCell>
                          <TableCell>
                            <SourceMonitorCell obligation={obligation} />
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {obligation.lastVerifiedAt ? formatDate(obligation.lastVerifiedAt) : "Not verified"}
                          </TableCell>
                          <TableCell className="align-top">
                            <CoverageActions
                              addEnteredDeadlinePending={addEnteredDeadline.isPending}
                              dismissGapPending={dismissGap.isPending}
                              obligation={obligation}
                              requestCoveragePending={requestCoverage.isPending}
                              statusKey={statusKey}
                              onAddEnteredDeadline={startEnteredDeadline}
                              onDismissGap={dismissCoverageGap}
                              onOpenCoverage={(obligationId) =>
                                setSelectedDetail({ mode: "coverage", obligationId })
                              }
                              onOpenEvidence={(ruleId) => setSelectedDetail({ mode: "evidence", ruleId })}
                              onRequestCoverage={requestVerification}
                            />
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

      <Sheet
        open={Boolean(selectedDetail)}
        onOpenChange={(open) => {
          if (!open) setSelectedDetail(null);
        }}
      >
        <SheetContent
          side="right"
          className="!w-[min(100vw,720px)] !max-w-[720px] p-0 sm:!w-[min(42vw,720px)] sm:!max-w-[720px]"
        >
          <SheetTitle className="sr-only">Coverage detail</SheetTitle>
          {selectedDetail?.mode === "evidence" && (
            <RuleDetailContent ruleId={selectedDetail.ruleId} />
          )}
          {selectedDetail?.mode === "coverage" && selectedObligation && (
            <CoverageDetailContent
              addEnteredDeadlinePending={addEnteredDeadline.isPending}
              dismissGapPending={dismissGap.isPending}
              obligation={selectedObligation}
              requestCoveragePending={requestCoverage.isPending}
              onAddEnteredDeadline={startEnteredDeadline}
              onDismissGap={dismissCoverageGap}
              onOpenEvidence={(ruleId) => setSelectedDetail({ mode: "evidence", ruleId })}
              onRequestCoverage={requestVerification}
            />
          )}
        </SheetContent>
      </Sheet>
    </main>
  );
}

function FilterField({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <label className="grid gap-1 text-xs font-medium text-muted-foreground">
      {label}
      {children}
    </label>
  );
}

function StatusSummaryButton({
  active,
  count,
  onClick,
  statusKey,
}: {
  active: boolean;
  count: number;
  onClick: () => void;
  statusKey: VerificationStatusKey;
}) {
  const Icon = statusIcons[statusKey];

  return (
    <button
      type="button"
      aria-pressed={active}
      className={`inline-flex min-h-8 items-center gap-2 whitespace-nowrap rounded-[6px] px-2.5 py-1.5 text-left text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        active
          ? "bg-ddhq-accent-soft text-foreground ring-1 ring-inset ring-primary/45"
          : statusSummaryButtonStyles[statusKey]
      }`}
      onClick={onClick}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      <span>{statusLabels[statusKey]}</span>
      <span className="font-mono text-[12px] text-foreground/80">{count}</span>
    </button>
  );
}

function GroupCountList({
  counts,
}: {
  counts: ReturnType<typeof summarizeObligations>;
}) {
  const allCounts: Array<[VerificationStatusKey, number]> = [
    ["source_changed", counts.sourceChanged],
    ["needs_review", counts.needsReview],
    ["no_rule", counts.noRule],
    ["unsupported", counts.unsupported],
    ["verified", counts.verified],
  ];
  const visibleCounts = allCounts.filter(([, count]) => count > 0);

  return (
    <div className="flex flex-wrap gap-3">
      {visibleCounts.map(([statusKey, count]) => (
        <span key={statusKey} className="text-xs text-muted-foreground">
          {statusLabels[statusKey]}: {count}
        </span>
      ))}
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

function SourceMonitorCell({ obligation }: { obligation: CoverageObligationItem }) {
  return (
    <div className="grid min-w-0 gap-1.5 text-xs">
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <StatusBadge status={sourceMonitorBadgeStatus[obligation.sourceMonitorStatus]}>
          <SourceMonitorIcon status={obligation.sourceMonitorStatus} />
          {obligation.sourceMonitorLabel}
        </StatusBadge>
      </div>
      <div className="min-w-0 truncate text-muted-foreground">
        {obligation.sourceName ?? obligation.agencyName}
      </div>
      <div className="grid gap-0.5 font-mono text-[11px] leading-4 text-muted-foreground">
        <span>Checked {obligation.sourceLastCheckedAt ? formatDate(obligation.sourceLastCheckedAt) : "not monitored"}</span>
        <span>
          Changed {obligation.sourceLastChangedAt ? formatDate(obligation.sourceLastChangedAt) : "none recorded"}
        </span>
      </div>
    </div>
  );
}

function SourceMonitorIcon({ status }: { status: SourceMonitorStatus }) {
  if (status === "source_changed") return <AlertTriangle className="size-3 shrink-0" aria-hidden="true" />;
  if (status === "unsupported") return <HelpCircle className="size-3 shrink-0" aria-hidden="true" />;
  if (status === "not_monitored") return <CircleDashed className="size-3 shrink-0" aria-hidden="true" />;
  return <ShieldCheck className="size-3 shrink-0" aria-hidden="true" />;
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

function CoverageActions({
  addEnteredDeadlinePending,
  dismissGapPending,
  obligation,
  onAddEnteredDeadline,
  onDismissGap,
  onOpenCoverage,
  onOpenEvidence,
  onRequestCoverage,
  requestCoveragePending,
  statusKey,
}: {
  addEnteredDeadlinePending: boolean;
  dismissGapPending: boolean;
  obligation: CoverageObligationItem;
  onAddEnteredDeadline: (obligationId: string) => void;
  onDismissGap: (obligationId: string) => void;
  onOpenCoverage: (obligationId: string) => void;
  onOpenEvidence: (ruleId: string) => void;
  onRequestCoverage: (obligationId: string) => void;
  requestCoveragePending: boolean;
  statusKey: VerificationStatusKey;
}) {
  const ruleId = obligation.ruleId;

  if (statusKey === "verified" && ruleId) {
    return (
      <div className="ml-auto grid w-32 grid-cols-1 gap-1">
        <ActionButton onClick={() => onOpenEvidence(ruleId)}>Evidence</ActionButton>
      </div>
    );
  }

  if (statusKey === "needs_review" || statusKey === "source_changed") {
    return (
      <div className="ml-auto grid w-36 grid-cols-1 gap-1">
        {ruleId ? (
          <ActionButton onClick={() => onOpenEvidence(ruleId)}>
            Review evidence
          </ActionButton>
        ) : (
          <ActionButton onClick={() => onOpenCoverage(obligation.obligationId)}>
            Review state
          </ActionButton>
        )}
        <ActionButton
          disabled={requestCoveragePending}
          onClick={() => onRequestCoverage(obligation.obligationId)}
        >
          Request review
        </ActionButton>
      </div>
    );
  }

  if (statusKey === "unsupported") {
    return (
      <div className="ml-auto grid w-36 grid-cols-1 gap-1">
        <ActionButton onClick={() => onOpenCoverage(obligation.obligationId)}>
          Explain unsupported
        </ActionButton>
        <ActionButton
          disabled={requestCoveragePending}
          onClick={() => onRequestCoverage(obligation.obligationId)}
        >
          Request verification
        </ActionButton>
        <ActionButton
          disabled={addEnteredDeadlinePending}
          onClick={() => onAddEnteredDeadline(obligation.obligationId)}
        >
          Entered deadline
        </ActionButton>
      </div>
    );
  }

  return (
    <div className="ml-auto grid w-36 grid-cols-1 gap-1">
      <ActionButton onClick={() => onOpenCoverage(obligation.obligationId)}>Explain gap</ActionButton>
      <ActionButton
        disabled={requestCoveragePending}
        onClick={() => onRequestCoverage(obligation.obligationId)}
      >
        Request verification
      </ActionButton>
      <ActionButton
        disabled={addEnteredDeadlinePending}
        onClick={() => onAddEnteredDeadline(obligation.obligationId)}
      >
        Entered deadline
      </ActionButton>
      <ActionButton
        disabled={dismissGapPending}
        onClick={() => onDismissGap(obligation.obligationId)}
      >
        Dismiss for now
      </ActionButton>
    </div>
  );
}

function ActionButton({
  children,
  disabled,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="xs"
      className={coverageActionButtonClassName}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function CoverageDetailContent({
  addEnteredDeadlinePending,
  dismissGapPending,
  obligation,
  onAddEnteredDeadline,
  onDismissGap,
  onOpenEvidence,
  onRequestCoverage,
  requestCoveragePending,
}: {
  addEnteredDeadlinePending: boolean;
  dismissGapPending: boolean;
  obligation: CoverageObligationItem;
  onAddEnteredDeadline: (obligationId: string) => void;
  onDismissGap: (obligationId: string) => void;
  onOpenEvidence: (ruleId: string) => void;
  onRequestCoverage: (obligationId: string) => void;
  requestCoveragePending: boolean;
}) {
  const statusKey = getStatusKey(obligation.verificationStatus);
  const ruleId = obligation.ruleId;

  return (
    <>
      <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-3">
        <div>
          <div className="text-xs font-semibold text-muted-foreground">Coverage detail</div>
          <h2 className="text-base font-semibold leading-5">{statusLabels[statusKey]}</h2>
        </div>
        <VerificationBadge statusKey={statusKey} />
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <section className="border-b border-border pb-4">
          <div className="text-sm font-semibold leading-5 text-foreground">
            {obligation.obligationName}
          </div>
          <div className="mt-1 text-xs leading-4 text-muted-foreground">
            {formatJurisdiction(obligation.jurisdiction)} / {obligation.taxCategory} /{" "}
            {obligation.agencyName}
          </div>
        </section>

        <section className="border-b border-border py-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Info className="size-4 text-ddhq-gap" />
            What this means
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            {getCoverageStateExplanation(statusKey)}
          </p>
        </section>

        <section className="border-b border-border py-4">
          <div className={evidenceLabelClassName}>Scope</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {obligation.entityTypes.map((entityType) => (
              <span
                key={entityType}
                className="rounded-[6px] border border-border bg-card px-1.5 py-0.5 text-[11px] text-muted-foreground"
              >
                {formatEntityType(entityType)}
              </span>
            ))}
          </div>
        </section>

        <section className="border-b border-border py-4">
          <div className={evidenceLabelClassName}>Source monitor</div>
          <div className="mt-2 grid gap-2 text-xs">
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted px-2 py-1.5">
              <span className="text-muted-foreground">Monitor</span>
              <StatusBadge status={sourceMonitorBadgeStatus[obligation.sourceMonitorStatus]}>
                <SourceMonitorIcon status={obligation.sourceMonitorStatus} />
                {obligation.sourceMonitorLabel}
              </StatusBadge>
            </div>
            <RuleEvidenceField label="Source agency" value={obligation.sourceName ?? obligation.agencyName} />
            {obligation.sourceUrl ? (
              <a
                className="inline-flex items-center gap-1 font-mono text-xs font-medium text-primary [overflow-wrap:anywhere]"
                href={obligation.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                {obligation.sourceUrl}
                <ExternalLink className="size-3 shrink-0" />
              </a>
            ) : null}
            <RuleEvidenceField
              label="Last checked"
              value={obligation.sourceLastCheckedAt ? formatDateTime(obligation.sourceLastCheckedAt) : "Not monitored"}
              mono
            />
            <RuleEvidenceField
              label="Last changed"
              value={obligation.sourceLastChangedAt ? formatDateTime(obligation.sourceLastChangedAt) : "No change recorded"}
              mono
            />
            <RuleEvidenceField
              label="Last verified"
              value={obligation.lastVerifiedAt ? formatDateTime(obligation.lastVerifiedAt) : "Not verified by DueDateHQ"}
              mono
            />
          </div>
        </section>

        <section className="py-4">
          <div className={evidenceLabelClassName}>Safe next actions</div>
          <div className="mt-2 grid gap-2">
            {ruleId && (
              <DrawerActionButton onClick={() => onOpenEvidence(ruleId)}>
                <Eye className="size-3.5" />
                Review evidence
              </DrawerActionButton>
            )}
            <DrawerActionButton
              disabled={requestCoveragePending}
              onClick={() => onRequestCoverage(obligation.obligationId)}
            >
              <ShieldAlert className="size-3.5" />
              {statusKey === "needs_review" || statusKey === "source_changed"
                ? "Request review"
                : "Request verification"}
            </DrawerActionButton>
            {(statusKey === "unsupported" || statusKey === "no_rule") && (
              <DrawerActionButton
                disabled={addEnteredDeadlinePending}
                onClick={() => onAddEnteredDeadline(obligation.obligationId)}
              >
                <FilePlus2 className="size-3.5" />
                Add entered deadline
              </DrawerActionButton>
            )}
            {statusKey === "no_rule" && (
              <DrawerActionButton
                disabled={dismissGapPending}
                onClick={() => onDismissGap(obligation.obligationId)}
              >
                <CircleDashed className="size-3.5" />
                Dismiss coverage gap for now
              </DrawerActionButton>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

function DrawerActionButton({
  children,
  disabled,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-9 justify-start rounded-[6px]"
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
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
        <div>
          <div className="text-xs font-semibold text-muted-foreground">Evidence</div>
          <h2 className="text-base font-semibold">Rule evidence</h2>
        </div>
      </div>

      {ruleDetail.isPending && (
        <div className="space-y-3 p-4">
          <div className="h-16 animate-pulse rounded-lg border border-border bg-muted" />
          <div className="h-40 animate-pulse rounded-lg border border-border bg-muted" />
        </div>
      )}

      {ruleDetail.isError && (
        <div className="m-4 rounded-lg border border-ddhq-risk/30 bg-ddhq-risk-soft p-3 text-sm text-ddhq-risk">
          Could not load rule evidence.
        </div>
      )}

      {ruleDetail.data && (
        <div className="min-h-0 flex-1 overflow-auto p-4">
          <section className="border-b border-border pb-4">
            <div className="text-sm font-semibold leading-5 text-foreground">
              {ruleDetail.data.obligationName}
            </div>
            <div className="mt-1 text-xs leading-4 text-muted-foreground">
              {formatJurisdiction(ruleDetail.data.jurisdiction)} / {ruleDetail.data.taxCategory}
            </div>
          </section>

          <section className="border-b border-border py-4">
            <div className={evidenceLabelClassName}>Entity types</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ruleDetail.data.entityTypes.map((entityType) => (
                <span
                  key={entityType}
                  className="rounded-[6px] border border-border bg-card px-1.5 py-0.5 text-[11px] text-muted-foreground"
                >
                  {formatEntityType(entityType)}
                </span>
              ))}
            </div>
          </section>

          <section className="border-b border-border py-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              {ruleDetail.data.verificationStatus === "verified" ? (
                <ShieldCheck className="size-4 text-ddhq-verified" />
              ) : (
                <ShieldAlert className="size-4 text-ddhq-review" />
              )}
              Source evidence
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted px-2 py-1.5">
                <span className="text-muted-foreground">Verification</span>
                <VerificationBadge
                  statusKey={getStatusKey(ruleDetail.data.verificationStatus)}
                />
              </div>
              <p className="leading-5 text-muted-foreground">{ruleDetail.data.ruleSummary}</p>
              <div className="grid gap-2">
                <RuleEvidenceField label="Source name" value={ruleDetail.data.sourceName ?? "None"} />
                {ruleDetail.data.sourceUrl ? (
                  <a
                    className="inline-flex items-center gap-1 font-mono text-xs font-medium text-primary [overflow-wrap:anywhere]"
                    href={ruleDetail.data.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {ruleDetail.data.sourceUrl}
                    <ExternalLink className="size-3 shrink-0" />
                  </a>
                ) : null}
                <RuleEvidenceField
                  label="Last verified"
                  value={
                    ruleDetail.data.lastVerifiedAt
                      ? formatDateTime(ruleDetail.data.lastVerifiedAt)
                      : "Not verified"
                  }
                  mono
                />
                <RuleEvidenceField
                  label="Source last checked"
                  value={
                    ruleDetail.data.sourceLastCheckedAt
                      ? formatDateTime(ruleDetail.data.sourceLastCheckedAt)
                      : "Not checked"
                  }
                  mono
                />
                <RuleEvidenceField
                  label="Source last changed"
                  value={
                    ruleDetail.data.sourceLastChangedAt
                      ? formatDateTime(ruleDetail.data.sourceLastChangedAt)
                      : "No change recorded"
                  }
                  mono
                />
                <RuleEvidenceField
                  label="Rule version"
                  value={`v${ruleDetail.data.currentVersion}`}
                  mono
                />
              </div>
            </div>
          </section>

          {ruleDetail.data.verificationNotes && (
            <section className="border-b border-border py-4">
              <div className={evidenceLabelClassName}>Verification notes</div>
              <div className="mt-1.5 text-sm leading-5 text-muted-foreground">
                {ruleDetail.data.verificationNotes}
              </div>
            </section>
          )}

          <section className="py-4">
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
                  {ruleDetail.data.exampleDueDates.map((exampleDate) => (
                    <TableRow
                      key={`${exampleDate.taxYear}-${exampleDate.quarter ?? "annual"}`}
                    >
                      <TableCell className="font-mono text-[12px]">{exampleDate.taxYear}</TableCell>
                      <TableCell className="font-mono text-[12px]">
                        {exampleDate.quarter ? `Q${exampleDate.quarter}` : "-"}
                      </TableCell>
                      <TableCell>
                        <span className={dateHighlightClassName}>{formatDate(exampleDate.dueDate)}</span>
                      </TableCell>
                      <TableCell className="font-mono text-[12px]">
                        {exampleDate.extensionDate ? (
                          <span className={extensionDateHighlightClassName}>
                            {formatDate(exampleDate.extensionDate)}
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

function RuleEvidenceField({ label, mono, value }: { label: string; mono?: boolean; value: string }) {
  return (
    <div className="grid gap-1">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

function getStatusKey(status: string | null): VerificationStatusKey {
  if (status === "verified") return "verified";
  if (status === "needs_review") return "needs_review";
  if (status === "source_changed") return "source_changed";
  if (status === "unsupported") return "unsupported";
  return "no_rule";
}

function getSummaryCount(
  summary: {
    totalNeedsReview: number;
    totalNoRule: number;
    totalSourceChanged: number;
    totalUnsupported: number;
    totalVerified: number;
  },
  statusKey: VerificationStatusKey,
): number {
  if (statusKey === "verified") return summary.totalVerified;
  if (statusKey === "needs_review") return summary.totalNeedsReview;
  if (statusKey === "source_changed") return summary.totalSourceChanged;
  if (statusKey === "unsupported") return summary.totalUnsupported;
  return summary.totalNoRule;
}

function summarizeObligations(obligations: CoverageObligationItem[]) {
  return obligations.reduce(
    (counts, obligation) => {
      const statusKey = getStatusKey(obligation.verificationStatus);
      if (statusKey === "verified") counts.verified++;
      if (statusKey === "needs_review") counts.needsReview++;
      if (statusKey === "source_changed") counts.sourceChanged++;
      if (statusKey === "unsupported") counts.unsupported++;
      if (statusKey === "no_rule") counts.noRule++;
      counts.total++;
      return counts;
    },
    {
      total: 0,
      verified: 0,
      needsReview: 0,
      sourceChanged: 0,
      unsupported: 0,
      noRule: 0,
    },
  );
}

function getCoverageStateExplanation(statusKey: VerificationStatusKey): string {
  if (statusKey === "needs_review") {
    return "A rule candidate exists, but it has not completed reviewer approval. It cannot generate official DueDateHQ deadline tasks yet.";
  }
  if (statusKey === "source_changed") {
    return "The official source changed after prior verification. Review is required before this rule can be treated as current again.";
  }
  if (statusKey === "unsupported") {
    return "DueDateHQ knows about this obligation, but beta does not schedule it. You can request verification or add an entered deadline that stays unverified.";
  }
  if (statusKey === "no_rule") {
    return "DueDateHQ does not have a verified scheduling rule for this obligation. It is visible so the gap is explicit.";
  }
  return "This rule is verified against official source evidence and can generate official DueDateHQ deadline tasks.";
}

function formatEntityType(entityType: string): string {
  return entityType
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatJurisdiction(jurisdiction: string): string {
  return jurisdiction === "federal" ? "Federal" : jurisdiction;
}

function compareStrings(a: string, b: string): number {
  return a.localeCompare(b);
}
