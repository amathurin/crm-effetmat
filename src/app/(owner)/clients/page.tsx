import Link from "next/link";
import { Search, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const metadata = { title: "Clients — CRM" };

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; archives?: string }>;
}) {
  const { q, archives } = await searchParams;
  const showArchived = archives === "1";

  const where: Prisma.ClientWhereInput = {
    archived: showArchived ? undefined : false,
  };
  if (q && q.trim()) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { company: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  const clients = await prisma.client.findMany({
    where,
    orderBy: { name: "asc" },
    include: { _count: { select: { bookings: true } } },
  });

  return (
    <>
      <PageHeader
        title="Clients"
        description="Courtiers et agences avec qui tu travailles."
        actions={
          <Link href="/clients/nouveau" className={buttonVariants()}>
            <UserPlus className="size-4" /> Nouveau client
          </Link>
        }
      />

      <form className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
          <Input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Rechercher…"
            className="pl-8"
          />
        </div>
        {showArchived ? (
          <input type="hidden" name="archives" value="1" />
        ) : null}
        <button
          type="submit"
          className={buttonVariants({ variant: "secondary", size: "md" })}
        >
          Rechercher
        </button>
        <Link
          href={showArchived ? "/clients" : "/clients?archives=1"}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          {showArchived ? "Masquer les archivés" : "Voir les archivés"}
        </Link>
      </form>

      {clients.length === 0 ? (
        <EmptyState
          title="Aucun client"
          description={
            q
              ? "Aucun résultat pour cette recherche."
              : "Ajoute ton premier client pour commencer."
          }
          action={
            <Link href="/clients/nouveau" className={buttonVariants()}>
              Nouveau client
            </Link>
          }
        />
      ) : (
        <Card className="divide-y divide-border">
          {clients.map((c) => (
            <Link
              key={c.id}
              href={`/clients/${c.id}`}
              className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 first:rounded-t-[var(--radius-card)] last:rounded-b-[var(--radius-card)] hover:bg-surface-muted"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-medium text-text">
                  {c.name}
                  {c.archived ? <Badge>Archivé</Badge> : null}
                </p>
                <p className="truncate text-xs text-text-muted">
                  {[c.company, c.email].filter(Boolean).join(" · ")}
                </p>
              </div>
              <span className="text-xs text-text-muted">
                {c._count.bookings} séance{c._count.bookings > 1 ? "s" : ""}
              </span>
            </Link>
          ))}
        </Card>
      )}
    </>
  );
}
