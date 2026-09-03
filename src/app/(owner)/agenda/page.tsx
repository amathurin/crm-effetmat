import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";
import { formatDate, formatTimeRange } from "@/lib/datetime";
import { bookingStatusLabel, bookingStatusTone } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { getTimezone } from "@/lib/settings";
import type { BookingStatus, Prisma } from "@prisma/client";

export const metadata = { title: "Agenda — CRM" };

const FILTERS: { key: string; label: string; status?: BookingStatus }[] = [
  { key: "tous", label: "Tous" },
  { key: "demandes", label: "Demandes", status: "REQUESTED" },
  { key: "confirmes", label: "Confirmés", status: "CONFIRMED" },
  { key: "termines", label: "Terminés", status: "COMPLETED" },
  { key: "annules", label: "Annulés", status: "CANCELLED" },
];

function dayKey(d: Date, tz: string) {
  return formatDate(d, tz);
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string }>;
}) {
  const { statut } = await searchParams;
  const active = FILTERS.find((f) => f.key === statut) ?? FILTERS[0];
  const tz = await getTimezone();

  const where: Prisma.BookingWhereInput = active.status
    ? { status: active.status }
    : {};

  const now = new Date();
  const [upcoming, past] = await Promise.all([
    prisma.booking.findMany({
      where: { ...where, startAt: { gte: startOfToday() } },
      orderBy: { startAt: "asc" },
      include: { client: true, package: true },
    }),
    prisma.booking.findMany({
      where: { ...where, startAt: { lt: startOfToday() } },
      orderBy: { startAt: "desc" },
      take: 25,
      include: { client: true, package: true },
    }),
  ]);

  const groups = new Map<string, typeof upcoming>();
  for (const b of upcoming) {
    const k = dayKey(b.startAt, tz);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(b);
  }

  return (
    <>
      <PageHeader
        title="Agenda"
        description="Tes séances à venir et passées."
        actions={
          <Link href="/agenda/nouveau" className={buttonVariants()}>
            <CalendarPlus className="size-4" /> Nouveau rendez-vous
          </Link>
        }
      />

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "tous" ? "/agenda" : `/agenda?statut=${f.key}`}
            className={cn(
              "rounded-full px-3 py-1 text-sm font-medium transition-colors",
              f.key === active.key
                ? "bg-primary text-primary-foreground"
                : "bg-surface text-text-muted hover:bg-surface-muted",
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-text">À venir</h2>
        {groups.size === 0 ? (
          <EmptyState title="Aucun rendez-vous à venir" />
        ) : (
          [...groups.entries()].map(([day, items]) => (
            <div key={day}>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-text-muted">
                {day}
              </p>
              <Card className="divide-y divide-border">
                {items.map((b) => (
                  <BookingRow key={b.id} b={b} tz={tz} />
                ))}
              </Card>
            </div>
          ))
        )}
      </section>

      {past.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-text">Passés</h2>
          <Card className="divide-y divide-border">
            {past.map((b) => (
              <BookingRow key={b.id} b={b} tz={tz} muted />
            ))}
          </Card>
        </section>
      ) : null}

      <p className="text-xs text-text-muted">
        Heure locale : {tz.replace("_", " ")}. {now.getFullYear()}
      </p>
    </>
  );
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function BookingRow({
  b,
  tz,
  muted,
}: {
  b: Prisma.BookingGetPayload<{ include: { client: true; package: true } }>;
  tz: string;
  muted?: boolean;
}) {
  return (
    <Link
      href={`/agenda/${b.id}`}
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 px-5 py-3 first:rounded-t-[var(--radius-card)] last:rounded-b-[var(--radius-card)] hover:bg-surface-muted",
        muted && "opacity-80",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: b.package?.color ?? "var(--color-border)" }}
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-text">
            {formatTimeRange(b.startAt, b.endAt, tz)} · {b.client.name}
          </p>
          <p className="truncate text-xs text-text-muted">
            {b.package ? `${b.package.name} · ` : ""}
            {b.propertyAddress}
          </p>
        </div>
      </div>
      <Badge tone={bookingStatusTone[b.status]}>
        {bookingStatusLabel[b.status]}
      </Badge>
    </Link>
  );
}
