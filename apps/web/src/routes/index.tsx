import { buttonVariants } from "@due-date-hq/ui/components/button";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarCheck,
  FileCheck2,
  Rows3,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import * as React from "react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

const workflowSteps = [
  { id: "overview", label: "Overview" },
  { id: "queue", label: "Deadline queue" },
  { id: "coverage", label: "Coverage review" },
  { id: "notices", label: "Notice approval" },
] as const;

type WorkflowStepId = (typeof workflowSteps)[number]["id"];

function HomePage() {
  const activeStepId = useActiveWorkflowStep();

  return (
    <main className="min-h-svh scroll-smooth bg-background text-foreground">
      <PublicHeader />
      <WorkflowSideNav activeStepId={activeStepId} />
      <HeroSection />
      <DailyQueueSection />
      <CoverageImportSection />
      <NoticeReviewSection />
    </main>
  );
}

function PublicHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-20 border-b border-ddhq-line bg-ddhq-paper/95">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex min-w-0 items-center gap-2.5" aria-label="DueDateHQ home">
          <span className="grid size-8 shrink-0 place-items-center rounded-[8px] border border-ddhq-line bg-ddhq-paper-raised text-sm font-bold text-primary shadow-[0_1px_0_oklch(0.44_0.025_78/0.04)]">
            D
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold leading-tight">DueDateHQ</span>
            <span className="block text-xs leading-tight text-ddhq-ink-soft">
              Verified operations
            </span>
          </span>
        </Link>

        <nav className="flex shrink-0 items-center gap-2" aria-label="Account access">
          <Link
            to="/login"
            search={{ mode: "login" }}
            className={buttonVariants({
              variant: "ghost",
              className:
                "h-10 px-3 text-sm text-muted-foreground hover:bg-ddhq-paper-muted hover:text-foreground",
            })}
          >
            Log in
          </Link>
          <Link
            to="/login"
            search={{ mode: "register" }}
            className={buttonVariants({
              className: "h-10 bg-primary px-3 text-sm hover:bg-primary/90",
            })}
          >
            Register
          </Link>
        </nav>
      </div>
    </header>
  );
}

function HeroSection() {
  return (
    <WorkflowSection id="overview" tone="paper">
      <div className="grid min-h-[76svh] gap-6 pt-24 pb-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(440px,1.05fr)] lg:items-center lg:pt-16">
        <div className="min-w-0">
          <Kicker icon={<ShieldCheck className="size-4" />}>Tax deadline operating system</Kicker>
          <h1 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight tracking-normal text-foreground sm:text-4xl lg:text-[44px]">
            Know what is due, why it is due, and what needs review.
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-6 text-muted-foreground">
            DueDateHQ gives solo CPAs one calm place for client filings, verified IRS and state
            deadline evidence, coverage gaps, and source-change review cues.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/login"
              search={{ mode: "register" }}
              className={buttonVariants({
                className: "h-10 bg-primary px-4 hover:bg-primary/90",
              })}
            >
              Create workspace
              <ArrowRight className="size-4" />
            </Link>
            <Link
              to="/login"
              search={{ mode: "login" }}
              className={buttonVariants({
                variant: "outline",
                className:
                  "h-10 border-ddhq-border-strong/70 bg-ddhq-paper-raised px-4 hover:bg-ddhq-paper-muted",
              })}
            >
              Log in
            </Link>
          </div>
        </div>

        <div className="min-w-0 border border-ddhq-line bg-ddhq-paper-raised shadow-[0_24px_60px_oklch(0.38_0.035_78/0.08)]">
          <div className="grid border-b border-ddhq-line px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div>
              <div className="text-xs font-semibold uppercase text-ddhq-ink-soft">7:40 AM</div>
              <div className="mt-1 text-sm font-semibold">Work queue for this week</div>
            </div>
            <StatusPill tone="verified">Verified rules visible</StatusPill>
          </div>
          <QueueRows compact={false} />
        </div>
      </div>
    </WorkflowSection>
  );
}

function DailyQueueSection() {
  return (
    <WorkflowSection id="queue">
      <div className="grid min-h-[72svh] gap-6 py-12 lg:items-center lg:py-14">
        <div className="min-w-0">
          <Kicker icon={<CalendarCheck className="size-4" />}>Start with risk</Kicker>
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="border-y border-ddhq-line bg-ddhq-paper-raised">
              <div className="grid grid-cols-[minmax(0,1fr)_7rem_7rem] gap-3 border-b border-ddhq-line px-4 py-3 text-xs font-semibold text-ddhq-ink-soft">
                <span>Client filing</span>
                <span>Official</span>
                <span>Status</span>
              </div>
              <QueueRows compact />
            </div>
            <aside className="border-y border-ddhq-line py-4">
              <h2 className="text-2xl font-semibold leading-tight tracking-normal">
                See official due dates before planning dates.
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Firm targets help planning. They do not replace the official date or source status.
              </p>
              <dl className="mt-6 grid gap-3 text-sm">
                <MetaLine label="Verified" value="Official task can be generated" />
                <MetaLine label="Source changed" value="Review before relying on it" />
                <MetaLine label="Coverage gap" value="No verified support yet" />
              </dl>
            </aside>
          </div>
        </div>
      </div>
    </WorkflowSection>
  );
}

function CoverageImportSection() {
  return (
    <WorkflowSection id="coverage" tone="muted">
      <div className="grid min-h-[72svh] gap-6 py-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)] lg:items-center lg:py-14">
        <div>
          <Kicker icon={<Rows3 className="size-4" />}>Then clean the profile data</Kicker>
          <h2 className="mt-4 max-w-xl text-3xl font-semibold leading-tight tracking-normal">
            Coverage gaps point to the client data that needs review.
          </h2>
          <p className="mt-4 max-w-lg text-sm leading-6 text-muted-foreground">
            Import review keeps uncertain fields, duplicates, relationships, and unsupported areas
            visible before profiles are committed.
          </p>
        </div>
        <div className="grid gap-5">
          <div className="border-y border-ddhq-line bg-ddhq-paper-raised">
            <div className="grid grid-cols-[minmax(0,1fr)_5.75rem_7rem] gap-3 border-b border-ddhq-line px-4 py-3 text-xs font-semibold text-ddhq-ink-soft">
              <span>Filing profile</span>
              <span>State</span>
              <span>Status</span>
            </div>
            <MatrixRow profile="Orchid Studio, sales tax" state="CA" status="Needs review" tone="review" />
            <MatrixRow profile="North Pier LLC, 1120-S" state="Federal" status="Verified" tone="verified" />
            <MatrixRow profile="Vale Partners, Q2 estimate" state="NV" status="Coverage gap" tone="gap" />
          </div>
          <div className="grid gap-3 border-y border-ddhq-line py-4 sm:grid-cols-3">
            <ImportMetric label="Ready profiles" value="24" tone="verified" />
            <ImportMetric label="Field review" value="4" tone="review" />
            <ImportMetric label="Coverage gaps" value="3" tone="gap" />
          </div>
        </div>
      </div>
    </WorkflowSection>
  );
}

function NoticeReviewSection() {
  return (
    <WorkflowSection id="notices">
      <div className="grid min-h-[72svh] gap-6 py-12 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-center lg:py-14">
        <div>
          <Kicker icon={<FileCheck2 className="size-4" />}>When sources change</Kicker>
          <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-normal">
            Review the cue, check the diff, approve only what should change.
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            AI can help surface a possible notice impact. Workspace data changes only after CPA
            approval.
          </p>
          <div className="mt-7">
            <Link
              to="/login"
              search={{ mode: "register" }}
              className={buttonVariants({
                className: "h-10 bg-primary px-4 hover:bg-primary/90",
              })}
            >
              Create workspace
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>

        <div className="min-w-0 border-y border-ddhq-line bg-ddhq-paper-raised">
          <div className="grid gap-3 border-b border-ddhq-line px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div>
              <div className="text-xs font-semibold uppercase text-ddhq-ink-soft">
                Notice proposal
              </div>
              <div className="mt-1 text-sm font-semibold">IRS disaster relief notice</div>
            </div>
            <StatusPill tone="review">Needs CPA approval</StatusPill>
          </div>
          <div className="border-b border-ddhq-line bg-ddhq-review-soft/65 px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-ddhq-review">
              <Sparkles className="size-3.5" />
              AI/source-change cue
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Possible impact for CA individual filing profiles. Review source and values.
            </p>
          </div>
          <div className="grid divide-y divide-ddhq-line md:grid-cols-2 md:divide-x md:divide-y-0">
            <DiffColumn label="Current" date="Apr 15" status="Verified source" />
            <DiffColumn label="Proposed" date="Oct 15" status="Review before applying" />
          </div>
        </div>
      </div>
    </WorkflowSection>
  );
}

function WorkflowSection({
  children,
  id,
  tone = "default",
}: {
  children: React.ReactNode;
  id: WorkflowStepId;
  tone?: "default" | "muted" | "paper";
}) {
  const toneClass = {
    default: "bg-background",
    muted: "bg-ddhq-paper-muted/40",
    paper: "bg-ddhq-paper",
  }[tone];

  return (
    <section
      id={id}
      data-workflow-section
      className={`scroll-mt-16 border-b border-ddhq-line ${toneClass}`}
    >
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">{children}</div>
    </section>
  );
}

function Kicker({ children, icon }: { children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold uppercase text-ddhq-ink-soft">
      {icon}
      {children}
    </div>
  );
}

function WorkflowSideNav({ activeStepId }: { activeStepId: WorkflowStepId }) {
  const handleStepClick =
    (stepId: WorkflowStepId) => (event: React.MouseEvent<HTMLAnchorElement>) => {
      const section = document.getElementById(stepId);

      if (!section) return;

      event.preventDefault();
      section.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.replaceState(null, "", `#${stepId}`);
    };

  return (
    <nav
      aria-label="Homepage workflow"
      className="fixed top-1/2 z-10 hidden w-44 -translate-y-1/2 min-[1720px]:left-[max(2rem,calc((100vw-72rem)/2-24rem))] min-[1720px]:block"
    >
      <ol className="grid gap-1 text-sm">
        {workflowSteps.map((step, index) => {
          const isActive = step.id === activeStepId;
          return (
            <li key={step.id}>
              <a
                href={`#${step.id}`}
                aria-current={isActive ? "true" : undefined}
                onClick={handleStepClick(step.id)}
                className={`grid min-h-9 grid-cols-[2px_1.75rem_minmax(0,1fr)] items-center gap-3 px-2 transition-colors ${
                  isActive
                    ? "bg-ddhq-accent-soft text-foreground"
                    : "text-muted-foreground hover:bg-ddhq-paper-muted hover:text-foreground"
                }`}
              >
                <span
                  className={`h-5 rounded-full transition-colors ${
                    isActive ? "bg-primary" : "bg-transparent"
                  }`}
                  aria-hidden="true"
                />
                <span
                  className={`font-mono text-xs font-semibold ${
                    isActive ? "text-primary" : "text-ddhq-ink-soft"
                  }`}
                >
                  0{index + 1}
                </span>
                <span className={isActive ? "font-semibold" : ""}>{step.label}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function useActiveWorkflowStep() {
  const [activeStepId, setActiveStepId] = React.useState<WorkflowStepId>("overview");

  React.useEffect(() => {
    const sections = workflowSteps
      .map((step) => document.getElementById(step.id))
      .filter((section): section is HTMLElement => Boolean(section));

    if (sections.length === 0) return;

    let frameId = 0;

    const updateActiveStep = () => {
      frameId = 0;

      const anchorY = window.innerHeight * 0.42;
      const activeSection =
        sections.find((section) => {
          const rect = section.getBoundingClientRect();
          return rect.top <= anchorY && rect.bottom > anchorY;
        }) ??
        sections
          .map((section) => ({
            distance: Math.abs(section.getBoundingClientRect().top - anchorY),
            section,
          }))
          .sort((a, b) => a.distance - b.distance)[0]?.section;

      if (activeSection?.id) {
        setActiveStepId(activeSection.id as WorkflowStepId);
      }
    };

    const scheduleUpdate = () => {
      if (frameId === 0) {
        frameId = window.requestAnimationFrame(updateActiveStep);
      }
    };

    updateActiveStep();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, []);

  return activeStepId;
}

function QueueRows({ compact }: { compact: boolean }) {
  const rows = [
    {
      client: "North Pier LLC",
      date: "Mar 15",
      firmTarget: "Mar 8",
      status: "Verified",
      task: "Federal 1120-S return",
      tone: "verified",
    },
    {
      client: "Orchid Studio",
      date: "Apr 30",
      firmTarget: "Apr 24",
      status: "Source changed",
      task: "CA sales tax filing",
      tone: "review",
    },
    {
      client: "Vale Partners",
      date: "No official date",
      firmTarget: "Jun 10",
      status: "Coverage gap",
      task: "Q2 estimate",
      tone: "gap",
    },
  ] as const;

  return (
    <div className="grid divide-y divide-ddhq-line">
      {rows.map((row) => (
        <div
          key={`${row.client}-${row.task}`}
          className={`grid gap-3 px-4 py-3 ${
            compact
              ? "grid-cols-[minmax(0,1fr)_7rem_7rem] items-center"
              : "sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
          }`}
        >
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{row.client}</div>
            <div className="mt-0.5 truncate text-xs text-muted-foreground">{row.task}</div>
          </div>
          {compact ? (
            <>
              <div className="font-mono text-xs font-medium text-foreground">{row.date}</div>
              <StatusPill tone={row.tone}>{row.status}</StatusPill>
            </>
          ) : (
            <div className="grid gap-1 sm:justify-items-end">
              <div className="font-mono text-xs font-medium text-foreground">
                Official: {row.date}
              </div>
              <div className="text-xs text-muted-foreground">Firm target: {row.firmTarget}</div>
              <StatusPill tone={row.tone}>{row.status}</StatusPill>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function MatrixRow({
  profile,
  state,
  status,
  tone,
}: {
  profile: string;
  state: string;
  status: string;
  tone: "gap" | "review" | "verified";
}) {
  return (
    <div className="grid min-h-14 grid-cols-[minmax(0,1fr)_5.75rem_7rem] items-center gap-3 border-b border-ddhq-line px-4 py-3 last:border-b-0">
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold">{profile}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">Client relationship</div>
      </div>
      <div className="font-mono text-xs font-medium">{state}</div>
      <StatusPill tone={tone}>{status}</StatusPill>
    </div>
  );
}

function ImportMetric({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "gap" | "review" | "verified";
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-1">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-lg font-semibold">{value}</span>
        <StatusPill tone={tone}>{tone === "verified" ? "Ready" : "Review"}</StatusPill>
      </div>
    </div>
  );
}

function DiffColumn({
  date,
  label,
  status,
}: {
  date: string;
  label: string;
  status: string;
}) {
  return (
    <div className="min-h-40 px-4 py-5">
      <div className="text-xs font-semibold uppercase text-ddhq-ink-soft">{label}</div>
      <div className="mt-4 font-mono text-xl font-semibold tracking-normal">{date}</div>
      <div className="mt-2 text-sm text-muted-foreground">Official due date</div>
      <div className="mt-5 text-xs text-muted-foreground">{status}</div>
    </div>
  );
}

function MetaLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-t border-ddhq-line pt-3">
      <dt className="text-xs font-semibold uppercase text-ddhq-ink-soft">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  );
}

function StatusPill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "gap" | "neutral" | "review" | "verified";
}) {
  const toneClass = {
    gap: "bg-ddhq-gap-soft text-ddhq-gap",
    neutral: "bg-ddhq-paper-muted text-muted-foreground",
    review: "bg-ddhq-review-soft text-ddhq-review",
    verified: "bg-ddhq-verified-soft text-ddhq-verified",
  }[tone];

  return (
    <span className={`w-fit rounded-[6px] px-2 py-1 text-[11px] font-semibold ${toneClass}`}>
      {children}
    </span>
  );
}
