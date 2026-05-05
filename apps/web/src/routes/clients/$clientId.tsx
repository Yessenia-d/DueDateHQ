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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@due-date-hq/ui/components/table";
import { Textarea } from "@due-date-hq/ui/components/textarea";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Building2,
  CalendarDays,
  ClipboardList,
  CircleDashed,
  FileText,
  History,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/status-badge";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/clients/$clientId")({
  component: ClientDetailComponent,
});

type EntityType =
  | "individual"
  | "sole_prop"
  | "s_corp"
  | "c_corp"
  | "partnership"
  | "llc"
  | "trust_estate"
  | "nonprofit"
  | "other";
type FiscalYearType = "calendar_year" | "fiscal_year";
type RelationshipType = "individual" | "business" | "household" | "related_group";

const relationshipTypeOptions = [
  { value: "individual", label: "Individual" },
  { value: "business", label: "Business" },
  { value: "household", label: "Household" },
  { value: "related_group", label: "Related group" },
] as const satisfies readonly { value: RelationshipType; label: string }[];

const entityTypeOptions = [
  { value: "individual", label: "Individual" },
  { value: "sole_prop", label: "Sole proprietor" },
  { value: "s_corp", label: "S corporation" },
  { value: "c_corp", label: "C corporation" },
  { value: "partnership", label: "Partnership" },
  { value: "llc", label: "LLC" },
  { value: "trust_estate", label: "Trust or estate" },
  { value: "nonprofit", label: "Nonprofit" },
  { value: "other", label: "Other" },
] as const satisfies readonly { value: EntityType; label: string }[];

const fiscalYearOptions = [
  { value: "calendar_year", label: "Calendar year" },
  { value: "fiscal_year", label: "Fiscal year" },
] as const satisfies readonly { value: FiscalYearType; label: string }[];

const createdViaLabels = {
  manual: "Manual",
  csv_import: "CSV import",
} as const;

function ClientDetailComponent() {
  const { clientId } = Route.useParams();
  const clientDetail = useQuery(trpc.clients.get.queryOptions({ clientId }));
  const [profileName, setProfileName] = React.useState("");
  const [entityType, setEntityType] = React.useState<EntityType>("individual");
  const [states, setStates] = React.useState("");
  const [county, setCounty] = React.useState("");
  const [fiscalYearType, setFiscalYearType] =
    React.useState<FiscalYearType>("calendar_year");
  const [notes, setNotes] = React.useState("");

  const createProfile = useMutation(
    trpc.filingProfiles.createManual.mutationOptions({
      onError: (error) => toast.error(error.message),
      onSuccess: () => {
        toast.success("Filing profile added.");
        setProfileName("");
        setStates("");
        setCounty("");
        setNotes("");
        void clientDetail.refetch();
      },
    }),
  );

  function handleProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createProfile.mutate({
      clientRelationshipId: clientId,
      displayName: profileName,
      entityType,
      states: parseStates(states),
      county: county.trim() || undefined,
      fiscalYearType,
      notes: notes.trim() || undefined,
    });
  }

  if (clientDetail.isPending) {
    return (
      <main className="min-h-0 overflow-auto">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-5 py-6">
          <div className="h-24 animate-pulse rounded-xl border border-border bg-card" />
          <div className="h-80 animate-pulse rounded-xl border border-border bg-card" />
        </div>
      </main>
    );
  }

  if (clientDetail.isError) {
    return (
      <main className="min-h-0 overflow-auto">
        <div className="mx-auto max-w-6xl px-5 py-6">
          <div className="rounded-xl border border-ddhq-risk/30 bg-ddhq-risk-soft p-4 text-sm text-ddhq-risk">
            Client relationship could not be loaded.
          </div>
        </div>
      </main>
    );
  }

  const { client, deadlines, profiles } = clientDetail.data;
  const nextDeadline = deadlines[0] ?? null;
  const enteredDeadlineCount = deadlines.filter(
    (deadline) => deadline.sourceType === "entered_deadline",
  ).length;
  const verifiedDeadlineCount = deadlines.length - enteredDeadlineCount;
  const profileNeedsReviewCount = profiles.filter(
    (profile) => profile.coverageState === "needs_review",
  ).length;
  const coverageGapCount = profiles.filter(
    (profile) => profile.coverageState === "coverage_gap",
  ).length;

  return (
    <main className="min-h-0 overflow-auto">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-6">
        <section className="grid gap-4 border-b border-border pb-5 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
              <Building2 className="size-3.5" />
              Client relationship
            </div>
            <h1 className="text-2xl font-semibold tracking-normal">{client.displayName}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <StatusBadge status="neutral">{relationshipTypeLabel(client.relationshipType)}</StatusBadge>
              <StatusBadge status="neutral">{createdViaLabels[client.createdVia]}</StatusBadge>
            </div>
            {client.notes ? (
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                {client.notes}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href="#profiles"
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-input bg-card px-2.5 text-xs font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <FileText className="size-3.5" />
              Add tax profile
            </a>
            <Link
              to="/clients/$clientId/deadlines/new"
              params={{ clientId }}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-input bg-card px-2.5 text-xs font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <CalendarDays className="size-3.5" />
              Add entered deadline
            </Link>
          </div>
        </section>

        <section id="overview" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryMetric label="Filing profiles" value={profiles.length} />
          <SummaryMetric label="Deadline tasks" value={deadlines.length} />
          <SummaryMetric label="Verified tasks" value={verifiedDeadlineCount} />
          <SummaryMetric label="Needs review" value={profileNeedsReviewCount + coverageGapCount} />
          <SummaryMetric
            label="Next deadline"
            value={nextDeadline ? formatDate(nextDeadline.currentDueDate) : "None"}
          />
        </section>

        <nav
          aria-label="Client data sections"
          className="flex gap-1 overflow-x-auto border-b border-border pb-2"
        >
          <SectionLink href="#overview" icon={Building2} label="Overview" />
          <SectionLink href="#profiles" icon={FileText} label="Filing profiles" />
          <SectionLink href="#tasks" icon={ClipboardList} label="Tasks" />
          <SectionLink href="#coverage" icon={ShieldCheck} label="Coverage" />
          <SectionLink href="#audit" icon={History} label="Audit" />
        </nav>

        <section id="profiles" className="grid scroll-mt-6 gap-6 lg:grid-cols-[24rem_1fr]">
          <form className="grid content-start gap-4 border-b border-border pb-5 lg:border-b-0 lg:border-r lg:pr-5" onSubmit={handleProfileSubmit}>
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
                <FileText className="size-3.5" />
                Filing profile
              </div>
              <h2 className="text-base font-semibold">Add tax profile</h2>
            </div>

            <Field label="Profile name" htmlFor="profile-name">
              <Input
                id="profile-name"
                value={profileName}
                onChange={(event) => setProfileName(event.target.value)}
                required
              />
            </Field>

            <Field label="Entity type" htmlFor="entity-type">
              <Select
                value={entityType}
                onValueChange={(value) => setEntityType(value as EntityType)}
              >
                <SelectTrigger className="h-8 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {entityTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="States" htmlFor="states">
              <Input
                id="states"
                placeholder="CA, NY"
                value={states}
                onChange={(event) => setStates(event.target.value)}
              />
            </Field>

            <Field label="County" htmlFor="county">
              <Input
                id="county"
                value={county}
                onChange={(event) => setCounty(event.target.value)}
              />
            </Field>

            <Field label="Fiscal year type" htmlFor="fiscal-year-type">
              <Select
                value={fiscalYearType}
                onValueChange={(value) => setFiscalYearType(value as FiscalYearType)}
              >
                <SelectTrigger className="h-8 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fiscalYearOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Notes" htmlFor="profile-notes">
              <Textarea
                id="profile-notes"
                className="min-h-20"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </Field>

            <Button type="submit" disabled={createProfile.isPending}>
              <UserPlus className="size-3.5" />
              Add profile
            </Button>
          </form>

          <div className="grid gap-6">
            <section>
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">Filing profiles</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {profiles.length} profile{profiles.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              {profiles.length === 0 ? (
                <EmptyState
                  icon={CircleDashed}
                  title="No filing profiles"
                  detail="Add a tax profile before creating deadline tasks."
                />
              ) : (
                <div className="rounded-xl border border-border">
                  <Table className="min-w-[680px]">
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground">Profile</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground">Entity</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground">Jurisdiction context</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground">Coverage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profiles.map((profile) => (
                        <TableRow key={profile.id} className="align-top">
                          <TableCell>
                            <div className="font-medium">{profile.displayName}</div>
                            {profile.notes ? (
                              <div className="mt-1 text-xs leading-5 text-muted-foreground">
                                {profile.notes}
                              </div>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {entityTypeLabel(profile.entityType)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {[profile.states.join(", ") || "Federal", profile.county]
                              .filter(Boolean)
                              .join(" / ")}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={coverageStateBadgeStatus(profile.coverageState)}>
                              {coverageStateLabel(profile.coverageState)}
                            </StatusBadge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </section>

            <section id="tasks" className="scroll-mt-6">
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">Deadline tasks</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {deadlines.length} task{deadlines.length === 1 ? "" : "s"} for this client.
                    Entered deadlines remain separate from DueDateHQ Verified tasks.
                  </p>
                </div>
              </div>
              {deadlines.length === 0 ? (
                <EmptyState
                  icon={CalendarDays}
                  title="No deadline tasks"
                  detail="Verified tasks and entered deadlines for this client will appear here."
                />
              ) : (
                <div className="rounded-xl border border-border">
                  <Table className="min-w-[760px]">
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground">Deadline</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground">Current due date</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground">Firm target date</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground">Trust</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground">Reference</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground">Recurrence</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deadlines.map((deadline) => (
                        <TableRow key={deadline.id} className="align-top">
                          <TableCell>
                            <div className="font-medium">{deadline.title}</div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {deadline.jurisdiction} / {deadline.taxCategory}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-medium">
                            {formatDate(deadline.currentDueDate)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {deadline.firmTargetDate ? formatDate(deadline.firmTargetDate) : "None"}
                          </TableCell>
                          <TableCell>
                            {deadline.sourceType === "entered_deadline" ? (
                              <>
                                <StatusBadge status="entered_deadline">
                                  <ShieldAlert className="size-3" />
                                  Entered deadline
                                </StatusBadge>
                                <div className="mt-1 text-xs text-muted-foreground">
                                  Not verified by DueDateHQ
                                </div>
                              </>
                            ) : (
                              <>
                                <StatusBadge status="verified">Verified</StatusBadge>
                                <div className="mt-1 text-xs text-muted-foreground">
                                  {deadline.trustLabel}
                                </div>
                              </>
                            )}
                          </TableCell>
                          <TableCell className="max-w-64 text-xs leading-5 text-muted-foreground">
                            {deadline.referenceNote ??
                              (deadline.sourceType === "verified_rule"
                                ? "Official source evidence is attached to the verified rule."
                                : "No reference recorded.")}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {deadline.recurrenceKey ? deadline.recurrenceLabel : "One-time"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </section>

            <section id="coverage" className="scroll-mt-6 border-t border-border pt-5">
              <div className="mb-3">
                <h2 className="text-base font-semibold">Coverage</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Filing profile coverage determines whether DueDateHQ can generate official
                  verified deadline tasks.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {profiles.length === 0 ? (
                  <StatusBadge status="neutral">No filing profiles</StatusBadge>
                ) : (
                  profiles.map((profile) => (
                    <StatusBadge
                      key={profile.id}
                      status={coverageStateBadgeStatus(profile.coverageState)}
                    >
                      {profile.displayName}: {coverageStateLabel(profile.coverageState)}
                    </StatusBadge>
                  ))
                )}
              </div>
            </section>

            <section id="audit" className="scroll-mt-6 border-t border-border pt-5">
              <div className="mb-3">
                <h2 className="text-base font-semibold">Audit</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Source and update metadata for this client relationship.
                </p>
              </div>
              <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                <AuditField label="Created via" value={createdViaLabels[client.createdVia]} />
                <AuditField label="Created" value={formatDateTime(client.createdAt)} />
                <AuditField label="Updated" value={formatDateTime(client.updatedAt)} />
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function SummaryMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border border-border bg-muted/20 px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold text-foreground">{value}</div>
    </div>
  );
}

function SectionLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof Building2;
  label: string;
}) {
  return (
    <a
      href={href}
      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[6px] px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Icon className="size-3.5" />
      {label}
    </a>
  );
}

function AuditField({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border bg-muted/20 px-3 py-2">
      <div className="font-medium text-foreground">{label}</div>
      <div className="mt-1">{value}</div>
    </div>
  );
}

function parseStates(value: string) {
  return value
    .split(",")
    .map((state) => state.trim())
    .filter(Boolean);
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

function EmptyState({
  detail,
  icon: Icon,
  title,
}: {
  detail: string;
  icon: typeof CircleDashed;
  title: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-5">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Icon className="size-4" />
        {title}
      </div>
      <div className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</div>
    </div>
  );
}

function relationshipTypeLabel(value: string) {
  return relationshipTypeOptions.find((option) => option.value === value)?.label ?? value;
}

function entityTypeLabel(value: string) {
  return entityTypeOptions.find((option) => option.value === value)?.label ?? value;
}

function coverageStateBadgeStatus(value: string) {
  if (value === "ready") return "verified";
  if (value === "coverage_gap") return "coverage_gap";
  if (value === "unsupported") return "unsupported";
  return "needs_review";
}

function coverageStateLabel(value: string) {
  if (value === "ready") return "Verified";
  if (value === "coverage_gap") return "Coverage gap";
  if (value === "unsupported") return "Unsupported";
  return "Needs review";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
