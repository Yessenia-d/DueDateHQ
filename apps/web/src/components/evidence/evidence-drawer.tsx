import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@due-date-hq/ui/components/sheet";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, ExternalLink, History, ShieldAlert, ShieldCheck } from "lucide-react";
import * as React from "react";

import { StatusBadge } from "@/components/status-badge";
import { formatDate, formatDateTime } from "@/utils/date-format";
import { trpc } from "@/utils/trpc";

import type { TaskEvidenceResponse } from "@due-date-hq/api/routers/tasks";

const detailTabs = [
  { id: "activity", label: "Activity" },
  { id: "due-date-history", label: "Due date history" },
  { id: "evidence", label: "Evidence" },
] as const;

type DetailTab = (typeof detailTabs)[number]["id"];

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
      <SheetContent
        side="right"
        className="!w-[min(100vw,720px)] !max-w-[720px] p-0 sm:!w-[min(42vw,720px)] sm:!max-w-[720px]"
      >
        <SheetTitle className="sr-only">Deadline detail</SheetTitle>

        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-base font-semibold">Deadline detail</h2>
          </div>
        </div>

        {evidence.isPending ? (
          <div className="space-y-3 p-4">
            <div className="h-16 animate-pulse rounded-lg border border-border bg-muted" />
            <div className="h-40 animate-pulse rounded-lg border border-border bg-muted" />
          </div>
        ) : evidence.isError ? (
          <div className="m-4 rounded-lg border border-ddhq-risk/30 bg-ddhq-risk-soft p-3 text-sm text-ddhq-risk">
            Deadline detail could not be loaded.
          </div>
        ) : (
          <EvidenceContent evidence={evidence.data} />
        )}
      </SheetContent>
    </Sheet>
  );
}

function EvidenceContent({ evidence }: { evidence: TaskEvidenceResponse }) {
  const [activeTab, setActiveTab] = React.useState<DetailTab>("activity");
  const tabBaseId = React.useId();
  const activityItems = React.useMemo(() => createActivityItems(evidence), [evidence]);
  const dateHistoryItems = React.useMemo(() => createDateHistoryItems(evidence), [evidence]);

  React.useEffect(() => {
    setActiveTab("activity");
  }, [evidence.task.id]);

  function handleTabKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const currentIndex = detailTabs.findIndex((tab) => tab.id === activeTab);
    const lastIndex = detailTabs.length - 1;
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight") {
      nextIndex = currentIndex === lastIndex ? 0 : currentIndex + 1;
    } else if (event.key === "ArrowLeft") {
      nextIndex = currentIndex === 0 ? lastIndex : currentIndex - 1;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = lastIndex;
    }

    if (nextIndex === null) {
      return;
    }

    event.preventDefault();
    const nextTab = detailTabs[nextIndex];
    if (!nextTab) {
      return;
    }

    setActiveTab(nextTab.id);
    requestAnimationFrame(() => {
      document.getElementById(getTabId(tabBaseId, nextTab.id))?.focus();
    });
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <section className="p-4">
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

      <div className="sticky top-0 z-10 border-b border-border bg-popover px-4">
        <div
          role="tablist"
          aria-label="Deadline detail sections"
          className="flex min-h-10 items-end gap-4"
          onKeyDown={handleTabKeyDown}
        >
          {detailTabs.map((tab) => (
            <button
              key={tab.id}
              id={getTabId(tabBaseId, tab.id)}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={getPanelId(tabBaseId, tab.id)}
              tabIndex={activeTab === tab.id ? 0 : -1}
              className={`relative inline-flex h-10 min-w-0 items-center border-b-2 px-0.5 text-xs font-semibold leading-none outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/45 focus-visible:ring-offset-2 focus-visible:ring-offset-popover ${
                activeTab === tab.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="truncate">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        <DetailTabPanel baseId={tabBaseId} activeTab={activeTab} tabId="activity">
          <HistorySection
            emptyLabel="No activity recorded."
            icon={<History className="size-4" />}
            items={activityItems}
            title="Activity"
          />
        </DetailTabPanel>

        <DetailTabPanel baseId={tabBaseId} activeTab={activeTab} tabId="due-date-history">
          <HistorySection
            emptyLabel="No due date changes recorded."
            icon={<CalendarClock className="size-4" />}
            items={dateHistoryItems}
            title="Due date history"
          />
        </DetailTabPanel>

        <DetailTabPanel baseId={tabBaseId} activeTab={activeTab} tabId="evidence">
          <EvidenceSection evidence={evidence} />
        </DetailTabPanel>
      </div>
    </div>
  );
}

function DetailTabPanel({
  activeTab,
  baseId,
  children,
  tabId,
}: {
  activeTab: DetailTab;
  baseId: string;
  children: React.ReactNode;
  tabId: DetailTab;
}) {
  return (
    <div
      id={getPanelId(baseId, tabId)}
      role="tabpanel"
      aria-labelledby={getTabId(baseId, tabId)}
      hidden={activeTab !== tabId}
    >
      {activeTab === tabId ? children : null}
    </div>
  );
}

function EvidenceSection({ evidence }: { evidence: TaskEvidenceResponse }) {
  return (
    <section>
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
                className="inline-flex min-w-0 items-center gap-1 font-mono text-xs font-medium text-primary"
                href={evidence.rule.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                <span className="break-all">{evidence.rule.sourceUrl}</span>
                <ExternalLink className="size-3 shrink-0" />
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
  );
}

function HistorySection({
  emptyLabel,
  icon,
  items,
  title,
}: {
  emptyLabel: string;
  icon: React.ReactNode;
  items: HistoryItem[];
  title: string;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
      </div>
      {items.length === 0 ? (
        <div className="rounded-lg border border-border bg-muted p-3 text-xs text-muted-foreground">
          {emptyLabel}
        </div>
      ) : (
        <ol className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-lg border border-border p-3 text-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="font-semibold">{item.title}</div>
                <div className="shrink-0 text-right font-mono text-muted-foreground">
                  {formatDateTime(item.createdAt)}
                </div>
              </div>
              <div className="mt-2 grid gap-1 text-muted-foreground">
                {item.details.map((detail) => (
                  <span key={detail}>{detail}</span>
                ))}
                {item.sourceUrl ? (
                  <a
                    className="inline-flex min-w-0 items-center gap-1 font-mono text-xs font-medium text-primary"
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="break-all">{item.sourceUrl}</span>
                    <ExternalLink className="size-3 shrink-0" />
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
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

type HistoryItem = {
  id: string;
  createdAt: string;
  details: string[];
  sourceUrl?: string | null;
  title: string;
};

function createActivityItems(evidence: TaskEvidenceResponse): HistoryItem[] {
  return evidence.updateRecords
    .filter((record) => !isDateEventBackedTaskUpdate(record, evidence.dateEvents))
    .map((record) => ({
      id: `update-${record.id}`,
      createdAt: record.createdAt,
      title: formatTaskUpdateField(record.fieldName),
      details: [
        `Previous: ${formatTaskUpdateValue(record.fieldName, record.previousValue)}`,
        `New: ${formatTaskUpdateValue(record.fieldName, record.newValue)}`,
        formatTaskUpdateAction(record.action),
      ],
    }))
    .sort(sortNewestFirst);
}

function createDateHistoryItems(evidence: TaskEvidenceResponse): HistoryItem[] {
  return evidence.dateEvents
    .map((event) => ({
      id: `date-${event.id}`,
      createdAt: event.createdAt,
      title: formatDateEventTitle(event.eventType),
      details: [
        event.previousCurrentDueDate || event.newCurrentDueDate
          ? `Official due date: ${formatNullableDate(event.previousCurrentDueDate)} to ${formatNullableDate(
              event.newCurrentDueDate,
            )}`
          : null,
        event.previousFirmTargetDate || event.newFirmTargetDate
          ? `Firm target date: ${formatNullableDate(event.previousFirmTargetDate)} to ${formatNullableDate(
              event.newFirmTargetDate,
            )}`
          : null,
        event.sourceName ? `Source: ${event.sourceName}` : null,
        event.notes,
      ].filter((detail): detail is string => Boolean(detail)),
      sourceUrl: event.sourceUrl,
    }))
    .sort(sortNewestFirst);
}

function isDateEventBackedTaskUpdate(
  record: TaskEvidenceResponse["updateRecords"][number],
  events: TaskEvidenceResponse["dateEvents"],
): boolean {
  return events.some((event) => {
    if (record.fieldName === "currentDueDate") {
      return (
        event.previousCurrentDueDate === record.previousValue &&
        event.newCurrentDueDate === record.newValue
      );
    }

    if (record.fieldName === "firmTargetDate") {
      return (
        event.previousFirmTargetDate === record.previousValue &&
        event.newFirmTargetDate === record.newValue
      );
    }

    if (record.fieldName === "originalDueDate") {
      return (
        event.eventType === "official_extension" &&
        event.previousCurrentDueDate === record.newValue &&
        event.createdAt === record.createdAt
      );
    }

    return false;
  });
}

function sortNewestFirst(left: HistoryItem, right: HistoryItem): number {
  return right.createdAt.localeCompare(left.createdAt);
}

function getTabId(baseId: string, tabId: DetailTab): string {
  return `${baseId}-${tabId}-tab`;
}

function getPanelId(baseId: string, tabId: DetailTab): string {
  return `${baseId}-${tabId}-panel`;
}

function formatDateEventTitle(eventType: TaskEvidenceResponse["dateEvents"][number]["eventType"]): string {
  switch (eventType) {
    case "official_original_due_date":
      return "Original due date recorded";
    case "official_extension":
      return "Official extension";
    case "official_relief_change":
      return "Official relief change";
    case "entered_deadline_adjustment":
      return "Entered deadline adjusted";
    case "firm_target_change":
      return "Firm target date";
  }
}

function formatTaskUpdateField(fieldName: TaskEvidenceResponse["updateRecords"][number]["fieldName"]): string {
  switch (fieldName) {
    case "status":
      return "Work status";
    case "currentDueDate":
      return "Current due date";
    case "originalDueDate":
      return "Original due date";
    case "firmTargetDate":
      return "Firm target date";
    case "notes":
      return "Notes";
  }
}

function formatNullableDate(value: string | null): string {
  return value ? formatDate(value) : "None";
}

function formatTaskUpdateValue(
  fieldName: TaskEvidenceResponse["updateRecords"][number]["fieldName"],
  value: string | null,
): string {
  if (!value) return "None";

  switch (fieldName) {
    case "currentDueDate":
    case "originalDueDate":
    case "firmTargetDate":
      return formatDate(value);
    case "status":
      return value.replaceAll("_", " ");
    case "notes":
      return value;
  }
}

function formatTaskUpdateAction(action: string): string {
  switch (action) {
    case "deadline_task.update_status":
      return "Status updated";
    case "deadline_task.update_firm_target_date":
      return "Firm target date updated";
    case "deadline_task.mark_extended":
      return "Extension recorded";
    default:
      return action;
  }
}
