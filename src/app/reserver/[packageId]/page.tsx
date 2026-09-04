import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, MapPin } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { getAvailability } from "@/lib/availability";
import { mediaTypeLabel } from "@/lib/labels";
import { formatCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { BookingFlow } from "./booking-flow";

export default async function ReserverPackagePage({
  params,
  searchParams,
}: {
  params: Promise<{ packageId: string }>;
  searchParams: Promise<{ adresse?: string }>;
}) {
  const { packageId } = await params;
  const { adresse } = await searchParams;
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

  const propertyAddress = adresse?.trim() || null;

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

      {propertyAddress ? (
        <AvailabilitySection
          pkg={pkg}
          propertyAddress={propertyAddress}
        />
      ) : (
        <AddressStep />
      )}
    </div>
  );
}

function AddressStep() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-6">
        <div className="flex items-start gap-3">
          <MapPin className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-medium text-text">
              Où la séance a-t-elle lieu ?
            </p>
            <p className="text-sm text-text-muted">
              L'adresse nous permet de proposer des heures réalistes en tenant
              compte du trajet depuis nos autres rendez-vous.
            </p>
          </div>
        </div>
        <form className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="Adresse de la propriété" htmlFor="adresse" className="flex-1">
            <Input
              id="adresse"
              name="adresse"
              placeholder="123 rue Principale, Québec, QC"
              required
              autoFocus
            />
          </Field>
          <Button type="submit">Voir les disponibilités</Button>
        </form>
      </CardContent>
    </Card>
  );
}

async function AvailabilitySection({
  pkg,
  propertyAddress,
}: {
  pkg: Awaited<ReturnType<typeof prisma.package.findUniqueOrThrow>>;
  propertyAddress: string;
}) {
  const { days } = await getAvailability({
    durationMin: pkg.durationMin,
    bufferMin: pkg.bufferMin,
    propertyAddress,
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-card)] border border-border bg-surface-muted px-4 py-2.5">
        <p className="flex items-center gap-2 text-sm text-text">
          <MapPin className="size-4 shrink-0 text-text-muted" />
          {propertyAddress}
        </p>
        <Link
          href={`/reserver/${pkg.id}`}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          Modifier
        </Link>
      </div>

      <BookingFlow
        packageId={pkg.id}
        packageName={pkg.name}
        durationMin={pkg.durationMin}
        propertyAddress={propertyAddress}
        days={days}
      />
    </div>
  );
}
