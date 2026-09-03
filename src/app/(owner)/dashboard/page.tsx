import Link from "next/link";
import { CalendarPlus, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import {
  formatDate,
  formatTimeRange,
} from "@/lib/datetime";
import {
  bookingStatusLabel,
  bookingStatusTone,
} from "@/lib/labels";
import { formatCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { getTimezone } from "@/lib/settings";

export const metadata = { title: "Tableau de bord — CRM" };

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default async function DashboardPage() {
  const tz = await getTimezone();
  const now = new Date();
  const weekAhead = new Date(now.getTime() + 7 * 86_400_000);
  const monthAgo = new Date(now.getTime() - 30 * 86_400_000);

  const [
    upcoming,
    weekCount,
    requestedCount,
    toInvoiceCount,
    openInvoices,
    recentPayments,
  ] = await Promise.all([
    prisma.booking.findMany({
      where: {
        startAt: { gte: startOfDay() },
        status: { in: ["REQUESTED", "CONFIRMED"] },
      },
      orderBy: { startAt: "asc" },
      take: 6,
      include: { client: true, package: true },
    }),
    prisma.booking.count({
      where: {
        startAt: { gte: now, lt: weekAhead },
        status: { not: "CANCELLED" },
      },
    }),
    prisma.booking.count({ where: { status: "REQUESTED" } }),
    prisma.booking.count({
      where: { status: "COMPLETED", invoice: { is: null } },
    }),
    prisma.invoice.findMany({
      where: { status: "SENT" },
      select: { totalCents: true, amountPaidCents: true, dueAt: true },
    }),
    prisma.payment.aggregate({
      where: { paidAt: { gte: monthAgo } },
      _sum: { amountCents: true },
    }),
  ]);

  const receivableCents = openInvoices.reduce(
    (s, i) => s + (i.totalCents - i.amountPaidCents),
    0,
  );
  const overdueCount = openInvoices.filter(
    (i) => i.dueAt != null && i.dueAt.getTime() < now.getTime(),
  ).length;
  const collectedCents = recentPayments._sum.amountCents ?? 0;

  const stats = [
    { label: "Rendez-vous cette semaine", value: String(weekCount) },
    { label: "Demandes à traiter", value: String(requestedCount) },
    { label: "À recevoir", value: formatCents(receivableCents) },
    { label: "Encaissé (30 j)", value: formatCents(collectedCents) },
  ];

  return (
    <>
      <PageHeader
        title="Tableau de bord"
        description="Vue d'ensemble de ton activité."
        actions={
          <>
            <Link
              href="/clients/nouveau"
              className={buttonVariants({ variant: "secondary" })}
            >
              <UserPlus className="size-4" /> Client
            </Link>
            <Link href="/agenda/nouveau" className={buttonVariants()}>
              <CalendarPlus className="size-4" /> Rendez-vous
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="py-4">
              <p className="text-xs text-text-muted">{s.label}</p>
              <p className="mt-1 text-lg font-semibold text-text">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {overdueCount > 0 ? (
        <Link
          href="/factures?f=retard"
          className="rounded-[var(--radius-card)] border border-danger/30 bg-danger-bg px-4 py-3 text-sm font-medium text-danger hover:opacity-90"
        >
          {overdueCount} facture{overdueCount > 1 ? "s" : ""} en retard — à relancer.
        </Link>
      ) : null}

      {toInvoiceCount > 0 ? (
        <Link
          href="/agenda?statut=termines"
          className="rounded-[var(--radius-card)] border border-warning/30 bg-warning-bg px-4 py-3 text-sm text-warning hover:opacity-90"
        >
          {toInvoiceCount} séance{toInvoiceCount > 1 ? "s" : ""} terminée
          {toInvoiceCount > 1 ? "s" : ""} sans facture — à facturer.
        </Link>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Prochains rendez-vous</CardTitle>
          <Link
            href="/agenda"
            className={buttonVariants({ variant: "link", size: "sm" })}
          >
            Voir l'agenda
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {upcoming.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="Aucun rendez-vous à venir"
                description="Les séances confirmées et demandées apparaîtront ici."
              />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {upcoming.map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/agenda/${b.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 hover:bg-surface-muted"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text">
                        {b.client.name}
                        {b.package ? (
                          <span className="text-text-muted">
                            {" "}
                            — {b.package.name}
                          </span>
                        ) : null}
                      </p>
                      <p className="truncate text-xs text-text-muted">
                        {formatDate(b.startAt, tz)} ·{" "}
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
    </>
  );
}
