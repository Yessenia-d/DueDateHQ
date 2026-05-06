import type {
  ImportCommitResponse,
  ImportPreviewResponse,
  ImportReviewRowResponse,
} from "@due-date-hq/api/routers/imports";
import { Button } from "@due-date-hq/ui/components/button";
import { Checkbox } from "@due-date-hq/ui/components/checkbox";
import { Input } from "@due-date-hq/ui/components/input";
import { Label } from "@due-date-hq/ui/components/label";
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
import { Textarea } from "@due-date-hq/ui/components/textarea";
import { useMutation } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  ChevronDown,
  DatabaseZap,
  Eye,
  FileCheck2,
  FileText,
  GitCompareArrows,
  PencilLine,
  Rows3,
  ShieldCheck,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/import")({
  validateSearch: (search: Record<string, unknown>) => ({
    clientIds: typeof search.clientIds === "string" ? search.clientIds : undefined,
  }),
  component: ImportComponent,
});

type SourceSystem = ImportPreviewResponse["sourceSystem"];
type EntityType = NonNullable<ImportReviewRowResponse["canonicalProfile"]["entityType"]>;
type DuplicateCandidate = ImportPreviewResponse["duplicateCandidates"][number];
type RelationshipSuggestion = ImportPreviewResponse["relationshipSuggestions"][number];
type DuplicateResolution = "create" | "update_existing" | "skip";
type RelationshipDecision = "accepted" | "rejected";
type ImportMode = "clients_and_profiles" | "selected_clients";
type ColumnMapping = ImportPreviewResponse["columnMapping"];
type EvidenceFieldKey =
  | "clientName"
  | "filingProfileName"
  | "entityType"
  | "states"
  | "ein"
  | "ssnLast4"
  | "sourceClientId";

type ProfileCorrection = {
  clientName?: string;
  filingProfileName?: string | null;
  ein?: string | null;
  ssnLast4?: string | null;
  state?: string | null;
  states?: string[];
  entityType?: EntityType | null;
  county?: string | null;
  fiscalYearType?: "calendar_year" | "fiscal_year" | null;
};

type SourceFieldEntry = {
  sourceColumn: string;
  value: string;
  canonicalField: string | null;
  confidence: ColumnMapping[number]["confidence"] | null;
};

const sourceOptions = [
  { value: "taxdome", label: "TaxDome" },
  { value: "drake", label: "Drake" },
  { value: "karbon", label: "Karbon" },
  { value: "quickbooks", label: "QuickBooks" },
] as const satisfies readonly { value: SourceSystem; label: string }[];

const entityOptions = [
  { value: "individual", label: "Individual" },
  { value: "sole_prop", label: "Sole prop" },
  { value: "s_corp", label: "S corp" },
  { value: "c_corp", label: "C corp" },
  { value: "partnership", label: "Partnership" },
  { value: "llc", label: "LLC" },
  { value: "trust_estate", label: "Trust or estate" },
  { value: "nonprofit", label: "Nonprofit" },
  { value: "other", label: "Other" },
] as const satisfies readonly { value: EntityType; label: string }[];

const quietControlClassName =
  "rounded-[6px] border-transparent bg-ddhq-paper/80 shadow-none ring-1 ring-ddhq-line hover:bg-ddhq-paper focus-visible:border-primary/35 focus-visible:bg-ddhq-paper focus-visible:ring-2 focus-visible:ring-primary/20";
const importSelectTriggerClassName = `h-8 w-full ${quietControlClassName}`;
const reviewInputClassName = `h-8 ${quietControlClassName}`;
const sourceInputClassName = `h-8 ${quietControlClassName}`;
const importSelectContentClassName = "rounded-lg py-1";
const importSelectItemClassName = "mx-1 rounded-[4px]";
const csvFileStatusId = "csv-file-status";
const csvTextControlId = "csv-text";
const csvTextRegionId = "csv-text-region";
const csvTextSummaryId = "csv-text-summary";
const evidenceFieldAliases = {
  clientName: ["clientName"],
  filingProfileName: ["filingProfileName"],
  entityType: ["entityType"],
  states: ["state"],
  ein: ["ein"],
  ssnLast4: ["ssnLast4"],
  sourceClientId: ["sourceClientId"],
} as const satisfies Record<EvidenceFieldKey, readonly string[]>;

function ImportComponent() {
  const search = Route.useSearch();
  const selectedClientCount =
    search.clientIds?.split(",").filter((clientId) => clientId.trim()).length ?? 0;
  const [importMode, setImportMode] = React.useState<ImportMode>(
    selectedClientCount > 0 ? "selected_clients" : "clients_and_profiles",
  );
  const [sourceSystem, setSourceSystem] = React.useState<SourceSystem>("taxdome");
  const [csvText, setCsvText] = React.useState("");
  const [isCsvTextExpanded, setIsCsvTextExpanded] = React.useState(false);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [preview, setPreview] = React.useState<ImportPreviewResponse | null>(null);
  const [commitResult, setCommitResult] = React.useState<ImportCommitResponse | null>(null);
  const [corrections, setCorrections] = React.useState<Record<string, ProfileCorrection>>({});
  const [duplicateResolutions, setDuplicateResolutions] = React.useState<
    Record<string, DuplicateResolution | "pending">
  >({});
  const [relationshipDecisions, setRelationshipDecisions] = React.useState<
    Record<string, RelationshipDecision | "pending">
  >({});

  React.useEffect(() => {
    if (selectedClientCount > 0) {
      setImportMode("selected_clients");
    }
  }, [selectedClientCount]);

  const previewImport = useMutation(
    trpc.imports.preview.mutationOptions({
      onError: (error) => toast.error(error.message),
      onSuccess: (result) => {
        setPreview(result);
        setCommitResult(null);
        setCorrections({});
        setDuplicateResolutions({});
        setRelationshipDecisions({});
        setIsCsvTextExpanded(false);
        toast.success("Import preview ready.");
      },
    }),
  );
  const commitImport = useMutation(
    trpc.imports.commit.mutationOptions({
      onError: (error) => toast.error(error.message),
      onSuccess: (result) => {
        setCommitResult(result);
        toast.success("Import committed.");
      },
    }),
  );

  const allRows = React.useMemo(
    () => [...(preview?.acceptedProfileRows ?? []), ...(preview?.reviewRows ?? [])],
    [preview],
  );
  const duplicateCandidatesByItemId = React.useMemo(() => {
    const byItemId = new Map<string, DuplicateCandidate>();

    for (const candidate of preview?.duplicateCandidates ?? []) {
      byItemId.set(candidate.incomingReviewItemId, candidate);
    }

    return byItemId;
  }, [preview]);
  const relationshipSuggestionsByItemId = React.useMemo(() => {
    const byItemId = new Map<string, RelationshipSuggestion[]>();

    for (const suggestion of preview?.relationshipSuggestions ?? []) {
      const current = byItemId.get(suggestion.incomingReviewItemId) ?? [];
      current.push(suggestion);
      byItemId.set(suggestion.incomingReviewItemId, current);
    }

    return byItemId;
  }, [preview]);
  const highConfidenceMappedFields = React.useMemo(() => {
    const fields = new Set<string>();

    for (const column of preview?.columnMapping ?? []) {
      if (column.confidence === "high" && column.canonicalField) {
        fields.add(column.canonicalField);
      }
    }

    return fields;
  }, [preview]);
  const pendingDuplicateCount = preview
    ? preview.duplicateCandidates.filter(
        (candidate) => (duplicateResolutions[candidate.id] ?? "pending") === "pending",
      ).length
    : 0;
  const pendingRelationshipCount = preview
    ? preview.relationshipSuggestions.filter(
        (suggestion) => (relationshipDecisions[suggestion.id] ?? "pending") === "pending",
      ).length
    : 0;
  const commitImportDisabledReason = commitImport.isPending
    ? "Import commit is already running."
    : pendingDuplicateCount > 0 && pendingRelationshipCount > 0
      ? `Resolve ${pendingDuplicateCount} duplicate candidate${pendingDuplicateCount === 1 ? "" : "s"} and ${pendingRelationshipCount} relationship suggestion${pendingRelationshipCount === 1 ? "" : "s"} before committing.`
      : pendingDuplicateCount > 0
        ? `Resolve ${pendingDuplicateCount} duplicate candidate${pendingDuplicateCount === 1 ? "" : "s"} before committing.`
        : pendingRelationshipCount > 0
          ? `Resolve ${pendingRelationshipCount} relationship suggestion${pendingRelationshipCount === 1 ? "" : "s"} before committing.`
          : null;
  function updateCorrection(
    reviewItemId: string,
    patch: ProfileCorrection,
  ) {
    setCorrections((current) => ({
      ...current,
      [reviewItemId]: {
        ...current[reviewItemId],
        ...patch,
      },
    }));
  }

  function handlePreview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    previewImport.mutate({ sourceSystem, csvText });
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsCsvTextExpanded(false);
    setCsvText(await file.text());
  }

  function handleCommit() {
    if (!preview) return;

    commitImport.mutate({
      batchId: preview.batchId,
      rowCorrections: Object.entries(corrections).map(([reviewItemId, profile]) => ({
        reviewItemId,
        profile,
      })),
      duplicateResolutions: Object.entries(duplicateResolutions)
        .filter((entry): entry is [string, DuplicateResolution] => entry[1] !== "pending")
        .map(([duplicateCandidateId, resolution]) => ({
          duplicateCandidateId,
          resolution,
        })),
      relationshipSuggestionDecisions: Object.entries(relationshipDecisions)
        .filter((entry): entry is [string, RelationshipDecision] => entry[1] !== "pending")
        .map(([suggestionId, status]) => ({
          suggestionId,
          status,
        })),
    });
  }

  return (
    <main className="ddhq-page">
      <div className="ddhq-page-inner max-w-7xl gap-5 px-4">
        <section className="ddhq-page-header">
          <div className="max-w-3xl">
            <div className="ddhq-kicker">
              <FileText className="size-3.5" />
              Import review
            </div>
            <h1 className="ddhq-title">
              Import clients and tax profiles
            </h1>
            <p className="ddhq-copy">
              {importMode === "clients_and_profiles"
                ? "Upload one CSV where each row describes one filing profile. DueDateHQ creates or matches client relationships, creates filing profiles, and generates tasks only from Verified tax rules."
                : "Upload tax profile rows for the selected client context. Existing relationships stay in control while the import reviews filing profile fields and Verified rule task generation."}
            </p>
            {selectedClientCount > 0 ? (
              <StatusBadge tone="neutral">
                {selectedClientCount} selected client{selectedClientCount === 1 ? "" : "s"} from Tax Work
              </StatusBadge>
            ) : null}
          </div>
          <div className="grid min-w-64 gap-1 rounded-lg border border-ddhq-line bg-ddhq-paper-raised px-3 py-2 text-xs text-muted-foreground shadow-[0_1px_0_oklch(0.44_0.025_78/0.035)]">
            <span>{preview ? preview.detectedSourceProfile : "No preview yet"}</span>
            <span>{preview ? `${preview.mappingConfidence}% mapping confidence` : "Adapter idle"}</span>
          </div>
        </section>

        <ImportModeSelector
          mode={importMode}
          selectedClientCount={selectedClientCount}
          onChange={setImportMode}
        />

        <form
          className="grid gap-4 ddhq-panel-muted p-4"
          onSubmit={handlePreview}
        >
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold">Source file</h2>
            <p className="max-w-3xl text-xs leading-5 text-muted-foreground">
              Choose the originating system, upload the CSV, then preview the filing profiles before any workspace records change.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-[220px_1fr_auto] lg:items-end">
            <Field label="Source system" htmlFor="source-system">
              <Select
                value={sourceSystem}
                onValueChange={(value) => setSourceSystem((value ?? "taxdome") as SourceSystem)}
              >
                <SelectTrigger id="source-system" className={importSelectTriggerClassName}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={importSelectContentClassName}>
                  {sourceOptions.map((option) => (
                    <SelectItem className={importSelectItemClassName} key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="CSV file" htmlFor="csv-file">
              <CsvFileControl
                fileName={fileName}
                onChange={(event) => void handleFileChange(event)}
              />
            </Field>

            <Button
              type="submit"
              className="shadow-sm"
              disabled={previewImport.isPending || !csvText.trim()}
            >
              <FileCheck2 className="size-3.5" aria-hidden="true" />
              Preview import
            </Button>
          </div>

          <CsvSourceInput
            csvText={csvText}
            fileName={fileName}
            isExpanded={isCsvTextExpanded}
            previewReady={Boolean(preview)}
            onChange={(value) => {
              setCsvText(value);
              setFileName(null);
            }}
            onToggleExpanded={() => setIsCsvTextExpanded((current) => !current)}
          />
        </form>

        {preview ? (
          <>
            <section className="grid gap-1 rounded-lg border border-ddhq-line bg-ddhq-paper-muted/55 p-1 sm:grid-cols-2 lg:grid-cols-6">
              <Metric
                label="New clients"
                value={preview.summary.newClientRelationships}
                tone="neutral"
              />
              <Metric
                label="Matched clients"
                value={preview.summary.matchedClientRelationships}
                tone="verified"
              />
              <Metric label="Filing profiles" value={preview.summary.filingProfiles} tone="neutral" />
              <Metric
                label="Verified tasks"
                value={preview.summary.generatedVerifiedTasks}
                tone="verified"
              />
              <Metric label="Needs review" value={preview.summary.reviewProfiles} tone="review" />
              <Metric
                label="Relationships"
                value={preview.summary.relationshipSuggestions}
                tone="neutral"
              />
            </section>

            <section className="grid content-start gap-5">
              <ImportSourceMetadata fileName={fileName} preview={preview} />
              <MappingPreview preview={preview} />
              <ReviewRows
                columnMapping={preview.columnMapping}
                rows={allRows}
                corrections={corrections}
                duplicateCandidatesByItemId={duplicateCandidatesByItemId}
                duplicateResolutions={duplicateResolutions}
                highConfidenceMappedFields={highConfidenceMappedFields}
                relationshipDecisions={relationshipDecisions}
                relationshipSuggestionsByItemId={relationshipSuggestionsByItemId}
                onChange={updateCorrection}
                onDuplicateChange={(id, resolution) =>
                  setDuplicateResolutions((current) => ({
                    ...current,
                    [id]: resolution,
                  }))
                }
                onRelationshipChange={(id, decision) =>
                  setRelationshipDecisions((current) => ({
                    ...current,
                    [id]: decision,
                  }))
                }
              />
            </section>

            <section className="flex flex-col gap-3 ddhq-panel-muted p-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap gap-2">
                {pendingDuplicateCount > 0 ? (
                  <StatusBadge tone="review">{pendingDuplicateCount} duplicate pending</StatusBadge>
                ) : null}
                {pendingRelationshipCount > 0 ? (
                  <StatusBadge tone="review">
                    {pendingRelationshipCount} relationship pending
                  </StatusBadge>
                ) : null}
                {pendingDuplicateCount === 0 && pendingRelationshipCount === 0 ? (
                  <StatusBadge tone="verified">Review decisions complete</StatusBadge>
                ) : null}
              </div>
              <span
                className="group relative inline-flex"
                tabIndex={commitImportDisabledReason ? 0 : undefined}
                aria-describedby={commitImportDisabledReason ? "commit-import-disabled-reason" : undefined}
              >
                <Button
                  type="button"
                  disabled={Boolean(commitImportDisabledReason)}
                  onClick={handleCommit}
                >
                  <DatabaseZap className="size-3.5" aria-hidden="true" />
                  Commit import
                </Button>
                {commitImportDisabledReason ? (
                  <span
                    id="commit-import-disabled-reason"
                    role="tooltip"
                    className="pointer-events-none absolute bottom-full right-0 z-20 mb-2 w-72 rounded-[6px] border border-ddhq-line bg-popover px-2.5 py-2 text-left text-xs leading-5 text-popover-foreground opacity-0 shadow-[var(--ddhq-shadow-soft)] transition-opacity group-hover:opacity-100 group-focus:opacity-100"
                  >
                    {commitImportDisabledReason}
                  </span>
                ) : null}
              </span>
            </section>
          </>
        ) : null}

        {commitResult ? <CommitSummary result={commitResult} /> : null}
      </div>
    </main>
  );
}

function ImportModeSelector({
  mode,
  onChange,
  selectedClientCount,
}: {
  mode: ImportMode;
  onChange: (mode: ImportMode) => void;
  selectedClientCount: number;
}) {
  const options = [
    {
      value: "clients_and_profiles",
      label: "Clients and tax profiles",
      description: "Each row can create or match a client and create one filing profile.",
    },
    {
      value: "selected_clients",
      label: "Tax info for selected clients",
      description:
        selectedClientCount > 0
          ? `${selectedClientCount} selected client${selectedClientCount === 1 ? "" : "s"} will stay in context.`
          : "Select clients from Tax Work when the CSV should apply to existing relationships.",
    },
  ] as const satisfies readonly {
    value: ImportMode;
    label: string;
    description: string;
  }[];

  return (
    <section
      className="grid gap-1 rounded-lg border border-ddhq-line bg-ddhq-paper-muted/60 p-1 md:grid-cols-2"
      aria-label="Import mode"
    >
      {options.map((option) => {
        const isSelected = mode === option.value;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isSelected}
            className={`rounded-[6px] px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 ${
              isSelected
                ? "bg-ddhq-paper-raised text-foreground"
                : "text-muted-foreground hover:bg-ddhq-paper/70 hover:text-foreground"
            }`}
            onClick={() => onChange(option.value)}
          >
            <span className="block text-sm font-semibold">{option.label}</span>
            <span className="mt-1 block text-xs leading-5">{option.description}</span>
          </button>
        );
      })}
    </section>
  );
}

function CsvFileControl({
  fileName,
  onChange,
}: {
  fileName: string | null;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="relative">
      <input
        id="csv-file"
        type="file"
        accept=".csv,text/csv"
        aria-describedby={csvFileStatusId}
        className="peer sr-only"
        onChange={onChange}
      />
      <label
        htmlFor="csv-file"
        className={`${sourceInputClassName} flex cursor-pointer items-center justify-between gap-2 px-2.5 py-1 text-xs transition-colors peer-focus-visible:border-primary/35 peer-focus-visible:bg-ddhq-paper peer-focus-visible:ring-2 peer-focus-visible:ring-primary/20`}
      >
        <span
          id={csvFileStatusId}
          className={`truncate ${fileName ? "font-medium text-foreground" : "text-muted-foreground"}`}
          title={fileName ?? "Choose CSV file"}
        >
          {fileName ?? "Choose CSV file"}
        </span>
        <span className="shrink-0 font-medium text-primary">Browse</span>
      </label>
    </div>
  );
}

function CsvSourceInput({
  csvText,
  fileName,
  isExpanded,
  onChange,
  onToggleExpanded,
  previewReady,
}: {
  csvText: string;
  fileName: string | null;
  isExpanded: boolean;
  onChange: (value: string) => void;
  onToggleExpanded: () => void;
  previewReady: boolean;
}) {
  const lineCount = csvText.trim() ? csvText.split(/\r?\n/).length : 0;

  return (
    <div className="pt-1">
      <div className="flex flex-col gap-2 px-1 py-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <Label htmlFor={isExpanded ? csvTextControlId : undefined}>CSV text</Label>
          <div
            id={csvTextSummaryId}
            aria-live="polite"
            className="mt-0.5 flex flex-wrap gap-1.5 text-xs text-muted-foreground"
          >
            <span>{fileName ? `Loaded ${fileName}` : "Manual CSV text entry"}</span>
            <span>
              {lineCount > 0
                ? `${lineCount} CSV line${lineCount === 1 ? "" : "s"}`
                : "No CSV text loaded"}
            </span>
            {previewReady ? (
              <span>Input hidden after preview; row evidence below is the review surface.</span>
            ) : null}
          </div>
        </div>
        <Button
          type="button"
          size="xs"
          variant="ghost"
          className="self-start"
          aria-controls={csvTextRegionId}
          aria-describedby={csvTextSummaryId}
          aria-expanded={isExpanded}
          onClick={onToggleExpanded}
        >
          <FileText className="size-3" aria-hidden="true" />
          {isExpanded ? "Hide CSV text" : "Paste or edit CSV text"}
        </Button>
      </div>
      {isExpanded ? (
        <div id={csvTextRegionId} className="pt-2">
          <Textarea
            id={csvTextControlId}
            aria-describedby={csvTextSummaryId}
            className={`w-full resize-y rounded-[6px] border-transparent bg-ddhq-paper px-2.5 py-2 font-mono text-xs leading-5 shadow-none outline-none ring-1 ring-ddhq-line focus-visible:border-primary/35 focus-visible:ring-2 focus-visible:ring-primary/20 ${
              previewReady ? "min-h-16" : "min-h-28"
            }`}
            value={csvText}
            onChange={(event) => onChange(event.target.value)}
          />
        </div>
      ) : null}
    </div>
  );
}

function ImportSourceMetadata({
  fileName,
  preview,
}: {
  fileName: string | null;
  preview: ImportPreviewResponse;
}) {
  const metadata = [
    { label: "Source file", value: fileName ?? "Manual CSV text" },
    { label: "Detected profile", value: preview.detectedSourceProfile },
    { label: "Adapter", value: preview.adapterVersion },
    { label: "Rows", value: String(preview.headerDetection.totalRows) },
    {
      label: "Headers",
      value: preview.headerDetection.headerDetected ? "Detected" : "Needs review",
    },
    {
      label: "Columns",
      value: `${preview.recognizedFields.length} recognized, ${preview.unmappedColumns.length} unmapped`,
    },
  ] satisfies Array<{ label: string; value: string }>;

  return (
    <section className="grid gap-3 ddhq-panel p-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-semibold">Import source</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Review row-level evidence from the parsed CSV. The raw CSV text is not the approval record.
          </p>
        </div>
        <StatusBadge tone={preview.mappingConfidence >= 70 ? "verified" : "review"}>
          {preview.mappingConfidence}% mapping confidence
        </StatusBadge>
      </div>
      <div className="grid gap-x-4 gap-y-3 border-t border-ddhq-line pt-3 sm:grid-cols-2 lg:grid-cols-6">
        {metadata.map((item) => (
          <div key={item.label} className="min-w-0">
            <div className="text-[11px] font-semibold text-muted-foreground">{item.label}</div>
            <div className="mt-1 truncate text-xs font-medium" title={item.value}>
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MappingPreview({ preview }: { preview: ImportPreviewResponse }) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <section className="grid content-start gap-3 ddhq-panel p-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">Mapping preview</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {preview.headerDetection.headerDetected ? "Headers detected" : "Headers need review"} ·{" "}
            {preview.adapterVersion} · {preview.recognizedFields.length} recognized ·{" "}
            {preview.unmappedColumns.length} unmapped
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={preview.mappingConfidence >= 70 ? "verified" : "review"}>
            {preview.mappingConfidence}% confidence
          </StatusBadge>
          <Button
            type="button"
            size="xs"
            variant="outline"
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded((current) => !current)}
          >
            <ChevronDown
              className={`size-3.5 ${isExpanded ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
            {isExpanded ? "Hide mapping" : "View mapping"}
          </Button>
        </div>
      </div>

      {preview.validationMessages.length > 0 ? (
        <div className="grid gap-1 rounded-[6px] bg-ddhq-review-soft/80 p-3 text-xs text-ddhq-review ring-1 ring-ddhq-review/25">
          {preview.validationMessages.map((message) => (
            <div key={message} className="flex items-center gap-2">
              <AlertTriangle className="size-3.5" aria-hidden="true" />
              <span>{message}</span>
            </div>
          ))}
        </div>
      ) : null}

      {isExpanded ? (
        <div className="ddhq-table-shell">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-left text-xs">
              <thead className="border-b border-ddhq-line bg-ddhq-paper-muted/70 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Source column</th>
                  <th className="px-3 py-2 font-medium">Canonical field</th>
                  <th className="px-3 py-2 font-medium">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {preview.columnMapping.map((column) => (
                  <tr key={column.sourceColumn} className="border-b last:border-b-0">
                    <td className="px-3 py-2 font-medium">{column.sourceColumn}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {column.canonicalField ?? "Unmapped"}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge tone={column.confidence === "high" ? "verified" : "neutral"}>
                        {column.confidence}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ReviewRows({
  columnMapping,
  corrections,
  duplicateCandidatesByItemId,
  duplicateResolutions,
  highConfidenceMappedFields,
  onChange,
  onDuplicateChange,
  onRelationshipChange,
  relationshipDecisions,
  relationshipSuggestionsByItemId,
  rows,
}: {
  columnMapping: ColumnMapping;
  corrections: Record<string, ProfileCorrection>;
  duplicateCandidatesByItemId: ReadonlyMap<string, DuplicateCandidate>;
  duplicateResolutions: Record<string, DuplicateResolution | "pending">;
  highConfidenceMappedFields: ReadonlySet<string>;
  onChange: (reviewItemId: string, patch: ProfileCorrection) => void;
  onDuplicateChange: (id: string, resolution: DuplicateResolution | "pending") => void;
  onRelationshipChange: (id: string, decision: RelationshipDecision | "pending") => void;
  relationshipDecisions: Record<string, RelationshipDecision | "pending">;
  relationshipSuggestionsByItemId: ReadonlyMap<string, RelationshipSuggestion[]>;
  rows: ImportReviewRowResponse[];
}) {
  const [selectedRowIds, setSelectedRowIds] = React.useState<Set<string>>(new Set());
  const [comparisonRowId, setComparisonRowId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const rowIds = new Set(rows.map((row) => row.id));
    setSelectedRowIds((current) => new Set([...current].filter((id) => rowIds.has(id))));
    setComparisonRowId((current) => (current && rowIds.has(current) ? current : null));
  }, [rows]);

  const selectedRows = rows.filter((row) => selectedRowIds.has(row.id));
  const comparisonRow = rows.find((row) => row.id === comparisonRowId) ?? null;
  const comparisonDuplicateCandidate = comparisonRow
    ? (duplicateCandidatesByItemId.get(comparisonRow.id) ?? null)
    : null;
  const comparisonDuplicateResolution = comparisonDuplicateCandidate
    ? (duplicateResolutions[comparisonDuplicateCandidate.id] ?? "pending")
    : "pending";
  const comparisonRelationshipSuggestions = comparisonRow
    ? (relationshipSuggestionsByItemId.get(comparisonRow.id) ?? [])
    : [];
  const selectedRelationshipSuggestions = selectedRows.flatMap(
    (row) => relationshipSuggestionsByItemId.get(row.id) ?? [],
  );
  const selectedDuplicateCandidates = selectedRows
    .map((row) => duplicateCandidatesByItemId.get(row.id))
    .filter((candidate): candidate is DuplicateCandidate => Boolean(candidate));
  const allRowsSelected = rows.length > 0 && rows.every((row) => selectedRowIds.has(row.id));

  function toggleAllRows(checked: boolean) {
    setSelectedRowIds(checked ? new Set(rows.map((row) => row.id)) : new Set());
  }

  function toggleRow(rowId: string, checked: boolean) {
    setSelectedRowIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(rowId);
      } else {
        next.delete(rowId);
      }
      return next;
    });
  }

  function applyRelationshipDecision(decision: RelationshipDecision | "pending") {
    for (const suggestion of selectedRelationshipSuggestions) {
      onRelationshipChange(suggestion.id, decision);
    }
  }

  function applyDuplicateResolution(resolution: DuplicateResolution | "pending") {
    for (const candidate of selectedDuplicateCandidates) {
      onDuplicateChange(candidate.id, resolution);
    }
  }

  return (
    <section className="grid content-start gap-3">
      <div className="flex items-center gap-2">
            <Rows3 className="size-4 text-muted-foreground" aria-hidden="true" />
            <h2 className="text-base font-semibold">Filing profile review</h2>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 ddhq-panel-muted px-3 py-2">
        <div className="text-xs text-muted-foreground">
          {selectedRowIds.size} selected
          {selectedRelationshipSuggestions.length > 0
            ? ` · ${selectedRelationshipSuggestions.length} relationship suggestion${selectedRelationshipSuggestions.length === 1 ? "" : "s"}`
            : ""}
          {selectedDuplicateCandidates.length > 0
            ? ` · ${selectedDuplicateCandidates.length} duplicate candidate${selectedDuplicateCandidates.length === 1 ? "" : "s"}`
            : ""}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            size="xs"
            variant="outline"
            disabled={selectedRelationshipSuggestions.length === 0}
            onClick={() => applyRelationshipDecision("accepted")}
          >
            Accept relationships
          </Button>
          <Button
            type="button"
            size="xs"
            variant="outline"
            disabled={selectedRelationshipSuggestions.length === 0}
            onClick={() => applyRelationshipDecision("rejected")}
          >
            Reject relationships
          </Button>
          <Button
            type="button"
            size="xs"
            variant="outline"
            disabled={selectedDuplicateCandidates.length === 0}
            onClick={() => applyDuplicateResolution("create")}
          >
            Create new
          </Button>
          <Button
            type="button"
            size="xs"
            variant="outline"
            disabled={selectedDuplicateCandidates.length === 0}
            onClick={() => applyDuplicateResolution("update_existing")}
          >
            Update existing
          </Button>
          <Button
            type="button"
            size="xs"
            variant="outline"
            disabled={selectedDuplicateCandidates.length === 0}
            onClick={() => applyDuplicateResolution("skip")}
          >
            Skip duplicates
          </Button>
        </div>
      </div>

      <div className="ddhq-table-shell">
        <div className="max-h-[520px] min-h-[220px] overflow-auto lg:max-h-[calc(100vh-20rem)]">
          <table className="w-full min-w-[1420px] border-collapse text-left text-xs">
            <thead className="sticky top-0 z-10 border-b border-ddhq-line bg-ddhq-paper-muted text-muted-foreground">
              <tr>
                <th className="w-10 px-3 py-2 font-medium">
                  <Checkbox
                    aria-label="Select all review rows"
                    checked={allRowsSelected}
                    onCheckedChange={(checked) => toggleAllRows(checked === true)}
                  />
                </th>
                <th className="w-28 px-3 py-2 font-medium">
                  <MappedColumnHeader
                    canonicalField="sourceRowId"
                    highConfidenceMappedFields={highConfidenceMappedFields}
                    label="Row"
                  />
                </th>
                <th className="px-3 py-2 font-medium">
                  <MappedColumnHeader
                    canonicalField="clientName"
                    highConfidenceMappedFields={highConfidenceMappedFields}
                    label="Client"
                  />
                </th>
                <th className="px-3 py-2 font-medium">
                  <MappedColumnHeader
                    canonicalField="filingProfileName"
                    highConfidenceMappedFields={highConfidenceMappedFields}
                    label="Filing profile"
                  />
                </th>
                <th className="px-3 py-2 font-medium">
                  <MappedColumnHeader
                    canonicalField="entityType"
                    highConfidenceMappedFields={highConfidenceMappedFields}
                    label="Entity"
                  />
                </th>
                <th className="px-3 py-2 font-medium">
                  <MappedColumnHeader
                    canonicalField="state"
                    highConfidenceMappedFields={highConfidenceMappedFields}
                    label="States"
                  />
                </th>
                <th className="px-3 py-2 font-medium">
                  <MappedColumnHeader
                    canonicalField="ein"
                    highConfidenceMappedFields={highConfidenceMappedFields}
                    label="EIN"
                  />
                </th>
                <th className="px-3 py-2 font-medium">
                  <MappedColumnHeader
                    canonicalField="ssnLast4"
                    highConfidenceMappedFields={highConfidenceMappedFields}
                    label="SSN last 4"
                  />
                </th>
                <th className="w-72 px-3 py-2 font-medium">Review</th>
                <th className="w-72 px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
            {rows.map((row) => {
              const correction = corrections[row.id] ?? {};
              const duplicateCandidate = duplicateCandidatesByItemId.get(row.id) ?? null;
              const relationshipSuggestions = relationshipSuggestionsByItemId.get(row.id) ?? [];
              const isSelected = selectedRowIds.has(row.id);
              return (
                <tr
                  key={row.id}
                  className={`border-b border-ddhq-line align-top last:border-b-0 ${isSelected ? "bg-ddhq-accent-soft/36" : ""}`}
                >
                  <td className="px-3 py-3">
                    <Checkbox
                      aria-label={`Select import row ${row.sourceRowId}`}
                      checked={isSelected}
                      onCheckedChange={(checked) => toggleRow(row.id, checked === true)}
                    />
                  </td>
                  <td className="px-3 py-3 font-mono text-muted-foreground">
                    <div>{row.sourceRowId}</div>
                    <div className="mt-1 text-[11px] text-muted-foreground/75">
                      Source row {row.rowIndex}
                    </div>
                    {row.canonicalProfile.sourceClientId ? (
                      <div className="mt-1 text-[11px] text-muted-foreground/75">
                        {row.canonicalProfile.sourceClientId}
                      </div>
                    ) : null}
                    <InlineSourceEvidence
                      columnMapping={columnMapping}
                      correction={undefined}
                      field="sourceClientId"
                      row={row}
                    />
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      className="mt-2 font-sans"
                      onClick={() => setComparisonRowId(row.id)}
                    >
                      <Eye className="size-3" aria-hidden="true" />
                      Source
                    </Button>
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      aria-label={`Client name for source row ${row.sourceRowId}`}
                      className={reviewInputClassName}
                      value={correction.clientName ?? row.canonicalProfile.clientName ?? ""}
                      onChange={(event) => onChange(row.id, { clientName: event.target.value })}
                    />
                    <InlineSourceEvidence
                      columnMapping={columnMapping}
                      correction={correction.clientName}
                      field="clientName"
                      row={row}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      aria-label={`Filing profile for source row ${row.sourceRowId}`}
                      className={reviewInputClassName}
                      value={
                        correction.filingProfileName ??
                        row.canonicalProfile.filingProfileName ??
                        ""
                      }
                      onChange={(event) =>
                        onChange(row.id, { filingProfileName: event.target.value })
                      }
                    />
                    <InlineSourceEvidence
                      columnMapping={columnMapping}
                      correction={correction.filingProfileName}
                      field="filingProfileName"
                      row={row}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Select
                      value={correction.entityType ?? row.canonicalProfile.entityType ?? ""}
                      onValueChange={(value) =>
                        onChange(row.id, {
                          entityType: value
                            ? (value as EntityType)
                            : null,
                        })
                      }
                    >
                      <SelectTrigger
                        aria-label={`Entity type for source row ${row.sourceRowId}`}
                        className={importSelectTriggerClassName}
                      >
                        <SelectValue placeholder="Needs review" />
                      </SelectTrigger>
                      <SelectContent className={importSelectContentClassName}>
                        <SelectItem className={importSelectItemClassName} value="">
                          Needs review
                        </SelectItem>
                        {entityOptions.map((option) => (
                          <SelectItem className={importSelectItemClassName} key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <InlineSourceEvidence
                      columnMapping={columnMapping}
                      correction={correction.entityType}
                      field="entityType"
                      row={row}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      aria-label={`States for source row ${row.sourceRowId}`}
                      className={reviewInputClassName}
                      value={
                        correction.state ??
                        (row.canonicalProfile.states.join(";") ||
                          row.canonicalProfile.state ||
                          "")
                      }
                      onChange={(event) => onChange(row.id, { state: event.target.value })}
                    />
                    <InlineSourceEvidence
                      columnMapping={columnMapping}
                      correction={correction.state}
                      field="states"
                      row={row}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      aria-label={`EIN for source row ${row.sourceRowId}`}
                      className={reviewInputClassName}
                      value={correction.ein ?? row.canonicalProfile.ein ?? ""}
                      onChange={(event) => onChange(row.id, { ein: event.target.value })}
                    />
                    <InlineSourceEvidence
                      columnMapping={columnMapping}
                      correction={correction.ein}
                      field="ein"
                      row={row}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      aria-label={`SSN last four for source row ${row.sourceRowId}`}
                      className={reviewInputClassName}
                      value={correction.ssnLast4 ?? row.canonicalProfile.ssnLast4 ?? ""}
                      onChange={(event) => onChange(row.id, { ssnLast4: event.target.value })}
                    />
                    <InlineSourceEvidence
                      columnMapping={columnMapping}
                      correction={correction.ssnLast4}
                      field="ssnLast4"
                      row={row}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <ReviewSummaryCell
                      candidate={duplicateCandidate}
                      decisions={relationshipDecisions}
                      problems={row.problemTypes}
                      suggestions={relationshipSuggestions}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <ReviewActionsCell
                      candidate={duplicateCandidate}
                      decisions={relationshipDecisions}
                      onDuplicateChange={onDuplicateChange}
                      onRelationshipChange={onRelationshipChange}
                      problems={row.problemTypes}
                      resolution={
                        duplicateCandidate
                          ? (duplicateResolutions[duplicateCandidate.id] ?? "pending")
                          : "pending"
                      }
                      suggestions={relationshipSuggestions}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
      <SourceComparisonSheet
        columnMapping={columnMapping}
        duplicateCandidate={comparisonDuplicateCandidate}
        duplicateResolution={comparisonDuplicateResolution}
        relationshipDecisions={relationshipDecisions}
        relationshipSuggestions={comparisonRelationshipSuggestions}
        row={comparisonRow}
        onClose={() => setComparisonRowId(null)}
      />
    </section>
  );
}

function MappedColumnHeader({
  canonicalField,
  highConfidenceMappedFields,
  label,
}: {
  canonicalField: string;
  highConfidenceMappedFields: ReadonlySet<string>;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {label}
      {highConfidenceMappedFields.has(canonicalField) ? (
        <StatusBadge tone="verified">Confident</StatusBadge>
      ) : null}
    </span>
  );
}

function InlineSourceEvidence({
  columnMapping,
  correction,
  field,
  row,
}: {
  columnMapping: ColumnMapping;
  correction: string | null | undefined;
  field: EvidenceFieldKey;
  row: ImportReviewRowResponse;
}) {
  const sourceEvidence = findSourceEvidence(row, columnMapping, field);
  const canonicalValue = getCanonicalFieldValue(row, field);
  const edited =
    correction !== undefined && normalizeCompareValue(correction) !== normalizeCompareValue(canonicalValue);
  const showInlineBadges = edited || sourceEvidence.length === 0;

  return (
    <div className="mt-1 grid min-h-10 gap-1 text-[11px] leading-4 text-muted-foreground">
      {showInlineBadges ? (
        <div className="flex flex-wrap items-center gap-1">
          {edited ? <StatusBadge tone="review">Edited</StatusBadge> : null}
          {sourceEvidence.length === 0 ? <StatusBadge tone="review">Unmapped</StatusBadge> : null}
        </div>
      ) : null}
      <div className="break-words">
        {sourceEvidence.length > 0
          ? sourceEvidence
              .map(
                (evidence) =>
                  `${evidence.sourceColumn}: ${formatNullableValue(evidence.value)}`,
              )
              .join(" | ")
          : "No source column mapped"}
      </div>
      {edited ? (
        <div className="flex items-center gap-1 text-ddhq-review">
          <PencilLine className="size-3" aria-hidden="true" />
          <span>Original save value: {formatNullableValue(canonicalValue)}</span>
        </div>
      ) : null}
    </div>
  );
}

function SourceComparisonSheet({
  columnMapping,
  duplicateCandidate,
  duplicateResolution,
  relationshipDecisions,
  relationshipSuggestions,
  row,
  onClose,
}: {
  columnMapping: ColumnMapping;
  duplicateCandidate: DuplicateCandidate | null;
  duplicateResolution: DuplicateResolution | "pending";
  relationshipDecisions: Record<string, RelationshipDecision | "pending">;
  relationshipSuggestions: RelationshipSuggestion[];
  row: ImportReviewRowResponse | null;
  onClose: () => void;
}) {
  return (
    <Sheet
      open={Boolean(row)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="!w-[min(100vw,760px)] !max-w-[760px] p-0 sm:!w-[min(48vw,760px)] sm:!max-w-[760px]"
      >
        <SheetTitle className="sr-only">Source row comparison</SheetTitle>
        {row ? (
          <SourceComparisonContent
            columnMapping={columnMapping}
            duplicateCandidate={duplicateCandidate}
            duplicateResolution={duplicateResolution}
            relationshipDecisions={relationshipDecisions}
            relationshipSuggestions={relationshipSuggestions}
            row={row}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function SourceComparisonContent({
  columnMapping,
  duplicateCandidate,
  duplicateResolution,
  relationshipDecisions,
  relationshipSuggestions,
  row,
}: {
  columnMapping: ColumnMapping;
  duplicateCandidate: DuplicateCandidate | null;
  duplicateResolution: DuplicateResolution | "pending";
  relationshipDecisions: Record<string, RelationshipDecision | "pending">;
  relationshipSuggestions: RelationshipSuggestion[];
  row: ImportReviewRowResponse;
}) {
  const mappedSourceFields = getSourceFieldEntries(row, columnMapping, "mapped");
  const unmappedSourceFields = getSourceFieldEntries(row, columnMapping, "unmapped");
  const canonicalRows = createCanonicalRows(row);

  return (
    <>
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-start justify-between gap-3 pr-10">
          <div>
            <div className="text-xs font-semibold text-muted-foreground">
              Source row comparison
            </div>
            <h2 className="mt-1 text-base font-semibold">
              {row.canonicalProfile.clientName || row.sourceRowId}
            </h2>
            <div className="mt-1 flex flex-wrap gap-1.5 font-mono text-[11px] text-muted-foreground">
              <span>sourceRowId {row.sourceRowId}</span>
              <span>row {row.rowIndex}</span>
              <span>{row.status.replaceAll("_", " ")}</span>
            </div>
          </div>
          <StatusBadge tone={row.problemTypes.length > 0 ? "review" : "verified"}>
            {row.problemTypes.length > 0 ? "Review evidence" : "Ready evidence"}
          </StatusBadge>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <section className="border-b border-border p-4">
          <div className="mb-2 flex items-center gap-2">
            <GitCompareArrows className="size-4 text-muted-foreground" aria-hidden="true" />
            <h3 className="text-sm font-semibold">DueDateHQ profile to save</h3>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {canonicalRows.map((item) => (
              <EvidenceValue key={item.label} label={item.label} value={item.value} mono={item.mono} />
            ))}
          </div>
        </section>

        <section className="grid gap-4 border-b border-border p-4 lg:grid-cols-2">
          <SourceFieldList
            fields={mappedSourceFields}
            title="Mapped source fields"
            tone="mapped"
          />
          <SourceFieldList
            fields={unmappedSourceFields}
            title="Unmapped source fields"
            tone="unmapped"
          />
        </section>

        <section className="grid gap-4 border-b border-border p-4">
          <div>
            <h3 className="text-sm font-semibold">Review messages</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {row.problemTypes.length > 0 ? (
                row.problemTypes.map((problem) => (
                  <StatusBadge key={problem} tone="review">
                    {formatProblem(problem)}
                  </StatusBadge>
                ))
              ) : (
                <StatusBadge tone="verified">No row problems</StatusBadge>
              )}
            </div>
          </div>
          {row.messages.length > 0 ? (
            <div className="grid gap-1.5 text-xs leading-5 text-muted-foreground">
              {row.messages.map((message) => (
                <div key={message} className="rounded-[6px] bg-muted/35 px-2.5 py-2">
                  {message}
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <DuplicateComparison candidate={duplicateCandidate} resolution={duplicateResolution} />
        <RelationshipComparison
          decisions={relationshipDecisions}
          suggestions={relationshipSuggestions}
        />
      </div>
    </>
  );
}

function SourceFieldList({
  fields,
  title,
  tone,
}: {
  fields: SourceFieldEntry[];
  title: string;
  tone: "mapped" | "unmapped";
}) {
  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <StatusBadge tone={tone === "mapped" ? "verified" : "review"}>
          {fields.length}
        </StatusBadge>
      </div>
      <div className="max-h-72 overflow-auto rounded-[6px] bg-ddhq-paper/80 ring-1 ring-ddhq-line">
        {fields.length > 0 ? (
          <div className="divide-y">
            {fields.map((field) => (
              <div key={field.sourceColumn} className="grid gap-1 px-2.5 py-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium">{field.sourceColumn}</span>
                  {field.canonicalField ? (
                    <StatusBadge tone={field.confidence === "high" ? "verified" : "review"}>
                      {formatCanonicalField(field.canonicalField)}
                    </StatusBadge>
                  ) : (
                    <StatusBadge tone="review">Unmapped</StatusBadge>
                  )}
                </div>
                <div className="break-words font-mono text-[11px] text-muted-foreground">
                  {formatNullableValue(field.value)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-2.5 py-2 text-xs text-muted-foreground">None</div>
        )}
      </div>
    </div>
  );
}

function DuplicateComparison({
  candidate,
  resolution,
}: {
  candidate: DuplicateCandidate | null;
  resolution: DuplicateResolution | "pending";
}) {
  if (!candidate) return null;

  const differingFields = Object.entries(candidate.differingFields);

  return (
    <section className="grid gap-3 border-b border-border p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold">Duplicate candidate</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Incoming source row compared with the existing DueDateHQ client relationship.
          </p>
        </div>
        <StatusBadge tone={resolution === "pending" ? "review" : "verified"}>
          {resolutionLabel(resolution)}
        </StatusBadge>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {candidate.matchedFields.map((field) => (
          <StatusBadge key={field} tone="neutral">
            Match: {formatCanonicalField(field)}
          </StatusBadge>
        ))}
      </div>
      {differingFields.length > 0 ? (
        <div className="ddhq-table-shell rounded-[6px]">
          <table className="w-full min-w-[520px] border-collapse text-left text-xs">
            <thead className="border-b border-ddhq-line bg-ddhq-paper-muted/70 text-muted-foreground">
              <tr>
                <th className="px-2.5 py-2 font-medium">Field</th>
                <th className="px-2.5 py-2 font-medium">Incoming row</th>
                <th className="px-2.5 py-2 font-medium">Existing client</th>
              </tr>
            </thead>
            <tbody>
              {differingFields.map(([field, values]) => (
                <tr key={field} className="border-b last:border-b-0">
                  <td className="px-2.5 py-2 font-medium">{formatCanonicalField(field)}</td>
                  <td className="px-2.5 py-2 font-mono text-muted-foreground">
                    {formatNullableValue(values.incoming)}
                  </td>
                  <td className="px-2.5 py-2 font-mono text-muted-foreground">
                    {formatNullableValue(values.existing)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-[6px] bg-ddhq-paper-muted/45 px-2.5 py-2 text-xs text-muted-foreground">
          No differing fields were reported for this candidate.
        </div>
      )}
    </section>
  );
}

function RelationshipComparison({
  decisions,
  suggestions,
}: {
  decisions: Record<string, RelationshipDecision | "pending">;
  suggestions: RelationshipSuggestion[];
}) {
  if (suggestions.length === 0) return null;

  return (
    <section className="grid gap-3 border-b border-border p-4">
      <div>
        <h3 className="text-sm font-semibold">Relationship suggestions</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          These remain explicit CPA decisions. DueDateHQ will not merge relationships automatically.
        </p>
      </div>
      <div className="grid gap-2">
        {suggestions.map((suggestion) => {
          const decision = decisions[suggestion.id] ?? "pending";

          return (
            <div key={suggestion.id} className="rounded-[6px] bg-ddhq-paper-muted/45 px-2.5 py-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <StatusBadge tone={decision === "pending" ? "review" : "verified"}>
                  {decisionLabel(decision)}
                </StatusBadge>
                <span className="font-medium">
                  {suggestion.suggestedAction.replaceAll("_", " ")}
                </span>
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{suggestion.reason}</p>
              {suggestion.suggestedClientRelationshipId ? (
                <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                  existing relationship {suggestion.suggestedClientRelationshipId}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function EvidenceValue({
  label,
  mono,
  value,
}: {
  label: string;
  mono?: boolean;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-[6px] bg-ddhq-paper-muted/45 px-2.5 py-2">
      <div className="text-[11px] font-semibold text-muted-foreground">{label}</div>
      <div className={`mt-1 break-words text-xs ${mono ? "font-mono" : "font-medium"}`}>
        {formatNullableValue(value)}
      </div>
    </div>
  );
}

function ReviewSummaryCell({
  candidate,
  decisions,
  problems,
  suggestions,
}: {
  candidate: DuplicateCandidate | null;
  decisions: Record<string, RelationshipDecision | "pending">;
  problems: string[];
  suggestions: RelationshipSuggestion[];
}) {
  const hasReviewItems = problems.length > 0 || candidate || suggestions.length > 0;
  const differingFields = candidate ? Object.entries(candidate.differingFields) : [];

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-1.5">
        {problems.length > 0 ? (
          problems.map((problem) => (
            <StatusBadge key={problem} tone="review">
              {formatProblem(problem)}
            </StatusBadge>
          ))
        ) : hasReviewItems ? (
          <StatusBadge tone="review">Review required</StatusBadge>
        ) : (
          <StatusBadge tone="verified">Ready</StatusBadge>
        )}
      </div>

      {hasReviewItems ? (
        <div className="grid gap-1.5">
          {candidate ? (
            <div className="grid gap-1">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-foreground">Likely duplicate</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {candidate.matchedFields.map((field) => (
                    <StatusBadge key={field} tone="neutral">
                      {field}
                    </StatusBadge>
                  ))}
                </div>
                {differingFields.length > 0 ? (
                  <div className="mt-1 grid gap-1 text-[11px] leading-4 text-muted-foreground">
                    {differingFields.slice(0, 2).map(([field, values]) => (
                      <div
                        key={field}
                        className="truncate"
                        title={`${values.incoming ?? "Empty"} -> ${values.existing ?? "Empty"}`}
                      >
                        {formatCanonicalField(field)}: incoming{" "}
                        {formatNullableValue(values.incoming)} / existing{" "}
                        {formatNullableValue(values.existing)}
                      </div>
                    ))}
                    {differingFields.length > 2 ? (
                      <div>{differingFields.length - 2} more differences in source drawer</div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {suggestions.map((suggestion) => {
            const activeDecision = decisions[suggestion.id] ?? "pending";

            return (
              <div
                key={suggestion.id}
                className="grid gap-1"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-foreground">
                      Linked relationship
                    </span>
                    <StatusBadge tone={activeDecision === "accepted" ? "verified" : "review"}>
                      {decisionLabel(activeDecision)}
                    </StatusBadge>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground" title={suggestion.reason}>
                    CPA confirmation required before commit.
                  </p>
                </div>
              </div>
            );
          })}
          {!candidate && suggestions.length === 0 && problems.length > 0 ? (
            <div className="text-xs leading-5 text-muted-foreground">
              Edit the profile fields in this row before commit.
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ReviewActionsCell({
  candidate,
  decisions,
  onDuplicateChange,
  onRelationshipChange,
  problems,
  resolution,
  suggestions,
}: {
  candidate: DuplicateCandidate | null;
  decisions: Record<string, RelationshipDecision | "pending">;
  onDuplicateChange: (id: string, resolution: DuplicateResolution | "pending") => void;
  onRelationshipChange: (id: string, decision: RelationshipDecision | "pending") => void;
  problems: string[];
  resolution: DuplicateResolution | "pending";
  suggestions: RelationshipSuggestion[];
}) {
  const hasReviewItems = problems.length > 0 || candidate || suggestions.length > 0;

  if (!hasReviewItems) {
    return <span className="text-xs text-muted-foreground">No action</span>;
  }

  return (
    <div className="grid gap-2">
      {candidate ? (
        <div className="grid gap-1">
          <div className="text-[11px] font-semibold text-muted-foreground">Duplicate</div>
          <Select
            value={resolution}
            onValueChange={(value) =>
              onDuplicateChange(
                candidate.id,
                (value ?? "pending") as DuplicateResolution | "pending",
              )
            }
          >
            <SelectTrigger
              aria-label="Duplicate candidate resolution"
              className={importSelectTriggerClassName}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={importSelectContentClassName}>
              <SelectItem className={importSelectItemClassName} value="pending">
                Pending
              </SelectItem>
              <SelectItem className={importSelectItemClassName} value="create">
                Create new
              </SelectItem>
              <SelectItem className={importSelectItemClassName} value="update_existing">
                Update existing
              </SelectItem>
              <SelectItem className={importSelectItemClassName} value="skip">
                Skip row
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {suggestions.map((suggestion) => {
        const activeDecision = decisions[suggestion.id] ?? "pending";

        return (
          <div key={suggestion.id} className="grid gap-1">
            <div className="text-[11px] font-semibold text-muted-foreground">Relationship</div>
            <div className="grid grid-cols-3 gap-1.5">
              {(["pending", "accepted", "rejected"] as const).map((decision) => (
                <Button
                  key={decision}
                  type="button"
                  size="xs"
                  className="min-w-16 px-2.5"
                  variant={activeDecision === decision ? "default" : "outline"}
                  onClick={() => onRelationshipChange(suggestion.id, decision)}
                >
                  {decisionLabel(decision)}
                </Button>
              ))}
            </div>
          </div>
        );
      })}

      {!candidate && suggestions.length === 0 && problems.length > 0 ? (
        <span className="text-xs leading-5 text-muted-foreground">Edit fields in row</span>
      ) : null}
    </div>
  );
}

function CommitSummary({ result }: { result: ImportCommitResponse }) {
  return (
    <section className="grid gap-4 border-t pt-5">
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-4 text-ddhq-verified" aria-hidden="true" />
        <h2 className="text-base font-semibold">Commit summary</h2>
      </div>
      <p className="max-w-4xl text-sm leading-6 text-muted-foreground">{result.summary}</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Created clients" value={result.createdClientRelationshipCount} tone="neutral" />
        <Metric label="Matched clients" value={result.matchedClientRelationshipCount} tone="verified" />
        <Metric label="Profiles" value={result.createdFilingProfileCount} tone="neutral" />
        <Metric label="Verified tasks" value={result.createdVerifiedTaskCount} tone="verified" />
        <Metric label="Profile review" value={result.profileReviewItemCount} tone="review" />
      </div>
      {result.profileResults.length > 0 ? (
        <div className="ddhq-table-shell">
          <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
            <h3 className="text-sm font-semibold">Imported clients and tax profiles</h3>
            <Link
              to="/tax-work"
              search={{ clientIds: undefined }}
              className="text-xs font-medium text-primary underline-offset-2 hover:underline"
            >
              Return to Tax Work
            </Link>
          </div>
          <div className="divide-y">
            {result.profileResults.slice(0, 8).map((profile) => (
              <div
                key={profile.reviewItemId}
                className="grid gap-2 px-3 py-2 text-xs sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <Link
                    to="/clients/$clientId"
                    params={{ clientId: profile.clientRelationshipId }}
                    className="font-medium text-foreground underline-offset-2 hover:text-primary hover:underline"
                  >
                    {profile.clientName}
                  </Link>
                  <div className="mt-0.5 text-muted-foreground">
                    {profile.generatedVerifiedTaskCount} verified task
                    {profile.generatedVerifiedTaskCount === 1 ? "" : "s"} generated
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {profile.coverageGapObligations.length > 0 ? (
                    <StatusBadge tone="neutral">
                      {profile.coverageGapObligations.length} coverage gap
                    </StatusBadge>
                  ) : null}
                  {profile.needsReviewObligations.length > 0 ? (
                    <StatusBadge tone="review">
                      {profile.needsReviewObligations.length} needs review
                    </StatusBadge>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Field({
  children,
  htmlFor,
  label,
}: {
  children: React.ReactNode;
  htmlFor: string;
  label: string;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

type Tone = "neutral" | "verified" | "review";

function Metric({ label, tone, value }: { label: string; tone: Tone; value: number }) {
  return (
    <div className="rounded-[6px] px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-xl font-semibold">{value}</span>
        <StatusDot tone={tone} />
      </div>
    </div>
  );
}

function StatusBadge({ children, tone }: { children: React.ReactNode; tone: Tone }) {
  const className =
    tone === "verified"
      ? "bg-ddhq-verified-soft text-ddhq-verified"
      : tone === "review"
        ? "bg-ddhq-review-soft text-ddhq-review"
        : "bg-ddhq-gap-soft/75 text-ddhq-gap";

  return (
    <span className={`inline-flex items-center rounded-[6px] px-1.5 py-0.5 text-[11px] font-semibold ${className}`}>
      {children}
    </span>
  );
}

function StatusDot({ tone }: { tone: Tone }) {
  const className =
    tone === "verified"
      ? "bg-ddhq-verified"
      : tone === "review"
        ? "bg-ddhq-review"
        : "bg-ddhq-gap";

  return <span className={`size-1.5 rounded-full ${className}`} aria-hidden="true" />;
}

function formatProblem(problem: string) {
  return problem.replaceAll("_", " ");
}

function decisionLabel(decision: RelationshipDecision | "pending") {
  if (decision === "accepted") return "Accept";
  if (decision === "rejected") return "Reject";
  return "Pending";
}

function resolutionLabel(resolution: DuplicateResolution | "pending") {
  if (resolution === "create") return "Create new";
  if (resolution === "update_existing") return "Update existing";
  if (resolution === "skip") return "Skip row";
  return "Pending";
}

function findSourceEvidence(
  row: ImportReviewRowResponse,
  columnMapping: ColumnMapping,
  field: EvidenceFieldKey,
): SourceFieldEntry[] {
  const aliases: readonly string[] = evidenceFieldAliases[field];

  return getSourceFieldEntries(row, columnMapping, "mapped").filter(
    (entry) => entry.canonicalField !== null && aliases.includes(entry.canonicalField),
  );
}

function getSourceFieldEntries(
  row: ImportReviewRowResponse,
  columnMapping: ColumnMapping,
  mode: "mapped" | "unmapped",
): SourceFieldEntry[] {
  const mappingBySourceColumn = new Map(columnMapping.map((column) => [column.sourceColumn, column]));

  return Object.entries(row.sourceFields)
    .map(([sourceColumn, value]) => {
      const mapping = mappingBySourceColumn.get(sourceColumn);

      return {
        sourceColumn,
        value,
        canonicalField: mapping?.canonicalField ?? null,
        confidence: mapping?.confidence ?? null,
      };
    })
    .filter((entry) =>
      mode === "mapped" ? entry.canonicalField !== null : entry.canonicalField === null,
    );
}

function createCanonicalRows(row: ImportReviewRowResponse): Array<{
  label: string;
  value: string;
  mono?: boolean;
}> {
  return [
    { label: "Client name", value: getCanonicalFieldValue(row, "clientName") },
    { label: "Filing profile", value: getCanonicalFieldValue(row, "filingProfileName") },
    { label: "Entity type", value: formatEntityType(row.canonicalProfile.entityType) },
    { label: "States", value: getCanonicalFieldValue(row, "states") },
    { label: "EIN", value: getCanonicalFieldValue(row, "ein"), mono: true },
    { label: "SSN last four", value: getCanonicalFieldValue(row, "ssnLast4"), mono: true },
    { label: "Source client id", value: getCanonicalFieldValue(row, "sourceClientId"), mono: true },
    { label: "Source row id", value: row.sourceRowId, mono: true },
  ];
}

function getCanonicalFieldValue(row: ImportReviewRowResponse, field: EvidenceFieldKey) {
  const profile = row.canonicalProfile;

  if (field === "clientName") return profile.clientName ?? "";
  if (field === "filingProfileName") return profile.filingProfileName ?? "";
  if (field === "entityType") return profile.entityType ?? "";
  if (field === "states") return profile.states.join("; ") || profile.state || "";
  if (field === "ein") return profile.ein ?? "";
  if (field === "ssnLast4") return profile.ssnLast4 ?? "";
  return profile.sourceClientId ?? "";
}

function formatEntityType(entityType: EntityType | null) {
  return entityOptions.find((option) => option.value === entityType)?.label ?? entityType ?? "";
}

function formatCanonicalField(field: string) {
  const fieldLabels: Record<string, string> = {
    clientName: "Client name",
    ein: "EIN",
    ssnLast4: "SSN last four",
    state: "State",
    states: "States",
    entityType: "Entity type",
    county: "County",
    fiscalYearType: "Fiscal year",
    sourceClientId: "Source client id",
    sourceRowId: "Source row id",
    filingProfileName: "Filing profile",
    relationshipName: "Relationship",
    email: "Email",
    phone: "Phone",
  };

  return fieldLabels[field] ?? field.replaceAll("_", " ");
}

function formatNullableValue(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : "Empty";
}

function normalizeCompareValue(value: string | null | undefined) {
  return value?.trim() ?? "";
}
