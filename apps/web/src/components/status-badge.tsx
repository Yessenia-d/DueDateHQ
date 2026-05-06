import { cn } from "@due-date-hq/ui/lib/utils";

type StatusBadgeStatus =
  | "verified"
  | "done"
  | "needs_review"
  | "waiting_on_client"
  | "ready_to_work"
  | "source_changed"
  | "overdue"
  | "at_risk"
  | "on_track"
  | "resolved"
  | "monitoring"
  | "unsupported"
  | "coverage_gap"
  | "no_rule"
  | "entered_deadline"
  | "not_started"
  | "in_progress"
  | "neutral"
  | "review"
  | "risk"
  | "gap"
  | "blocked";

const statusStyles: Record<string, string> = {
  verified: "bg-ddhq-verified-soft text-ddhq-verified",
  done: "bg-ddhq-verified-soft text-ddhq-verified",
  needs_review: "bg-ddhq-review-soft text-ddhq-review",
  waiting_on_client: "bg-ddhq-review-soft text-ddhq-review",
  ready_to_work: "bg-ddhq-accent-soft text-primary",
  source_changed:
    "bg-[oklch(0.955_0.026_285)] text-[oklch(0.46_0.105_285)]",
  review: "bg-ddhq-review-soft text-ddhq-review",
  overdue: "bg-ddhq-risk-soft text-ddhq-risk",
  at_risk: "bg-ddhq-review-soft text-ddhq-review",
  on_track: "bg-muted text-muted-foreground",
  resolved: "bg-ddhq-verified-soft text-ddhq-verified",
  monitoring: "bg-[oklch(0.93_0.025_220)] text-[oklch(0.42_0.06_220)]",
  risk: "bg-ddhq-risk-soft text-ddhq-risk",
  blocked: "bg-ddhq-risk-soft text-ddhq-risk",
  unsupported: "bg-ddhq-gap-soft text-ddhq-gap",
  coverage_gap: "bg-ddhq-gap-soft text-ddhq-gap",
  no_rule: "bg-ddhq-gap-soft text-ddhq-gap",
  gap: "bg-ddhq-gap-soft text-ddhq-gap",
  entered_deadline: "bg-muted text-muted-foreground",
  not_started: "bg-muted text-muted-foreground",
  neutral: "bg-muted text-muted-foreground",
  in_progress: "bg-ddhq-accent-soft text-primary",
};

const statusLabels: Record<string, string> = {
  verified: "Verified",
  done: "Done",
  needs_review: "Needs review",
  waiting_on_client: "Waiting on client",
  ready_to_work: "Ready to work",
  source_changed: "Source changed",
  overdue: "Overdue",
  at_risk: "At risk",
  on_track: "On track",
  resolved: "Resolved",
  monitoring: "Source monitored",
  unsupported: "Unsupported",
  coverage_gap: "Coverage gap",
  no_rule: "Coverage gap",
  entered_deadline: "Entered deadline",
  not_started: "Not started",
  in_progress: "In progress",
  blocked: "Blocked",
};

export function StatusBadge({
  children,
  className,
  status,
}: {
  children?: React.ReactNode;
  className?: string;
  status: StatusBadgeStatus;
}) {
  const style = statusStyles[status] ?? statusStyles.neutral;
  const label = children ?? statusLabels[status] ?? status;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[6px] border border-transparent px-1.5 py-0.5 text-[11px] font-semibold leading-[1.1] whitespace-nowrap",
        style,
        className,
      )}
    >
      {label}
    </span>
  );
}
