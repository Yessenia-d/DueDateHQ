import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  const healthCheck = useQuery(trpc.healthCheck.queryOptions());
  const session = useQuery(trpc.auth.session.queryOptions());

  return (
    <main className="min-h-0 overflow-auto bg-[#fbfaf7] text-[#241f1a]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="border-b border-[#ded8ce] pb-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[#6f685f]">
                Firm workspace
              </div>
              <h1 className="mt-1 text-2xl font-semibold leading-tight">
                {session.data?.firm.name ?? "DueDateHQ workspace"}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6f685f]">
                A light operations console for firm-owned client relationships,
                filing profiles, and deadline task work.
              </p>
            </div>
            <Link
              to="/progress"
              className="inline-flex h-9 items-center justify-center border border-[#cfc7bc] bg-white px-3 text-sm font-medium text-[#241f1a] hover:bg-[#f3f0ea]"
            >
              View build progress
            </Link>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          <StatusPanel
            label="Session"
            value={session.data ? "Firm scoped" : "Checking"}
            status={session.data ? "Verified" : "Pending"}
            tone={session.data ? "verified" : "review"}
            detail={session.data?.user.email ?? "Session required"}
          />
          <StatusPanel
            label="Firm data"
            value="Workspace boundary"
            status="Required"
            tone="neutral"
            detail="Client records stay attached to the signed-in firm."
          />
          <StatusPanel
            label="API"
            value={healthCheck.data ? "Connected" : "Checking"}
            status={healthCheck.data ? "Online" : "Pending"}
            tone={healthCheck.data ? "verified" : "review"}
            detail={
              healthCheck.isLoading
                ? "Health check in progress"
                : healthCheck.data
                  ? "Worker and tRPC are responding"
                  : "Worker is not responding"
            }
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="border border-[#ded8ce] bg-white">
            <div className="border-b border-[#e7e2da] px-4 py-3">
              <h2 className="text-base font-semibold">Beta workspace setup</h2>
            </div>
            <div className="divide-y divide-[#ece7df]">
              <SetupRow
                name="Auth and firm workspace"
                detail="Email/password access creates a firm-scoped session."
                status="Done"
                tone="verified"
              />
              <SetupRow
                name="Feature progress"
                detail="Implementation progress is available for inspection."
                status="Done"
                tone="verified"
                action={
                  <Link to="/progress" className="text-sm font-medium text-[#176b86]">
                    Open
                  </Link>
                }
              />
              <SetupRow
                name="Core deadline schema"
                detail="Client relationships, filing profiles, and deadline tasks."
                status="Planned"
                tone="gap"
              />
              <SetupRow
                name="Tax obligation library"
                detail="Verified rules must exist before official tasks are generated."
                status="Planned"
                tone="gap"
              />
            </div>
          </div>

          <aside className="border border-[#ded8ce] bg-white">
            <div className="border-b border-[#e7e2da] px-4 py-3">
              <h2 className="text-base font-semibold">Next work surfaces</h2>
            </div>
            <div className="divide-y divide-[#ece7df]">
              <SurfaceRow name="Filing profiles" state="Planned" />
              <SurfaceRow name="Deadline tasks" state="Planned" />
              <SurfaceRow name="Coverage matrix" state="Planned" />
              <SurfaceRow name="Monday triage" state="Planned" />
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function StatusPanel({
  label,
  value,
  status,
  tone,
  detail,
}: {
  label: string;
  value: string;
  status: string;
  tone: StatusTone;
  detail: string;
}) {
  return (
    <div className="border border-[#ded8ce] bg-white px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-medium text-[#6f685f]">{label}</div>
        <StatusBadge tone={tone}>{status}</StatusBadge>
      </div>
      <div className="mt-3 text-sm font-semibold">{value}</div>
      <div className="mt-1 text-xs leading-5 text-[#6f685f]">{detail}</div>
    </div>
  );
}

function SetupRow({
  name,
  detail,
  status,
  tone,
  action,
}: {
  name: string;
  detail: string;
  status: string;
  tone: StatusTone;
  action?: React.ReactNode;
}) {
  return (
    <div className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
      <div className="min-w-0">
        <div className="text-sm font-semibold">{name}</div>
        <div className="mt-1 text-xs leading-5 text-[#6f685f]">{detail}</div>
      </div>
      <StatusBadge tone={tone}>{status}</StatusBadge>
      <div className="min-w-10 text-right">{action}</div>
    </div>
  );
}

function SurfaceRow({ name, state }: { name: string; state: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="text-sm font-medium">{name}</div>
      <StatusBadge tone="gap">{state}</StatusBadge>
    </div>
  );
}

type StatusTone = "verified" | "review" | "gap" | "neutral";

function StatusBadge({
  tone,
  children,
}: {
  tone: StatusTone;
  children: React.ReactNode;
}) {
  const toneClass = {
    verified: "border-[#b7dec6] bg-[#eef8f1] text-[#287347]",
    review: "border-[#ead28e] bg-[#fff7dc] text-[#806218]",
    gap: "border-[#cfd6e3] bg-[#f0f3f7] text-[#4f607b]",
    neutral: "border-[#ddd6cb] bg-[#f6f3ee] text-[#655e55]",
  }[tone];

  return (
    <span className={`inline-flex h-6 items-center border px-2 text-xs font-semibold ${toneClass}`}>
      {children}
    </span>
  );
}
