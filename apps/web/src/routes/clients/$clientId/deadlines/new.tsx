import { Button } from "@due-date-hq/ui/components/button";
import { Checkbox } from "@due-date-hq/ui/components/checkbox";
import { Input } from "@due-date-hq/ui/components/input";
import { Label } from "@due-date-hq/ui/components/label";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { CalendarPlus, CircleDashed, ShieldAlert } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/clients/$clientId/deadlines/new")({
  component: NewDeadlineComponent,
});

type DeadlineKind = "filing" | "payment";
type DeadlinePriority = "low" | "normal" | "high" | "urgent";
type Recurrence = "none" | "monthly" | "quarterly" | "annual";

const deadlineKindOptions = [
  { value: "filing", label: "Filing" },
  { value: "payment", label: "Payment" },
] as const satisfies readonly { value: DeadlineKind; label: string }[];

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
] as const satisfies readonly { value: DeadlinePriority; label: string }[];

const recurrenceOptions = [
  { value: "none", label: "One-time" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual", label: "Annual" },
] as const satisfies readonly { value: Recurrence; label: string }[];

function NewDeadlineComponent() {
  const { clientId } = Route.useParams();
  const navigate = useNavigate();
  const clientDetail = useQuery(trpc.clients.get.queryOptions({ clientId }));
  const createManual = useMutation(trpc.deadlineTasks.createManual.mutationOptions());
  const requestVerification = useMutation(
    trpc.deadlineTasks.requestVerification.mutationOptions(),
  );
  const [filingProfileId, setFilingProfileId] = React.useState("");
  const [taxCategory, setTaxCategory] = React.useState("");
  const [jurisdiction, setJurisdiction] = React.useState("federal");
  const [formOrObligation, setFormOrObligation] = React.useState("");
  const [deadlineKind, setDeadlineKind] = React.useState<DeadlineKind>("filing");
  const [currentDueDate, setCurrentDueDate] = React.useState("");
  const [firmTargetDate, setFirmTargetDate] = React.useState("");
  const [priority, setPriority] = React.useState<DeadlinePriority>("normal");
  const [recurrence, setRecurrence] = React.useState<Recurrence>("none");
  const [sourceNote, setSourceNote] = React.useState("");
  const [shouldRequestVerification, setShouldRequestVerification] = React.useState(false);

  const profiles = clientDetail.data?.profiles ?? [];
  const selectedProfileId = filingProfileId || profiles[0]?.id || "";
  const isSubmitting = createManual.isPending || requestVerification.isPending;

  React.useEffect(() => {
    if (!filingProfileId && profiles[0]?.id) {
      setFilingProfileId(profiles[0].id);
    }
  }, [filingProfileId, profiles]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = await createManual.mutateAsync({
      clientRelationshipId: clientId,
      filingProfileId: selectedProfileId,
      taxCategory,
      jurisdiction,
      formOrObligation,
      deadlineKind,
      currentDueDate,
      firmTargetDate: firmTargetDate || undefined,
      priority,
      recurrence,
      sourceNote,
    });

    if (shouldRequestVerification) {
      await requestVerification.mutateAsync({
        deadlineTaskId: result.deadline.id,
        message: `Please verify ${result.deadline.title}.`,
      });
      toast.success("Manual deadline saved and verification requested.");
    } else {
      toast.success("Manual deadline saved.");
    }

    void navigate({ to: "/clients/$clientId", params: { clientId } });
  }

  if (clientDetail.isPending) {
    return (
      <main className="min-h-0 overflow-auto">
        <div className="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-6">
          <div className="h-24 animate-pulse border bg-muted/30" />
          <div className="h-96 animate-pulse border bg-muted/30" />
        </div>
      </main>
    );
  }

  if (clientDetail.isError) {
    return (
      <main className="min-h-0 overflow-auto">
        <div className="mx-auto max-w-5xl px-4 py-6">
          <div className="border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            Client relationship could not be loaded.
          </div>
        </div>
      </main>
    );
  }

  const { client } = clientDetail.data;

  return (
    <main className="min-h-0 overflow-auto">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6">
        <section className="grid gap-4 border-b pb-5 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
              <CalendarPlus className="size-3.5" />
              Manual deadline
            </div>
            <h1 className="text-2xl font-semibold tracking-normal">{client.displayName}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              User-provided deadlines are saved separately from official DueDateHQ verified tasks.
            </p>
          </div>
          <StatusBadge>
            <ShieldAlert className="size-3" />
            User provided - Not verified by DueDateHQ
          </StatusBadge>
        </section>

        {profiles.length === 0 ? (
          <section className="border bg-muted/20 p-5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CircleDashed className="size-4" />
              No filing profiles
            </div>
            <div className="mt-2 text-xs leading-5 text-muted-foreground">
              Add a filing profile before saving a manual deadline.
            </div>
            <Link
              to="/clients/$clientId"
              params={{ clientId }}
              className="mt-4 inline-flex h-8 items-center justify-center border border-input bg-background px-2.5 text-xs font-medium hover:bg-muted"
            >
              Back to client
            </Link>
          </section>
        ) : (
          <form className="grid gap-5" onSubmit={handleSubmit}>
            <section className="grid gap-4 border-b pb-5 md:grid-cols-2">
              <Field label="Filing profile" htmlFor="filing-profile">
                <select
                  id="filing-profile"
                  className="h-8 w-full border border-input bg-background px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
                  value={selectedProfileId}
                  onChange={(event) => setFilingProfileId(event.target.value)}
                  required
                >
                  {profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.displayName}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Tax type" htmlFor="tax-category">
                <Input
                  id="tax-category"
                  value={taxCategory}
                  onChange={(event) => setTaxCategory(event.target.value)}
                  required
                />
              </Field>

              <Field label="Jurisdiction" htmlFor="jurisdiction">
                <Input
                  id="jurisdiction"
                  value={jurisdiction}
                  onChange={(event) => setJurisdiction(event.target.value)}
                  required
                />
              </Field>

              <Field label="Form or obligation" htmlFor="form-obligation">
                <Input
                  id="form-obligation"
                  value={formOrObligation}
                  onChange={(event) => setFormOrObligation(event.target.value)}
                  required
                />
              </Field>

              <Field label="Filing/payment" htmlFor="deadline-kind">
                <select
                  id="deadline-kind"
                  className="h-8 w-full border border-input bg-background px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
                  value={deadlineKind}
                  onChange={(event) => setDeadlineKind(event.target.value as DeadlineKind)}
                >
                  {deadlineKindOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Priority" htmlFor="priority">
                <select
                  id="priority"
                  className="h-8 w-full border border-input bg-background px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as DeadlinePriority)}
                >
                  {priorityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Current due date" htmlFor="current-due-date">
                <Input
                  id="current-due-date"
                  type="date"
                  value={currentDueDate}
                  onChange={(event) => setCurrentDueDate(event.target.value)}
                  required
                />
              </Field>

              <Field label="Firm target date" htmlFor="firm-target-date">
                <Input
                  id="firm-target-date"
                  type="date"
                  value={firmTargetDate}
                  onChange={(event) => setFirmTargetDate(event.target.value)}
                />
              </Field>

              <Field label="Recurrence" htmlFor="recurrence">
                <select
                  id="recurrence"
                  className="h-8 w-full border border-input bg-background px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
                  value={recurrence}
                  onChange={(event) => setRecurrence(event.target.value as Recurrence)}
                >
                  {recurrenceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
            </section>

            <section className="grid gap-4 border-b pb-5">
              <Field label="Source note" htmlFor="source-note">
                <textarea
                  id="source-note"
                  className="min-h-24 w-full resize-y border border-input bg-background px-2.5 py-2 text-xs leading-5 outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
                  value={sourceNote}
                  onChange={(event) => setSourceNote(event.target.value)}
                  required
                />
              </Field>

              <label className="flex items-start gap-3 border bg-muted/20 p-3 text-xs leading-5">
                <Checkbox
                  checked={shouldRequestVerification}
                  onCheckedChange={(checked) => setShouldRequestVerification(checked === true)}
                  className="mt-0.5"
                />
                <span>
                  <span className="block font-medium">Request DueDateHQ verification</span>
                  <span className="block text-muted-foreground">
                    The saved deadline remains user-provided until a Verified rule exists.
                  </span>
                </span>
              </label>
            </section>

            {createManual.error || requestVerification.error ? (
              <div className="border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                {createManual.error?.message ?? requestVerification.error?.message}
              </div>
            ) : null}

            <div className="flex justify-end gap-2">
              <Link
                to="/clients/$clientId"
                params={{ clientId }}
                className="inline-flex h-8 items-center justify-center border border-input bg-background px-2.5 text-xs font-medium hover:bg-muted"
              >
                Cancel
              </Link>
              <Button type="submit" disabled={isSubmitting || !selectedProfileId}>
                <CalendarPlus className="size-3.5" />
                Save deadline
              </Button>
            </div>
          </form>
        )}
      </div>
    </main>
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

function StatusBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-7 items-center gap-1.5 border border-border bg-background px-2 text-xs font-medium text-muted-foreground">
      {children}
    </span>
  );
}
