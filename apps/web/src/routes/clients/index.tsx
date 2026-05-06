import type { ClientListItemResponse } from "@due-date-hq/api/routers/clients";
import { Button } from "@due-date-hq/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@due-date-hq/ui/components/dialog";
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Building2, CircleDashed, ExternalLink, UserPlus, Users } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/utils/date-format";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/clients/")({
  component: ClientsIndexComponent,
});

const relationshipTypeLabels = {
  individual: "Individual",
  business: "Business",
  household: "Household",
  related_group: "Related group",
} as const;

type RelationshipType = keyof typeof relationshipTypeLabels;

const relationshipTypeOptions = [
  { value: "individual", label: "Individual" },
  { value: "business", label: "Business" },
  { value: "household", label: "Household" },
  { value: "related_group", label: "Related group" },
] as const satisfies readonly { value: RelationshipType; label: string }[];

const createdViaLabels = {
  manual: "Manual",
  csv_import: "CSV import",
} as const;

function ClientsIndexComponent() {
  const clients = useQuery(trpc.clients.list.queryOptions());
  const [isNewClientOpen, setIsNewClientOpen] = React.useState(false);

  if (clients.isPending) {
    return (
      <main className="min-h-0 overflow-auto">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-6">
          <div className="h-24 animate-pulse rounded-xl border border-border bg-card" />
          <div className="h-96 animate-pulse rounded-xl border border-border bg-card" />
        </div>
      </main>
    );
  }

  if (clients.isError) {
    return (
      <main className="min-h-0 overflow-auto">
        <div className="mx-auto max-w-7xl px-5 py-6">
          <div className="rounded-xl border border-ddhq-risk/30 bg-ddhq-risk-soft p-4 text-sm text-ddhq-risk">
            Client relationships could not be loaded.
          </div>
        </div>
      </main>
    );
  }

  const clientRows = clients.data.clients;

  return (
    <main className="min-h-0 overflow-auto">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-6">
        <section className="grid gap-4 pb-5 md:grid-cols-[1fr_auto] md:items-end">
          <div className="max-w-3xl">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
              <Users className="size-3.5" />
              Firm workspace
            </div>
            <h1 className="text-2xl font-semibold tracking-normal">Clients</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Maintain customer records. Tax information, imports, and deadline tasks live in Tax Work.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <NewClientButton onClick={() => setIsNewClientOpen(true)} variant="outline" />
          </div>
        </section>

        {clientRows.length === 0 ? (
          <EmptyClientsState onAddClient={() => setIsNewClientOpen(true)} />
        ) : (
          <section className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/20 px-3 py-2">
              <div className="text-xs font-medium uppercase text-muted-foreground">
                Client relationships
              </div>
              <div className="text-xs text-muted-foreground">
                {clientRows.length} relationship{clientRows.length === 1 ? "" : "s"}
              </div>
            </div>
            <Table className="min-w-[860px]">
              <TableHeader className="[&_tr]:border-b-0">
                <TableRow className="border-b-0 bg-muted/40">
                  <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground">
                    Client
                  </TableHead>
                  <TableHead className="w-36 text-[11px] font-semibold uppercase text-muted-foreground">
                    Type
                  </TableHead>
                  <TableHead className="w-36 text-[11px] font-semibold uppercase text-muted-foreground">
                    Source
                  </TableHead>
                  <TableHead className="w-36 text-[11px] font-semibold uppercase text-muted-foreground">
                    Updated
                  </TableHead>
                  <TableHead className="w-24 text-right text-[11px] font-semibold uppercase text-muted-foreground">
                    Open
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientRows.map((client) => (
                  <ClientRow key={client.id} client={client} />
                ))}
              </TableBody>
            </Table>
          </section>
        )}

        <NewClientDialog open={isNewClientOpen} onOpenChange={setIsNewClientOpen} />
      </div>
    </main>
  );
}

function ClientRow({ client }: { client: ClientListItemResponse }) {
  return (
    <TableRow className="border-b-0 align-top">
      <TableCell className="max-w-xl whitespace-normal">
        <Link
          to="/clients/$clientId"
          params={{ clientId: client.id }}
          className="inline-flex max-w-[28rem] items-center gap-2 text-sm font-medium text-foreground underline-offset-2 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">{client.displayName}</span>
        </Link>
        {client.notes ? (
          <div className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">
            {client.notes}
          </div>
        ) : null}
      </TableCell>
      <TableCell>
        <StatusBadge status="neutral">
          {relationshipTypeLabels[client.relationshipType]}
        </StatusBadge>
      </TableCell>
      <TableCell>
        <StatusBadge status="neutral">{createdViaLabels[client.createdVia]}</StatusBadge>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {formatDate(client.updatedAt)}
      </TableCell>
      <TableCell className="text-right">
        <Link
          to="/clients/$clientId"
          params={{ clientId: client.id }}
          aria-label={`Open ${client.displayName}`}
          className="inline-flex h-7 items-center justify-center gap-1 rounded-[6px] border border-border bg-background px-2 text-xs font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ExternalLink className="size-3" />
          Open
        </Link>
      </TableCell>
    </TableRow>
  );
}

function EmptyClientsState({ onAddClient }: { onAddClient: () => void }) {
  return (
    <section className="rounded-xl border border-border bg-muted/20 p-5">
      <div className="flex items-center gap-2 text-sm font-medium">
        <CircleDashed className="size-4" />
        No client relationships
      </div>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        Create a client relationship manually when you only need one record.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <NewClientButton onClick={onAddClient} variant="outline" />
      </div>
    </section>
  );
}

function NewClientButton({
  onClick,
  variant = "default",
}: {
  onClick: () => void;
  variant?: "default" | "outline";
}) {
  return (
    <Button
      type="button"
      variant={variant}
      onClick={onClick}
      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[6px] px-2.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <UserPlus className="size-3.5" />
      New client relationship
    </Button>
  );
}

function NewClientDialog({
  onOpenChange,
  open,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = React.useState("");
  const [relationshipType, setRelationshipType] =
    React.useState<RelationshipType>("business");
  const [notes, setNotes] = React.useState("");

  const createRelationship = useMutation(
    trpc.clients.createRelationship.mutationOptions({
      onError: (error) => toast.error(error.message),
      onSuccess: (result) => {
        toast.success("Client relationship created.");
        setDisplayName("");
        setRelationshipType("business");
        setNotes("");
        onOpenChange(false);
        void queryClient.invalidateQueries(trpc.clients.list.queryFilter());
        void navigate({
          to: "/clients/$clientId",
          params: { clientId: result.client.id },
        });
      },
    }),
  );

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && createRelationship.isPending) return;
    onOpenChange(nextOpen);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createRelationship.mutate({
      displayName,
      relationshipType,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="px-5 pb-3 pt-5">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
            <Building2 className="size-3.5" />
            Manual entry
          </div>
          <DialogTitle className="text-base font-semibold">
            New client relationship
          </DialogTitle>
          <DialogDescription className="mt-1 max-w-md">
            Create the firm-owned relationship first, then add filing profiles and
            entered deadline tasks.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-5 px-5 pb-5" onSubmit={handleSubmit}>
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

          <DialogFooter className="flex-row justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={createRelationship.isPending}
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createRelationship.isPending}>
              <UserPlus className="size-3.5" />
              Create relationship
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
