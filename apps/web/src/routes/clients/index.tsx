import type { ClientListItemResponse } from "@due-date-hq/api/routers/clients";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@due-date-hq/ui/components/table";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Building2, CircleDashed, ExternalLink, UserPlus, Users } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
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

const createdViaLabels = {
  manual: "Manual",
  csv_import: "CSV import",
} as const;

function ClientsIndexComponent() {
  const clients = useQuery(trpc.clients.list.queryOptions());

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
        <section className="grid gap-4 border-b border-border pb-5 md:grid-cols-[1fr_auto] md:items-end">
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
          <NewClientLink />
        </section>

        {clientRows.length === 0 ? (
          <EmptyClientsState />
        ) : (
          <section className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/20 px-3 py-2">
              <div className="text-xs font-medium uppercase text-muted-foreground">
                Client relationships
              </div>
              <div className="text-xs text-muted-foreground">
                {clientRows.length} relationship{clientRows.length === 1 ? "" : "s"}
              </div>
            </div>
            <Table className="min-w-[860px]">
              <TableHeader>
                <TableRow className="bg-muted/40">
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
      </div>
    </main>
  );
}

function ClientRow({ client }: { client: ClientListItemResponse }) {
  return (
    <TableRow className="align-top">
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

function EmptyClientsState() {
  return (
    <section className="rounded-xl border border-border bg-muted/20 p-5">
      <div className="flex items-center gap-2 text-sm font-medium">
        <CircleDashed className="size-4" />
        No client relationships
      </div>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        Add a client relationship before importing tax information or reviewing deadline tasks in Tax Work.
      </p>
      <div className="mt-4">
        <NewClientLink />
      </div>
    </section>
  );
}

function NewClientLink() {
  return (
    <Link
      to="/clients/new"
      search={{ coverageObligationId: undefined as string | undefined }}
      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[6px] bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <UserPlus className="size-3.5" />
      New client relationship
    </Link>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
