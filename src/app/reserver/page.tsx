import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { mediaTypeLabel } from "@/lib/labels";
import { formatCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

export default async function ReserverPage() {
  const settings = await getSettings();

  if (!settings.publicBookingEnabled) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-text">
          La réservation en ligne est temporairement fermée. Merci de nous
          contacter directement.
        </p>
      </Card>
    );
  }

  const packages = await prisma.package.findMany({
    where: { active: true, onlineBookable: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text">Réserver une séance</h1>
        {settings.bookingIntroText ? (
          <p className="mt-2 whitespace-pre-wrap text-sm text-text-muted">
            {settings.bookingIntroText}
          </p>
        ) : (
          <p className="mt-2 text-sm text-text-muted">
            Choisissez une prestation, puis un créneau dans notre horaire.
          </p>
        )}
      </div>

      {packages.length === 0 ? (
        <Card className="p-8 text-center text-sm text-text-muted">
          Aucune prestation disponible pour le moment.
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {packages.map((p) => (
            <Link
              key={p.id}
              href={`/reserver/${p.id}`}
              className="group flex items-center justify-between gap-4 rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-sm transition-colors hover:border-primary"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-medium text-text">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  {p.name}
                </p>
                {p.description ? (
                  <p className="mt-1 text-sm text-text-muted">{p.description}</p>
                ) : null}
                <p className="mt-2 flex items-center gap-3 text-xs text-text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3.5" /> {p.durationMin} min
                  </span>
                  <span>{mediaTypeLabel[p.mediaType]}</span>
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <span className="font-semibold text-text">
                  {formatCents(p.priceCents)}
                </span>
                <ArrowRight className="size-4 text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {settings.taxesEnabled ? (
        <p className="text-xs text-text-muted">
          Les prix sont indiqués avant taxes (TPS + TVQ). La facture est envoyée
          après la séance.
        </p>
      ) : null}
    </div>
  );
}
