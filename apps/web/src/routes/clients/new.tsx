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
import { Textarea } from "@due-date-hq/ui/components/textarea";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Building2, CircleDashed, UserPlus } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/clients/new")({
  validateSearch: (search) => ({
    coverageObligationId:
      typeof search.coverageObligationId === "string"
        ? search.coverageObligationId
        : undefined,
  }),
  component: NewClientComponent,
});

type RelationshipType = "individual" | "business" | "household" | "related_group";

const relationshipTypeOptions = [
  { value: "individual", label: "Individual" },
  { value: "business", label: "Business" },
  { value: "household", label: "Household" },
  { value: "related_group", label: "Related group" },
] as const satisfies readonly { value: RelationshipType; label: string }[];

function NewClientComponent() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [displayName, setDisplayName] = React.useState("");
  const [relationshipType, setRelationshipType] = React.useState<RelationshipType>("business");
  const [notes, setNotes] = React.useState("");

  const createRelationship = useMutation(
    trpc.clients.createRelationship.mutationOptions({
      onError: (error) => toast.error(error.message),
      onSuccess: (result) => {
        toast.success("Client relationship created.");
        void navigate({
          to: "/clients/$clientId",
          params: { clientId: result.client.id },
        });
      },
    }),
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createRelationship.mutate({
      displayName,
      relationshipType,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <main className="min-h-0 overflow-auto">
      <div className="mx-auto flex max-w-4xl flex-col gap-6 px-5 py-6">
        <section className="grid gap-4 border-b border-border pb-5 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
              <Building2 className="size-3.5" />
              Manual entry
            </div>
            <h1 className="text-2xl font-semibold tracking-normal">New client relationship</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Create the firm-owned relationship first, then add filing profiles and
              user-provided deadline tasks.
            </p>
          </div>
          {search.coverageObligationId ? (
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <CircleDashed className="size-3.5" />
                Coverage gap path
              </div>
              <div className="mt-1 font-mono">{search.coverageObligationId}</div>
            </div>
          ) : null}
        </section>

        <form className="grid gap-5" onSubmit={handleSubmit}>
          <section className="grid gap-4 border-b border-border pb-5">
            <Field label="Display name" htmlFor="display-name">
              <Input
                id="display-name"
                autoComplete="organization"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                required
              />
            </Field>

            <Field label="Relationship type" htmlFor="relationship-type">
              <Select
                value={relationshipType}
                onValueChange={(value) => setRelationshipType(value as RelationshipType)}
              >
                <SelectTrigger className="h-8 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {relationshipTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Notes" htmlFor="notes">
              <Textarea
                id="notes"
                className="min-h-24"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </Field>
          </section>

          <div className="flex justify-end">
            <Button type="submit" disabled={createRelationship.isPending}>
              <UserPlus className="size-3.5" />
              Create relationship
            </Button>
          </div>
        </form>
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
