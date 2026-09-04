import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getAvailability } from "@/lib/availability";
import { mediaTypeLabel } from "@/lib/labels";
import { formatCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { BookingFlow } from "./booking-flow";

export default async function ReserverPackagePage({
  params,
}: {
  params: Promise<{ packageId: string }>;
}) {
  const { packageId } = await params;
  const settings = await getSettings();

  if (!settings.publicBookingEnabled) {
    return (
      <Card className="p-8 text-center text-sm text-text">
        La réservation en ligne est temporairement fermée.
      </Card>
    );
  }

  const pkg = await prisma.package.findUnique({ where: { id: packageId } });
  if (!pkg || !pkg.active || !pkg.onlineBookable) notFound();

  const { days } = await getAvailability({
    durationMin: pkg.durationMin,
    bufferMin: pkg.bufferMin,
  });

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/reserver"
        className="inline-flex items-center gap-1.5 self-start text-sm text-text-muted hover:text-text"
      >
        <ArrowLeft className="size-4" /> Toutes les prestations
      </Link>

      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold text-text">
          <span
            className="size-3 rounded-full"
            style={{ backgroundColor: pkg.color }}
          />
          {pkg.name}
        </h1>
        {pkg.description ? (
          <p className="mt-2 text-sm text-text-muted">{pkg.description}</p>
        ) : null}
        <p className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-1 text-text-muted">
            <Clock className="size-4" /> {pkg.durationMin} min
          </span>
          <span className="text-text-muted">{mediaTypeLabel[pkg.mediaType]}</span>
          <span className="font-semibold text-text">
            {formatCents(pkg.priceCents)}
            {settings.taxesEnabled ? (
              <span className="font-normal text-text-muted"> + taxes</span>
            ) : null}
          </span>
        </p>
        {pkg.deliverables ? (
          <p className="mt-2 text-xs text-text-muted">{pkg.deliverables}</p>
        ) : null}
      </div>

      <BookingFlow
        packageId={pkg.id}
        packageName={pkg.name}
        durationMin={pkg.durationMin}
        days={days}
      />
    </div>
  );
}
