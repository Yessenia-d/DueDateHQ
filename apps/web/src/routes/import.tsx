import type {
  ImportCommitResponse,
  ImportPreviewResponse,
  ImportReviewRowResponse,
} from "@due-date-hq/api/routers/imports";
import { Button } from "@due-date-hq/ui/components/button";
import { Input } from "@due-date-hq/ui/components/input";
import { Label } from "@due-date-hq/ui/components/label";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  DatabaseZap,
  FileCheck2,
  GitMerge,
  Rows3,
  ShieldCheck,
  Upload,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/import")({
  component: ImportComponent,
});

type SourceSystem = ImportPreviewResponse["sourceSystem"];
type EntityType = NonNullable<ImportReviewRowResponse["canonicalProfile"]["entityType"]>;
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

function ImportComponent() {
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
  const hasPendingReviewDecisions = pendingDuplicateCount > 0 || pendingRelationshipCount > 0;

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
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6">
        <section className="grid gap-4 border-b pb-5 md:grid-cols-[1fr_auto] md:items-end">
          <div className="max-w-3xl">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
              <Upload className="size-3.5" />
              CSV import
            </div>
            <h1 className="text-2xl font-semibold tracking-normal">
              Import filing profiles
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Preview source-specific client data, resolve profile review items, then commit
              only the client relationships and tax profiles that are ready.
            </p>
          </div>
          <div className="grid min-w-64 gap-1 text-xs text-muted-foreground">
            <span>{preview ? preview.detectedSourceProfile : "No preview yet"}</span>
            <span>{preview ? `${preview.mappingConfidence}% mapping confidence` : "Adapter idle"}</span>
          </div>
        </section>

        <form className="grid gap-4 border-b pb-5" onSubmit={handlePreview}>
          <div className="grid gap-4 lg:grid-cols-[220px_1fr_auto] lg:items-end">
            <Field label="Source system" htmlFor="source-system">
              <select
                id="source-system"
                className="h-8 w-full border border-input bg-background px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
                value={sourceSystem}
                onChange={(event) => setSourceSystem(event.target.value as SourceSystem)}
              >
                {sourceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="CSV file" htmlFor="csv-file">
              <Input
                id="csv-file"
                type="file"
                accept=".csv,text/csv"
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
              className="min-h-28 w-full resize-y border border-input bg-background px-2.5 py-2 font-mono text-xs leading-5 outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
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
            <section className="grid gap-2 border-b pb-3 sm:grid-cols-2 lg:grid-cols-5">
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

            <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="grid gap-5">
                <MappingPreview preview={preview} />
                <ReviewRows
                  rows={allRows}
                  corrections={corrections}
                  onChange={updateCorrection}
                />
              </div>

              <aside className="grid content-start gap-5">
                <ProblemGroups preview={preview} />
                <DuplicateReview
                  preview={preview}
                  resolutions={duplicateResolutions}
                  onChange={(id, resolution) =>
                    setDuplicateResolutions((current) => ({
                      ...current,
                      [id]: resolution,
                    }))
                  }
                />
                <RelationshipReview
                  preview={preview}
                  decisions={relationshipDecisions}
                  onChange={(id, decision) =>
                    setRelationshipDecisions((current) => ({
                      ...current,
                      [id]: decision,
                    }))
                  }
                />
              </aside>
            </section>

            <section className="flex flex-col gap-3 border-t pt-4 md:flex-row md:items-center md:justify-between">
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
              <Button
                type="button"
                disabled={commitImport.isPending || hasPendingReviewDecisions}
                onClick={handleCommit}
              >
                <DatabaseZap className="size-3.5" />
                Commit import
              </Button>
            </section>
          </>
        ) : null}

        {commitResult ? <CommitSummary result={commitResult} /> : null}
      </div>
    </main>
  );
}

function MappingPreview({ preview }: { preview: ImportPreviewResponse }) {
  return (
    <section className="grid gap-3 border-b pb-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Mapping preview</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {preview.headerDetection.headerDetected ? "Headers detected" : "Headers need review"} ·{" "}
            {preview.adapterVersion}
          </p>
        </div>
        <StatusBadge tone={preview.mappingConfidence >= 70 ? "verified" : "review"}>
          {preview.mappingConfidence}% confidence
        </StatusBadge>
      </div>

      {preview.validationMessages.length > 0 ? (
        <div className="grid gap-1 border border-amber-600/25 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
          {preview.validationMessages.map((message) => (
            <div key={message} className="flex items-center gap-2">
              <AlertTriangle className="size-3.5" />
              <span>{message}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="overflow-x-auto border">
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
    </section>
  );
}

function ReviewRows({
  corrections,
  onChange,
  rows,
}: {
  corrections: Record<string, ProfileCorrection>;
  onChange: (reviewItemId: string, patch: ProfileCorrection) => void;
  rows: ImportReviewRowResponse[];
}) {
  return (
    <section className="grid gap-3 border-b pb-5">
      <div className="flex items-center gap-2">
        <Rows3 className="size-4 text-muted-foreground" />
        <h2 className="text-base font-semibold">Filing profile review</h2>
      </div>

      <div className="overflow-x-auto border">
        <table className="w-full min-w-[980px] border-collapse text-left text-xs">
          <thead className="border-b bg-muted/40 text-muted-foreground">
            <tr>
              <th className="w-28 px-3 py-2 font-medium">Row</th>
              <th className="px-3 py-2 font-medium">Client</th>
              <th className="px-3 py-2 font-medium">Entity</th>
              <th className="px-3 py-2 font-medium">State</th>
              <th className="px-3 py-2 font-medium">EIN</th>
              <th className="px-3 py-2 font-medium">SSN last 4</th>
              <th className="px-3 py-2 font-medium">Problems</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const correction = corrections[row.id] ?? {};
              return (
                <tr key={row.id} className="border-b align-top last:border-b-0">
                  <td className="px-3 py-3 font-mono text-muted-foreground">
                    {row.sourceRowId}
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={correction.clientName ?? row.canonicalProfile.clientName ?? ""}
                      onChange={(event) => onChange(row.id, { clientName: event.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      className="h-8 w-full border border-input bg-background px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
                      value={correction.entityType ?? row.canonicalProfile.entityType ?? ""}
                      onChange={(event) =>
                        onChange(row.id, {
                          entityType: event.target.value
                            ? (event.target.value as EntityType)
                            : null,
                        })
                      }
                    >
                      <option value="">Needs review</option>
                      {entityOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={correction.state ?? row.canonicalProfile.state ?? ""}
                      onChange={(event) => onChange(row.id, { state: event.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={correction.ein ?? row.canonicalProfile.ein ?? ""}
                      onChange={(event) => onChange(row.id, { ein: event.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ProblemGroups({ preview }: { preview: ImportPreviewResponse }) {
  return (
    <section className="grid gap-3 border-b pb-5">
      <h2 className="text-base font-semibold">Problem groups</h2>
      {preview.reviewGroups.length === 0 ? (
        <StatusBadge tone="verified">No grouped review issues</StatusBadge>
      ) : (
        <div className="grid gap-2">
          {preview.reviewGroups.map((group) => (
            <div key={group.problemType} className="border bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">{group.label}</span>
                <StatusBadge tone="review">{group.count}</StatusBadge>
              </div>
              <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
                {group.profiles.slice(0, 4).map((profile) => (
                  <span key={profile.reviewItemId}>
                    {profile.clientName ?? profile.sourceRowId}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function DuplicateReview({
  onChange,
  preview,
  resolutions,
}: {
  preview: ImportPreviewResponse;
  resolutions: Record<string, DuplicateResolution | "pending">;
  onChange: (id: string, resolution: DuplicateResolution | "pending") => void;
}) {
  return (
    <section className="grid gap-3 border-b pb-5">
      <div className="flex items-center gap-2">
        <GitMerge className="size-4 text-muted-foreground" />
        <h2 className="text-base font-semibold">Duplicate review</h2>
      </div>
      {preview.duplicateCandidates.length === 0 ? (
        <StatusBadge tone="verified">No likely duplicates</StatusBadge>
      ) : (
        <div className="grid gap-2">
          {preview.duplicateCandidates.map((candidate) => (
            <div key={candidate.id} className="grid gap-2 border bg-muted/20 p-3">
              <div className="font-mono text-xs text-muted-foreground">
                {candidate.incomingReviewItemId}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {candidate.matchedFields.map((field) => (
                  <StatusBadge key={field} tone="neutral">
                    {field}
                  </StatusBadge>
                ))}
              </div>
              <select
                className="h-8 border border-input bg-background px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
                value={resolutions[candidate.id] ?? "pending"}
                onChange={(event) =>
                  onChange(candidate.id, event.target.value as DuplicateResolution | "pending")
                }
              >
                <option value="pending">Pending</option>
                <option value="create">Create new</option>
                <option value="update_existing">Update existing</option>
                <option value="skip">Skip row</option>
              </select>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function RelationshipReview({
  decisions,
  onChange,
  preview,
}: {
  preview: ImportPreviewResponse;
  decisions: Record<string, RelationshipDecision | "pending">;
  onChange: (id: string, decision: RelationshipDecision | "pending") => void;
}) {
  return (
    <section className="grid gap-3 border-b pb-5">
      <h2 className="text-base font-semibold">Relationship suggestions</h2>
      {preview.relationshipSuggestions.length === 0 ? (
        <StatusBadge tone="verified">No relationship suggestions</StatusBadge>
      ) : (
        <div className="grid gap-2">
          {preview.relationshipSuggestions.map((suggestion) => (
            <div key={suggestion.id} className="grid gap-2 border bg-muted/20 p-3">
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
      )}
    </section>
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
    <div className="border bg-muted/20 px-3 py-2">
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
    <span className={`inline-flex items-center border px-1.5 py-0.5 text-[11px] font-semibold ${className}`}>
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

  return <span className={`size-1.5 ${className}`} />;
}

function formatProblem(problem: string) {
  return problem.replaceAll("_", " ");
}

function decisionLabel(decision: RelationshipDecision | "pending") {
  if (decision === "accepted") return "Accept";
  if (decision === "rejected") return "Reject";
  return "Pending";
}
