import { Button } from "@due-date-hq/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, History, ShieldAlert, ShieldCheck, X } from "lucide-react";

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

  if (!taskId) return null;

  return (
    <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-[#ded8ce] bg-white text-[#241f1a] shadow-xl">
      <div className="flex items-center justify-between border-b border-[#e7e2da] px-4 py-3">
        <div>
          <div className="text-xs font-semibold text-[#6f685f]">Evidence</div>
          <h2 className="text-base font-semibold">Deadline evidence</h2>
        </div>
        <Button type="button" variant="outline" size="icon-sm" aria-label="Close evidence" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>

      {evidence.isPending ? (
        <div className="space-y-3 p-4">
          <div className="h-16 animate-pulse border border-[#ded8ce] bg-[#f6f3ee]" />
          <div className="h-40 animate-pulse border border-[#ded8ce] bg-[#f6f3ee]" />
        </div>
      ) : evidence.isError ? (
        <div className="m-4 border border-[#e2afa1] bg-[#fff1ed] p-3 text-sm text-[#9b3321]">
          Evidence could not be loaded.
        </div>
      ) : (
        <EvidenceContent evidence={evidence.data} />
      )}
    </aside>
  );
}

function EvidenceContent({ evidence }: { evidence: TaskEvidenceResponse }) {
  return (
    <div className="min-h-0 flex-1 overflow-auto p-4">
      <section className="border-b border-[#e7e2da] pb-4">
        <div className="text-sm font-semibold">{evidence.task.title}</div>
        <div className="mt-1 text-xs text-[#6f685f]">
          {evidence.clientRelationship.displayName} / {evidence.filingProfile.displayName}
        </div>
        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
          <EvidenceField label="Current official due date" value={formatDate(evidence.task.currentDueDate)} />
          <EvidenceField
            label="Original due date"
            value={evidence.task.originalDueDate ? formatDate(evidence.task.originalDueDate) : "None recorded"}
          />
          <EvidenceField
            label="Firm target date"
            value={evidence.task.firmTargetDate ? formatDate(evidence.task.firmTargetDate) : "None"}
          />
          <EvidenceField label="Work status" value={evidence.task.status} />
        </div>
      </section>

      <section className="border-b border-[#e7e2da] py-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          {evidence.rule?.verificationStatus === "verified" ? (
            <ShieldCheck className="size-4 text-[#287347]" />
          ) : (
            <ShieldAlert className="size-4 text-[#806218]" />
          )}
          Source evidence
        </div>
        {evidence.rule ? (
          <div className="space-y-3 text-xs">
            <StatusLine label="Verification" value={evidence.rule.verificationStatus} />
            <p className="leading-5 text-[#6f685f]">{evidence.rule.ruleSummary}</p>
            <div className="grid gap-2">
              <EvidenceField label="Source name" value={evidence.rule.sourceName ?? "None"} />
              {evidence.rule.sourceUrl ? (
                <a
                  className="inline-flex items-center gap-1 font-medium text-[#176b86]"
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
              />
              <EvidenceField
                label="Source last checked"
                value={
                  evidence.rule.sourceLastCheckedAt
                    ? formatDateTime(evidence.rule.sourceLastCheckedAt)
                    : "Not checked"
                }
              />
              <EvidenceField
                label="Source last changed"
                value={
                  evidence.rule.sourceLastChangedAt
                    ? formatDateTime(evidence.rule.sourceLastChangedAt)
                    : "No change recorded"
                }
              />
              <EvidenceField label="Rule version" value={`v${evidence.rule.currentVersion}`} />
              <EvidenceField
                label="Previous rule version"
                value={
                  evidence.rule.previousVersion ? `v${evidence.rule.previousVersion}` : "None recorded"
                }
              />
            </div>
          </div>
        ) : (
          <div className="border border-[#ddd6cb] bg-[#f6f3ee] p-3 text-xs text-[#655e55]">
            {evidence.task.userProvidedSourceNote ?? "User provided, not verified by DueDateHQ."}
          </div>
        )}
      </section>

      <section className="py-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <History className="size-4" />
          Date event history
        </div>
        {evidence.dateEvents.length === 0 ? (
          <div className="border border-[#ddd6cb] bg-[#f6f3ee] p-3 text-xs text-[#655e55]">
            No date events recorded.
          </div>
        ) : (
          <ol className="space-y-3">
            {evidence.dateEvents.map((event) => (
              <li key={event.id} className="border border-[#ded8ce] p-3 text-xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="font-semibold">{event.eventType}</div>
                  <div className="text-right text-[#6f685f]">{formatDateTime(event.createdAt)}</div>
                </div>
                <div className="mt-2 grid gap-1 text-[#6f685f]">
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
                  {event.sourceUrl ? (
                    <a
                      className="inline-flex items-center gap-1 font-medium text-[#176b86]"
                      href={event.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {event.sourceUrl}
                      <ExternalLink className="size-3" />
                    </a>
                  ) : null}
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

function EvidenceField({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <span className="text-[#6f685f]">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function StatusLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border border-[#ddd6cb] bg-[#f6f3ee] px-2 py-1.5">
      <span className="text-[#6f685f]">{label}</span>
      <span className="font-semibold">{value}</span>
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
