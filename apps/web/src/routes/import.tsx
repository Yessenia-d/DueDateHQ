import type {
  ImportCommitResponse,
  ImportPreviewResponse,
  ImportReviewRowResponse,
} from "@due-date-hq/api/routers/imports";
import { Button } from "@due-date-hq/ui/components/button";
import { Input } from "@due-date-hq/ui/components/input";
import { Label } from "@due-date-hq/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@due-date-hq/ui/components/select";
import { useMutation } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  ChevronDown,
  DatabaseZap,
  FileCheck2,
  Rows3,
  ShieldCheck,
  Upload,
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

type ProfileCorrection = {
  clientName?: string;
  ein?: string | null;
  ssnLast4?: string | null;
  state?: string | null;
  entityType?: EntityType | null;
  county?: string | null;
  fiscalYearType?: "calendar_year" | "fiscal_year" | null;
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

const importSelectTriggerClassName = "h-8 w-full rounded-[6px] bg-background";
const importSelectContentClassName = "rounded-lg py-1";
const importSelectItemClassName = "mx-1 rounded-[4px]";

function ImportComponent() {
  const search = Route.useSearch();
  const [sourceSystem, setSourceSystem] = React.useState<SourceSystem>("taxdome");
  const [csvText, setCsvText] = React.useState("");
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

  const previewImport = useMutation(
    trpc.imports.preview.mutationOptions({
      onError: (error) => toast.error(error.message),
      onSuccess: (result) => {
        setPreview(result);
        setCommitResult(null);
        setCorrections({});
        setDuplicateResolutions({});
        setRelationshipDecisions({});
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
  const selectedClientCount =
    search.clientIds?.split(",").filter((clientId) => clientId.trim()).length ?? 0;

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
    <main className="min-h-0 overflow-auto">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6">
        <section className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div className="max-w-3xl">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
              <Upload className="size-3.5" />
              Tax Work
            </div>
            <h1 className="text-2xl font-semibold tracking-normal">
              Import tax info
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Preview source-specific tax information, resolve profile review items, then commit
              only the filing profiles and deadline inputs that are ready.
            </p>
            {selectedClientCount > 0 ? (
              <StatusBadge tone="neutral">
                {selectedClientCount} selected client{selectedClientCount === 1 ? "" : "s"} from Tax Work
              </StatusBadge>
            ) : null}
          </div>
          <div className="grid min-w-64 gap-1 text-xs text-muted-foreground">
            <span>{preview ? preview.detectedSourceProfile : "No preview yet"}</span>
            <span>{preview ? `${preview.mappingConfidence}% mapping confidence` : "Adapter idle"}</span>
          </div>
        </section>

        <form className="grid gap-4 rounded-lg border bg-muted/20 p-4" onSubmit={handlePreview}>
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
              <Input
                id="csv-file"
                type="file"
                accept=".csv,text/csv"
                className="rounded-[6px]"
                onChange={(event) => void handleFileChange(event)}
              />
            </Field>

            <Button type="submit" disabled={previewImport.isPending || !csvText.trim()}>
              <FileCheck2 className="size-3.5" />
              Preview import
            </Button>
          </div>

          <Field label={fileName ? `Loaded ${fileName}` : "CSV text"} htmlFor="csv-text">
            <textarea
              id="csv-text"
              className="min-h-28 w-full resize-y rounded-[6px] border border-input bg-background px-2.5 py-2 font-mono text-xs leading-5 outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
              value={csvText}
              onChange={(event) => {
                setCsvText(event.target.value);
                setFileName(null);
              }}
            />
          </Field>
        </form>

        {preview ? (
          <>
            <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <Metric label="Rows" value={preview.summary.totalRows} tone="neutral" />
              <Metric label="Ready profiles" value={preview.summary.readyProfiles} tone="verified" />
              <Metric label="Needs review" value={preview.summary.reviewProfiles} tone="review" />
              <Metric label="Duplicates" value={preview.summary.duplicateCandidates} tone="review" />
              <Metric
                label="Relationships"
                value={preview.summary.relationshipSuggestions}
                tone="neutral"
              />
            </section>

            <section className="grid content-start gap-5">
              <MappingPreview preview={preview} />
              <ReviewRows
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

            <section className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3 md:flex-row md:items-center md:justify-between">
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
                  <DatabaseZap className="size-3.5" />
                  Commit import
                </Button>
                {commitImportDisabledReason ? (
                  <span
                    id="commit-import-disabled-reason"
                    role="tooltip"
                    className="pointer-events-none absolute bottom-full right-0 z-20 mb-2 w-72 rounded-[6px] border border-border bg-popover px-2.5 py-2 text-left text-xs leading-5 text-popover-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus:opacity-100"
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

function MappingPreview({ preview }: { preview: ImportPreviewResponse }) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <section className="grid content-start gap-3 rounded-lg border bg-muted/20 p-3">
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
            <ChevronDown className={`size-3.5 ${isExpanded ? "rotate-180" : ""}`} />
            {isExpanded ? "Hide mapping" : "View mapping"}
          </Button>
        </div>
      </div>

      {preview.validationMessages.length > 0 ? (
        <div className="grid gap-1 rounded-[6px] border border-amber-600/25 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
          {preview.validationMessages.map((message) => (
            <div key={message} className="flex items-center gap-2">
              <AlertTriangle className="size-3.5" />
              <span>{message}</span>
            </div>
          ))}
        </div>
      ) : null}

      {isExpanded ? (
        <div className="overflow-hidden rounded-lg border bg-background">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-left text-xs">
              <thead className="border-b bg-muted/40 text-muted-foreground">
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
  return (
    <section className="grid content-start gap-3">
      <div className="flex items-center gap-2">
        <Rows3 className="size-4 text-muted-foreground" />
        <h2 className="text-base font-semibold">Filing profile review</h2>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1320px] border-collapse text-left text-xs">
            <thead className="border-b bg-muted/40 text-muted-foreground">
              <tr>
                <th className="w-28 px-3 py-2 font-medium">Row</th>
                <th className="px-3 py-2 font-medium">Client</th>
                <th className="px-3 py-2 font-medium">Entity</th>
                <th className="px-3 py-2 font-medium">State</th>
                <th className="px-3 py-2 font-medium">EIN</th>
                <th className="px-3 py-2 font-medium">SSN last 4</th>
                <th className="px-3 py-2 font-medium">Problems</th>
                <th className="w-44 px-3 py-2 font-medium">Duplicate</th>
                <th className="w-72 px-3 py-2 font-medium">Relationship</th>
              </tr>
            </thead>
            <tbody>
            {rows.map((row) => {
              const correction = corrections[row.id] ?? {};
              const duplicateCandidate = duplicateCandidatesByItemId.get(row.id) ?? null;
              const relationshipSuggestions = relationshipSuggestionsByItemId.get(row.id) ?? [];
              return (
                <tr key={row.id} className="border-b align-top last:border-b-0">
                  <td className={`px-3 py-3 font-mono text-muted-foreground ${mappedCellClass("sourceRowId", highConfidenceMappedFields)}`}>
                    {row.sourceRowId}
                  </td>
                  <td className={`px-3 py-2 ${mappedCellClass("clientName", highConfidenceMappedFields)}`}>
                    <Input
                      className="rounded-[6px]"
                      value={correction.clientName ?? row.canonicalProfile.clientName ?? ""}
                      onChange={(event) => onChange(row.id, { clientName: event.target.value })}
                    />
                  </td>
                  <td className={`px-3 py-2 ${mappedCellClass("entityType", highConfidenceMappedFields)}`}>
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
                        className={`h-8 w-full rounded-[6px] ${mappedControlClass("entityType", highConfidenceMappedFields)}`}
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
                  </td>
                  <td className={`px-3 py-2 ${mappedCellClass("state", highConfidenceMappedFields)}`}>
                    <Input
                      className="rounded-[6px]"
                      value={correction.state ?? row.canonicalProfile.state ?? ""}
                      onChange={(event) => onChange(row.id, { state: event.target.value })}
                    />
                  </td>
                  <td className={`px-3 py-2 ${mappedCellClass("ein", highConfidenceMappedFields)}`}>
                    <Input
                      className="rounded-[6px]"
                      value={correction.ein ?? row.canonicalProfile.ein ?? ""}
                      onChange={(event) => onChange(row.id, { ein: event.target.value })}
                    />
                  </td>
                  <td className={`px-3 py-2 ${mappedCellClass("ssnLast4", highConfidenceMappedFields)}`}>
                    <Input
                      className="rounded-[6px]"
                      value={correction.ssnLast4 ?? row.canonicalProfile.ssnLast4 ?? ""}
                      onChange={(event) => onChange(row.id, { ssnLast4: event.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1.5">
                      {row.problemTypes.length > 0 ? (
                        row.problemTypes.map((problem) => (
                          <StatusBadge key={problem} tone="review">
                            {formatProblem(problem)}
                          </StatusBadge>
                        ))
                      ) : (
                        <StatusBadge tone="verified">Ready</StatusBadge>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <DuplicateDecisionCell
                      candidate={duplicateCandidate}
                      onChange={onDuplicateChange}
                      resolution={
                        duplicateCandidate
                          ? (duplicateResolutions[duplicateCandidate.id] ?? "pending")
                          : "pending"
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <RelationshipDecisionCell
                      decisions={relationshipDecisions}
                      onChange={onRelationshipChange}
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
    </section>
  );
}

function mappedCellClass(canonicalField: string, highConfidenceMappedFields: ReadonlySet<string>) {
  return highConfidenceMappedFields.has(canonicalField)
    ? "bg-emerald-500/5"
    : "";
}

function mappedControlClass(canonicalField: string, highConfidenceMappedFields: ReadonlySet<string>) {
  return highConfidenceMappedFields.has(canonicalField)
    ? "bg-transparent"
    : "bg-background";
}

function DuplicateDecisionCell({
  candidate,
  onChange,
  resolution,
}: {
  candidate: DuplicateCandidate | null;
  onChange: (id: string, resolution: DuplicateResolution | "pending") => void;
  resolution: DuplicateResolution | "pending";
}) {
  if (!candidate) {
    return <span className="text-xs text-muted-foreground">No duplicate</span>;
  }

  return (
    <div className="grid gap-1.5">
      <div className="flex flex-wrap gap-1.5">
        {candidate.matchedFields.map((field) => (
          <StatusBadge key={field} tone="neutral">
            {field}
          </StatusBadge>
        ))}
      </div>
      <Select
        value={resolution}
        onValueChange={(value) =>
          onChange(candidate.id, (value ?? "pending") as DuplicateResolution | "pending")
        }
      >
        <SelectTrigger className={importSelectTriggerClassName}>
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
  );
}

function RelationshipDecisionCell({
  decisions,
  onChange,
  suggestions,
}: {
  decisions: Record<string, RelationshipDecision | "pending">;
  onChange: (id: string, decision: RelationshipDecision | "pending") => void;
  suggestions: RelationshipSuggestion[];
}) {
  if (suggestions.length === 0) {
    return <span className="text-xs text-muted-foreground">No suggestion</span>;
  }

  return (
    <div className="grid gap-2">
      {suggestions.map((suggestion) => (
        <div key={suggestion.id} className="grid gap-1.5">
          <p className="text-xs leading-5 text-muted-foreground">{suggestion.reason}</p>
          <div className="grid grid-cols-3 gap-1">
            {(["pending", "accepted", "rejected"] as const).map((decision) => (
              <Button
                key={decision}
                type="button"
                size="xs"
                variant={(decisions[suggestion.id] ?? "pending") === decision ? "default" : "outline"}
                onClick={() => onChange(suggestion.id, decision)}
              >
                {decisionLabel(decision)}
              </Button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function CommitSummary({ result }: { result: ImportCommitResponse }) {
  return (
    <section className="grid gap-4 border-t pt-5">
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-4 text-emerald-600" />
        <h2 className="text-base font-semibold">Commit summary</h2>
      </div>
      <p className="max-w-4xl text-sm leading-6 text-muted-foreground">{result.summary}</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Ready profiles" value={result.readyProfileCount} tone="verified" />
        <Metric label="Clients" value={result.createdClientRelationshipCount} tone="neutral" />
        <Metric label="Verified tasks" value={result.createdVerifiedTaskCount} tone="verified" />
        <Metric label="Profile review" value={result.profileReviewItemCount} tone="review" />
        <Metric label="Coverage gaps" value={result.coverageGapCount} tone="neutral" />
      </div>
      {result.profileResults.length > 0 ? (
        <div className="overflow-hidden rounded-lg border bg-muted/20">
          <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
            <h3 className="text-sm font-semibold">Imported tax info</h3>
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
    <div className="rounded-lg border bg-muted/20 px-3 py-2">
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
      ? "border-emerald-600/30 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/30 dark:text-emerald-300"
      : tone === "review"
        ? "border-amber-600/30 bg-amber-500/10 text-amber-700 dark:border-amber-400/30 dark:text-amber-300"
        : "border-slate-500/30 bg-slate-400/10 text-slate-600 dark:border-slate-400/30 dark:text-slate-300";

  return (
    <span className={`inline-flex items-center rounded-[6px] border px-1.5 py-0.5 text-[11px] font-semibold ${className}`}>
      {children}
    </span>
  );
}

function StatusDot({ tone }: { tone: Tone }) {
  const className =
    tone === "verified"
      ? "bg-emerald-500"
      : tone === "review"
        ? "bg-amber-500"
        : "bg-slate-400";

  return <span className={`size-1.5 rounded-full ${className}`} />;
}

function formatProblem(problem: string) {
  return problem.replaceAll("_", " ");
}

function decisionLabel(decision: RelationshipDecision | "pending") {
  if (decision === "accepted") return "Accept";
  if (decision === "rejected") return "Reject";
  return "Pending";
}
