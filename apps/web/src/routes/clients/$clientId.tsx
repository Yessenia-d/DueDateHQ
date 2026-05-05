import { Link, createFileRoute } from "@tanstack/react-router";
import { Building2, ClipboardList } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { trpc } from "@/utils/trpc";

import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/clients/$clientId")({
  component: ClientDetailComponent,
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

function ClientDetailComponent() {
  const { clientId } = Route.useParams();
  const clientDetail = useQuery(trpc.clients.get.queryOptions({ clientId }));

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

  const { client } = clientDetail.data;

  return (
    <main className="min-h-0 overflow-auto">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-6">
        <section className="grid gap-4 border-b border-border pb-5 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
              <Building2 className="size-3.5" />
              Client
            </div>
            <h1 className="text-2xl font-semibold tracking-normal">{client.displayName}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status="neutral">
                {relationshipTypeLabels[client.relationshipType]}
              </StatusBadge>
              <StatusBadge status="neutral">{createdViaLabels[client.createdVia]}</StatusBadge>
            </div>
            {client.notes ? (
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                {client.notes}
              </p>
            ) : null}
          </div>
          <Link
            to="/tax-work"
            search={{ clientIds: clientId }}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-input bg-card px-2.5 text-xs font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ClipboardList className="size-3.5" />
            View in Tax Work
          </Link>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="border border-border bg-muted/20 p-4">
            <h2 className="text-base font-semibold">Customer information</h2>
            <dl className="mt-3 grid gap-3 text-sm">
              <InfoRow label="Relationship type" value={relationshipTypeLabels[client.relationshipType]} />
              <InfoRow label="Created via" value={createdViaLabels[client.createdVia]} />
              <InfoRow label="Created" value={formatDateTime(client.createdAt)} />
              <InfoRow label="Updated" value={formatDateTime(client.updatedAt)} />
            </dl>
          </div>

          <div className="border border-border bg-muted/20 p-4">
            <h2 className="text-base font-semibold">Tax work belongs in Tax Work</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Import tax information, review filing profiles, and manage deadline tasks from the
              Tax Work page after selecting this client or multiple clients.
            </p>
            <Link
              to="/tax-work"
              search={{ clientIds: clientId }}
              className="mt-4 inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ClipboardList className="size-3.5" />
              Open Tax Work
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <dt className="text-xs font-medium uppercase text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
