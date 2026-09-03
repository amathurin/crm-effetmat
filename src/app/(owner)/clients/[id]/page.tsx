import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarPlus, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { formatDateShort, formatTimeRange } from "@/lib/datetime";
import { bookingStatusLabel, bookingStatusTone } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { getTimezone } from "@/lib/settings";
import { setClientArchived } from "../actions";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [client, tz] = await Promise.all([
    prisma.client.findUnique({
      where: { id },
      include: {
        bookings: {
          orderBy: { startAt: "desc" },
          include: { package: true },
        },
      },
    }),
    getTimezone(),
  ]);

  if (!client) notFound();

  const rows: { label: string; value?: string | null }[] = [
    { label: "Entreprise / courtier", value: client.company },
    { label: "Courriel", value: client.email },
    { label: "Téléphone", value: client.phone },
    { label: "Adresse de facturation", value: client.billingAddress },
  ];

  return (
    <>
      <PageHeader
        title={client.name}
        description={client.archived ? "Client archivé" : undefined}
        actions={
          <>
            <Link
              href={`/clients/${client.id}/modifier`}
              className={buttonVariants({ variant: "secondary" })}
            >
              <Pencil className="size-4" /> Modifier
            </Link>
            <Link
              href={`/agenda/nouveau?clientId=${client.id}`}
              className={buttonVariants()}
            >
              <CalendarPlus className="size-4" /> Rendez-vous
            </Link>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader>
            <CardTitle>Coordonnées</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {rows.map((r) => (
              <div key={r.label}>
                <p className="text-xs text-text-muted">{r.label}</p>
                <p className="text-sm text-text">{r.value || "—"}</p>
              </div>
            ))}
            {client.notes ? (
              <div>
                <p className="text-xs text-text-muted">Notes</p>
                <p className="whitespace-pre-wrap text-sm text-text">
                  {client.notes}
                </p>
              </div>
            ) : null}
            <form
              action={setClientArchived}
              className="mt-2 border-t border-border pt-3"
            >
              <input type="hidden" name="id" value={client.id} />
              <input
                type="hidden"
                name="archived"
                value={client.archived ? "false" : "true"}
              />
              <Button variant="ghost" size="sm" type="submit">
                {client.archived ? "Réactiver le client" : "Archiver le client"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Séances ({client.bookings.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {client.bookings.length === 0 ? (
              <div className="p-5">
                <EmptyState title="Aucune séance pour ce client" />
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {client.bookings.map((b) => (
                  <li key={b.id}>
                    <Link
                      href={`/agenda/${b.id}`}
                      className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 hover:bg-surface-muted"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-text">
                          {b.package?.name ?? "Séance"}
                        </p>
                        <p className="truncate text-xs text-text-muted">
                          {formatDateShort(b.startAt, tz)} ·{" "}
                          {formatTimeRange(b.startAt, b.endAt, tz)} ·{" "}
                          {b.propertyAddress}
                        </p>
                      </div>
                      <Badge tone={bookingStatusTone[b.status]}>
                        {bookingStatusLabel[b.status]}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
