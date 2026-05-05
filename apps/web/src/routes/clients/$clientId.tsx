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
  CircleDashed,
  FileText,
  ShieldAlert,
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
              <StatusBadge status="neutral">Created manually</StatusBadge>
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
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-input bg-card px-2.5 text-xs font-medium hover:bg-muted"
          >
            <CalendarDays className="size-3.5" />
            Add deadline
          </Link>
        </section>

        <section className="grid gap-6 lg:grid-cols-[24rem_1fr]">
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
                            <StatusBadge status="needs_review" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
                <div className="rounded-xl border border-border">
                  <Table className="min-w-[760px]">
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground">Deadline</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground">Current due date</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground">Firm target date</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground">Trust</TableHead>
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
                            <StatusBadge status="user_provided">
                              <ShieldAlert className="size-3" />
                              User provided
                            </StatusBadge>
                            <div className="mt-1 text-xs text-muted-foreground">
                              Not verified by DueDateHQ
                            </div>
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}
