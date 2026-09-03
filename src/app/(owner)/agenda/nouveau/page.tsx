import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { toDateTimeLocalValue } from "@/lib/datetime";
import { prisma } from "@/lib/prisma";
import { getTimezone } from "@/lib/settings";
import { BookingForm } from "../booking-form";

export const metadata = { title: "Nouveau rendez-vous — CRM" };

export default async function NouveauRendezVousPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; date?: string }>;
}) {
  const { clientId, date } = await searchParams;
  const [clients, packages, tz] = await Promise.all([
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

  let startAtLocal: string | undefined;
  if (date) {
    const parsed = new Date(`${date}T09:00`);
    if (!Number.isNaN(parsed.getTime())) {
      startAtLocal = toDateTimeLocalValue(parsed, tz);
    }
  }

  return (
    <>
      <PageHeader title="Nouveau rendez-vous" />
      <Card>
        <CardContent className="py-6">
          <BookingForm
            clients={clients}
            packages={packages}
            defaults={{ clientId, startAtLocal }}
          />
        </CardContent>
      </Card>
    </>
  );
}
