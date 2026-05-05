import { Button } from "@due-date-hq/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@due-date-hq/ui/components/sheet";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, History, ShieldAlert, ShieldCheck } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { trpc } from "@/utils/trpc";

import type { TaskEvidenceResponse } from "@due-date-hq/api/routers/tasks";

export function EvidenceDrawer({
  onClose,
  taskId,
}: {
  onClose: () => void;
  taskId: string | null;
}) {
  const evidence = useQuery({
    ...trpc.tasks.getEvidence.queryOptions({ taskId: taskId ?? "__none__" }),
    enabled: Boolean(taskId),
  });

  return (
    <Sheet open={Boolean(taskId)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-full max-w-xl p-0 sm:max-w-xl">
        <SheetTitle className="sr-only">Deadline evidence</SheetTitle>

        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <div className="text-xs font-semibold text-muted-foreground">Evidence</div>
            <h2 className="text-base font-semibold">Deadline evidence</h2>
          </div>
        </div>

        {evidence.isPending ? (
          <div className="space-y-3 p-4">
            <div className="h-16 animate-pulse rounded-lg border border-border bg-muted" />
            <div className="h-40 animate-pulse rounded-lg border border-border bg-muted" />
          </div>
        ) : evidence.isError ? (
          <div className="m-4 rounded-lg border border-ddhq-risk/30 bg-ddhq-risk-soft p-3 text-sm text-ddhq-risk">
            Evidence could not be loaded.
          </div>
        ) : (
          <EvidenceContent evidence={evidence.data} />
        )}
      </SheetContent>
    </Sheet>
  );
}

function EvidenceContent({ evidence }: { evidence: TaskEvidenceResponse }) {
  return (
    <div className="min-h-0 flex-1 overflow-auto p-4">
      <section className="border-b border-border pb-4">
        <div className="text-sm font-semibold">{evidence.task.title}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {evidence.clientRelationship.displayName} / {evidence.filingProfile.displayName}
        </div>
        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
          <OfficialDateField
            label={
              evidence.task.sourceType === "entered_deadline"
                ? "Current due date"
                : "Current official due date"
            }
            tone="current"
            value={formatDate(evidence.task.currentDueDate)}
          />
          <OfficialDateField
            label="Original due date"
            tone="original"
            value={
              evidence.task.originalDueDate
                ? formatDate(evidence.task.originalDueDate)
                : "None recorded"
            }
          />
          <EvidenceField
            label="Firm target date"
            value={evidence.task.firmTargetDate ? formatDate(evidence.task.firmTargetDate) : "None"}
          />
          <EvidenceStatusField label="Work status" status={evidence.task.status} />
        </div>
      </section>

      <section className="border-b border-border py-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          {evidence.rule?.verificationStatus === "verified" ? (
            <ShieldCheck className="size-4 text-ddhq-verified" />
          ) : (
            <ShieldAlert className="size-4 text-ddhq-review" />
          )}
          {evidence.task.sourceType === "entered_deadline" ? "Reference" : "Source evidence"}
        </div>
        {evidence.rule ? (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted px-2 py-1.5">
              <span className="text-muted-foreground">Verification</span>
              <StatusBadge
                status={
                  evidence.rule.verificationStatus === "verified"
                    ? "verified"
                    : evidence.rule.verificationStatus === "source_changed"
                      ? "source_changed"
                      : "needs_review"
                }
              />
            </div>
            <p className="leading-5 text-muted-foreground">{evidence.rule.ruleSummary}</p>
            <div className="grid gap-2">
              <EvidenceField label="Source name" value={evidence.rule.sourceName ?? "None"} />
              {evidence.rule.sourceUrl ? (
                <a
                  className="inline-flex items-center gap-1 font-mono text-xs font-medium text-primary"
                  href={evidence.rule.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {evidence.rule.sourceUrl}
                  <ExternalLink className="size-3" />
                </a>
              ) : null}
              <EvidenceField
                label="Last verified"
                value={evidence.rule.lastVerifiedAt ? formatDateTime(evidence.rule.lastVerifiedAt) : "Not verified"}
                mono
              />
              <EvidenceField
                label="Source last checked"
                value={
                  evidence.rule.sourceLastCheckedAt
                    ? formatDateTime(evidence.rule.sourceLastCheckedAt)
                    : "Not checked"
                }
                mono
              />
              <EvidenceField
                label="Source last changed"
                value={
                  evidence.rule.sourceLastChangedAt
                    ? formatDateTime(evidence.rule.sourceLastChangedAt)
                    : "No change recorded"
                }
                mono
              />
              <EvidenceField label="Rule version" value={`v${evidence.rule.currentVersion}`} mono />
            </div>
          </div>
        ) : (
          <div className="grid gap-2 rounded-lg border border-border bg-muted p-3 text-xs text-muted-foreground">
            <StatusBadge status="entered_deadline">Entered deadline</StatusBadge>
            <div>Not verified by DueDateHQ</div>
            <EvidenceField
              label="Reference"
              value={evidence.task.enteredDeadlineReferenceNote ?? "No reference recorded."}
            />
          </div>
        )}
      </section>

      <section className="py-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <History className="size-4" />
          Date event history
        </div>
        {evidence.dateEvents.length === 0 ? (
          <div className="rounded-lg border border-border bg-muted p-3 text-xs text-muted-foreground">
            No date events recorded.
          </div>
        ) : (
          <ol className="space-y-3">
            {evidence.dateEvents.map((event) => (
              <li key={event.id} className="rounded-lg border border-border p-3 text-xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="font-semibold">{event.eventType}</div>
                  <div className="text-right font-mono text-muted-foreground">{formatDateTime(event.createdAt)}</div>
                </div>
                <div className="mt-2 grid gap-1 text-muted-foreground">
                  {event.previousCurrentDueDate || event.newCurrentDueDate ? (
                    <span>
                      Official due date: {event.previousCurrentDueDate ?? "None"} to{" "}
                      {event.newCurrentDueDate ?? "None"}
                    </span>
                  ) : null}
                  {event.previousFirmTargetDate || event.newFirmTargetDate ? (
                    <span>
                      Firm target date: {event.previousFirmTargetDate ?? "None"} to{" "}
                      {event.newFirmTargetDate ?? "None"}
                    </span>
                  ) : null}
                  {event.sourceName ? <span>Source: {event.sourceName}</span> : null}
                  {event.notes ? <span>{event.notes}</span> : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function EvidenceField({ label, mono, value }: { label: string; mono?: boolean; value: string }) {
  return (
    <div className="grid gap-1">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

function OfficialDateField({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "current" | "original";
  value: string;
}) {
  const toneClass =
    tone === "current"
      ? "border-ddhq-review/35 bg-ddhq-review-soft/55 text-ddhq-review"
      : "border-ddhq-gap/30 bg-ddhq-gap-soft/55 text-ddhq-gap";

  return (
    <div className={`grid gap-1.5 rounded-lg border px-2.5 py-2 ${toneClass}`}>
      <span className="text-[11px] font-semibold text-foreground/70">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

function EvidenceStatusField({
  label,
  status,
}: {
  label: string;
  status: TaskEvidenceResponse["task"]["status"];
}) {
  return (
    <div className="grid content-start gap-1">
      <span className="text-muted-foreground">{label}</span>
      <StatusBadge status={status} />
    </div>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00.000Z`));
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
