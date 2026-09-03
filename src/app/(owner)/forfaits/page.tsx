import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { mediaTypeLabel } from "@/lib/labels";
import { formatCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import type { MediaType } from "@prisma/client";

export const metadata = { title: "Forfaits — CRM" };

export default async function ForfaitsPage() {
  const packages = await prisma.package.findMany({
    orderBy: [{ active: "desc" }, { sortOrder: "asc" }],
    include: { _count: { select: { bookings: true } } },
  });

  return (
    <>
      <PageHeader
        title="Forfaits"
        description="Les prestations que tes clients peuvent réserver."
        actions={
          <Link href="/forfaits/nouveau" className={buttonVariants()}>
            <Plus className="size-4" /> Nouveau forfait
          </Link>
        }
      />

      {packages.length === 0 ? (
        <EmptyState
          title="Aucun forfait"
          description="Crée tes prestations (photo, vidéo, drone…) avec leur durée et leur prix."
          action={
            <Link href="/forfaits/nouveau" className={buttonVariants()}>
              Nouveau forfait
            </Link>
          }
        />
      ) : (
        <Card className="divide-y divide-border">
          {packages.map((p) => (
            <Link
              key={p.id}
              href={`/forfaits/${p.id}/modifier`}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 first:rounded-t-[var(--radius-card)] last:rounded-b-[var(--radius-card)] hover:bg-surface-muted"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className="mt-1 size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: p.color }}
                />
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-text">
                    {p.name}
                    {!p.active ? <Badge>Inactif</Badge> : null}
                    {p.active && !p.onlineBookable ? (
                      <Badge tone="info">Hors ligne</Badge>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-text-muted">
                    {mediaTypeLabel[p.mediaType as MediaType]} · {p.durationMin}{" "}
                    min · {p._count.bookings} séance
                    {p._count.bookings > 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <span className="text-sm font-semibold text-text">
                {formatCents(p.priceCents)}
              </span>
            </Link>
          ))}
        </Card>
      )}
    </>
  );
}
