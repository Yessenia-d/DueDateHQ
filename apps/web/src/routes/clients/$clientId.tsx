import { Button } from "@due-date-hq/ui/components/button";
import { Input } from "@due-date-hq/ui/components/input";
import { Label } from "@due-date-hq/ui/components/label";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Building2,
  CalendarDays,
  CircleDashed,
  FileText,
  ShieldAlert,
  UserPlus,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

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
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-6">
          <div className="h-24 animate-pulse border bg-muted/30" />
          <div className="h-80 animate-pulse border bg-muted/30" />
        </div>
      </main>
    );
  }

  if (clientDetail.isError) {
    return (
      <main className="min-h-0 overflow-auto">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            Client relationship could not be loaded.
          </div>
        </div>
      </main>
    );
  }

  const { client, deadlines, profiles } = clientDetail.data;

  return (
    <main className="min-h-0 overflow-auto">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
        <section className="grid gap-4 border-b pb-5 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
              <Building2 className="size-3.5" />
              Client relationship
            </div>
            <h1 className="text-2xl font-semibold tracking-normal">{client.displayName}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <StatusBadge tone="neutral">{relationshipTypeLabel(client.relationshipType)}</StatusBadge>
              <StatusBadge tone="neutral">Created manually</StatusBadge>
            </div>
            {client.notes ? (
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                {client.notes}
              </p>
            ) : null}
          </div>
          <Link
            to="/clients/$clientId/deadlines/new"
            params={{ clientId }}
            className="inline-flex h-8 items-center justify-center gap-1.5 border border-input bg-background px-2.5 text-xs font-medium hover:bg-muted"
          >
            <CalendarDays className="size-3.5" />
            Add deadline
          </Link>
        </section>

        <section className="grid gap-6 lg:grid-cols-[24rem_1fr]">
          <form className="grid content-start gap-4 border-b pb-5 lg:border-b-0 lg:border-r lg:pr-5" onSubmit={handleProfileSubmit}>
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
              <select
                id="entity-type"
                className="h-8 w-full border border-input bg-background px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
                value={entityType}
                onChange={(event) => setEntityType(event.target.value as EntityType)}
              >
                {entityTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
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
              <select
                id="fiscal-year-type"
                className="h-8 w-full border border-input bg-background px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
                value={fiscalYearType}
                onChange={(event) => setFiscalYearType(event.target.value as FiscalYearType)}
              >
                {fiscalYearOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Notes" htmlFor="profile-notes">
              <textarea
                id="profile-notes"
                className="min-h-20 w-full resize-y border border-input bg-background px-2.5 py-2 text-xs leading-5 outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
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
                <div className="overflow-x-auto border">
                  <table className="w-full min-w-[680px] border-collapse text-left text-sm">
                    <thead className="bg-muted/40 text-xs text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">Profile</th>
                        <th className="px-3 py-2 font-medium">Entity</th>
                        <th className="px-3 py-2 font-medium">Jurisdiction context</th>
                        <th className="px-3 py-2 font-medium">Coverage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profiles.map((profile) => (
                        <tr key={profile.id} className="border-t align-top">
                          <td className="px-3 py-3">
                            <div className="font-medium">{profile.displayName}</div>
                            {profile.notes ? (
                              <div className="mt-1 text-xs leading-5 text-muted-foreground">
                                {profile.notes}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-3 py-3 text-xs text-muted-foreground">
                            {entityTypeLabel(profile.entityType)}
                          </td>
                          <td className="px-3 py-3 text-xs text-muted-foreground">
                            {[profile.states.join(", ") || "Federal", profile.county]
                              .filter(Boolean)
                              .join(" / ")}
                          </td>
                          <td className="px-3 py-3">
                            <StatusBadge tone="review">Needs review</StatusBadge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section>
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">Manual deadlines</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {deadlines.length} user-provided task{deadlines.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              {deadlines.length === 0 ? (
                <EmptyState
                  icon={CalendarDays}
                  title="No manual deadlines"
                  detail="User-provided deadlines will stay separate from verified DueDateHQ tasks."
                />
              ) : (
                <div className="overflow-x-auto border">
                  <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                    <thead className="bg-muted/40 text-xs text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">Deadline</th>
                        <th className="px-3 py-2 font-medium">Current due date</th>
                        <th className="px-3 py-2 font-medium">Firm target date</th>
                        <th className="px-3 py-2 font-medium">Trust</th>
                        <th className="px-3 py-2 font-medium">Recurrence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deadlines.map((deadline) => (
                        <tr key={deadline.id} className="border-t align-top">
                          <td className="px-3 py-3">
                            <div className="font-medium">{deadline.title}</div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {deadline.jurisdiction} / {deadline.taxCategory}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-xs font-medium">
                            {formatDate(deadline.currentDueDate)}
                          </td>
                          <td className="px-3 py-3 text-xs text-muted-foreground">
                            {deadline.firmTargetDate ? formatDate(deadline.firmTargetDate) : "None"}
                          </td>
                          <td className="px-3 py-3">
                            <StatusBadge tone="user">
                              <ShieldAlert className="size-3" />
                              User provided
                            </StatusBadge>
                            <div className="mt-1 text-xs text-muted-foreground">
                              Not verified by DueDateHQ
                            </div>
                          </td>
                          <td className="px-3 py-3 text-xs text-muted-foreground">
                            {deadline.recurrenceKey ? deadline.recurrenceLabel : "One-time"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </section>
      </div>
    </main>
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
    <div className="border bg-muted/20 p-5">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Icon className="size-4" />
        {title}
      </div>
      <div className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</div>
    </div>
  );
}

type StatusTone = "neutral" | "review" | "user";

function StatusBadge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: StatusTone;
}) {
  const toneClass = {
    neutral: "border-border bg-muted text-muted-foreground",
    review:
      "border-amber-600/30 bg-amber-500/10 text-amber-700 dark:border-amber-400/30 dark:text-amber-300",
    user: "border-border bg-background text-muted-foreground",
  }[tone];

  return (
    <span className={`inline-flex h-6 items-center gap-1.5 border px-2 text-xs font-medium ${toneClass}`}>
      {children}
    </span>
  );
}

function relationshipTypeLabel(value: string) {
  return relationshipTypeOptions.find((option) => option.value === value)?.label ?? value;
}

function entityTypeLabel(value: string) {
  return entityTypeOptions.find((option) => option.value === value)?.label ?? value;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}
