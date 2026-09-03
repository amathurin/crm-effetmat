import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { toDateTimeLocalValue } from "@/lib/datetime";
import { prisma } from "@/lib/prisma";
import { getTimezone } from "@/lib/settings";
import { BookingForm } from "../../booking-form";

export const metadata = { title: "Modifier le rendez-vous — CRM" };

export default async function ModifierRendezVousPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [booking, clients, packages, tz] = await Promise.all([
    prisma.booking.findUnique({ where: { id } }),
    prisma.client.findMany({
      where: { archived: false },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.package.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, durationMin: true },
    }),
    getTimezone(),
  ]);
  if (!booking) notFound();

  // s'assurer que le client / forfait du rendez-vous figure dans les listes
  const clientOptions = clients.some((c) => c.id === booking.clientId)
    ? clients
    : [
        ...clients,
        await prisma.client
          .findUnique({
            where: { id: booking.clientId },
            select: { id: true, name: true },
          })
          .then((c) => c ?? { id: booking.clientId, name: "Client" }),
      ];

  return (
    <>
      <PageHeader title="Modifier le rendez-vous" />
      <Card>
        <CardContent className="py-6">
          <BookingForm
            clients={clientOptions}
            packages={packages}
            booking={{
              id: booking.id,
              clientId: booking.clientId,
              packageId: booking.packageId,
              propertyAddress: booking.propertyAddress,
              startAtLocal: toDateTimeLocalValue(booking.startAt, tz),
              endAtLocal: toDateTimeLocalValue(booking.endAt, tz),
              status: booking.status,
              notes: booking.notes,
            }}
          />
        </CardContent>
      </Card>
    </>
  );
}
