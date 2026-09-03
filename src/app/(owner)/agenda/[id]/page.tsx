import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { formatDate, formatDateTime, formatTimeRange } from "@/lib/datetime";
import {
  bookingSourceLabel,
  bookingStatusLabel,
  bookingStatusTone,
  invoiceStatusLabel,
  invoiceStatusTone,
} from "@/lib/labels";
import { formatCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { getTimezone } from "@/lib/settings";
import type { BookingStatus } from "@prisma/client";
import { createInvoiceAction } from "../../factures/actions";
import { setBookingStatus } from "../actions";
import { DeleteBookingButton } from "../delete-booking-button";

const NEXT_STATUS: { label: string; status: BookingStatus }[] = [
  { label: "Marquer confirmé", status: "CONFIRMED" },
  { label: "Marquer terminé", status: "COMPLETED" },
  { label: "Annuler la séance", status: "CANCELLED" },
  { label: "Repasser en demande", status: "REQUESTED" },
];

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [booking, tz] = await Promise.all([
    prisma.booking.findUnique({
      where: { id },
      include: { client: true, package: true, invoice: true },
    }),
    getTimezone(),
  ]);
  if (!booking) notFound();

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "Client", value: (
      <Link href={`/clients/${booking.clientId}`} className="text-primary hover:underline">
        {booking.client.name}
      </Link>
    ) },
    { label: "Forfait", value: booking.package?.name ?? "Sur mesure" },
    {
      label: "Quand",
      value: `${formatDate(booking.startAt, tz)} · ${formatTimeRange(booking.startAt, booking.endAt, tz)}`,
    },
    { label: "Propriété", value: booking.propertyAddress },
    {
      label: "Prix du forfait",
      value: booking.package ? formatCents(booking.package.priceCents) : "—",
    },
    { label: "Origine", value: bookingSourceLabel[booking.source] },
  ];

  return (
    <>
      <PageHeader
        title={booking.client.name}
        description={formatDateTime(booking.startAt, tz)}
        actions={
          <Link
            href={`/agenda/${booking.id}/modifier`}
            className={buttonVariants({ variant: "secondary" })}
          >
            <Pencil className="size-4" /> Modifier
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Détails</CardTitle>
            <Badge tone={bookingStatusTone[booking.status]}>
              {bookingStatusLabel[booking.status]}
            </Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {rows.map((r) => (
              <div key={r.label}>
                <p className="text-xs text-text-muted">{r.label}</p>
                <p className="text-sm text-text">{r.value}</p>
              </div>
            ))}
            {booking.notes ? (
              <div>
                <p className="text-xs text-text-muted">Notes</p>
                <p className="whitespace-pre-wrap text-sm text-text">
                  {booking.notes}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Facturation</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {booking.invoice ? (
                <Link
                  href={`/factures/${booking.invoice.id}`}
                  className="flex items-center justify-between gap-2 rounded-lg bg-surface-muted px-3 py-2 text-sm hover:bg-border/40"
                >
                  <span className="font-medium">
                    {booking.invoice.number
                      ? `Facture ${booking.invoice.number}`
                      : "Brouillon de facture"}
                  </span>
                  <Badge tone={invoiceStatusTone[booking.invoice.status]}>
                    {invoiceStatusLabel[booking.invoice.status]}
                  </Badge>
                </Link>
              ) : (
                <form action={createInvoiceAction}>
                  <input type="hidden" name="bookingId" value={booking.id} />
                  <Button
                    type="submit"
                    size="sm"
                    variant="secondary"
                    className="w-full justify-start"
                  >
                    Créer la facture
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Statut</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {NEXT_STATUS.filter((s) => s.status !== booking.status).map((s) => (
                <form key={s.status} action={setBookingStatus}>
                  <input type="hidden" name="id" value={booking.id} />
                  <input type="hidden" name="status" value={s.status} />
                  <Button
                    variant="secondary"
                    size="sm"
                    type="submit"
                    className="w-full justify-start"
                  >
                    {s.label}
                  </Button>
                </form>
              ))}
              <div className="mt-2 border-t border-border pt-2">
                {booking.invoice ? (
                  <p className="px-1 text-xs text-text-muted">
                    Ce rendez-vous est rattaché à une facture et ne peut pas être
                    supprimé.
                  </p>
                ) : (
                  <DeleteBookingButton id={booking.id} />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
