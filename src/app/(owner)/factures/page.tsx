import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";
import { formatDateShort } from "@/lib/datetime";
import { invoiceStatusLabel, invoiceStatusTone } from "@/lib/labels";
import { isOverdue } from "@/lib/invoice";
import { formatCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { getTimezone } from "@/lib/settings";
import type { Prisma } from "@prisma/client";

export const metadata = { title: "Factures — CRM" };

const FILTERS = [
  { key: "toutes", label: "Toutes" },
  { key: "brouillons", label: "Brouillons" },
  { key: "envoyees", label: "Envoyées" },
  { key: "retard", label: "En retard" },
  { key: "payees", label: "Payées" },
] as const;

export default async function FacturesPage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string }>;
}) {
  const { f } = await searchParams;
  const active = FILTERS.find((x) => x.key === f) ?? FILTERS[0];
  const tz = await getTimezone();
  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 86_400_000);

  const where: Prisma.InvoiceWhereInput = {};
  if (active.key === "brouillons") where.status = "DRAFT";
  else if (active.key === "envoyees") where.status = "SENT";
  else if (active.key === "payees") where.status = "PAID";
  else if (active.key === "retard")
    where.AND = [{ status: "SENT" }, { dueAt: { lt: now } }];

  const [invoices, openInvoices, recentPayments] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      include: { client: true },
    }),
    prisma.invoice.findMany({
      where: { status: "SENT" },
      select: { totalCents: true, amountPaidCents: true, dueAt: true, status: true },
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
  const overdueCents = openInvoices
    .filter((i) => isOverdue(i))
    .reduce((s, i) => s + (i.totalCents - i.amountPaidCents), 0);
  const collectedCents = recentPayments._sum.amountCents ?? 0;

  const stats = [
    { label: "À recevoir", value: formatCents(receivableCents) },
    { label: "En retard", value: formatCents(overdueCents) },
    { label: "Encaissé (30 j)", value: formatCents(collectedCents) },
  ];

  return (
    <>
      <PageHeader
        title="Factures"
        description="Créées depuis un rendez-vous terminé."
      />

      <div className="grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="py-4">
              <p className="text-xs text-text-muted">{s.label}</p>
              <p className="mt-1 text-lg font-semibold text-text">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((x) => (
          <Link
            key={x.key}
            href={x.key === "toutes" ? "/factures" : `/factures?f=${x.key}`}
            className={cn(
              "rounded-full px-3 py-1 text-sm font-medium transition-colors",
              x.key === active.key
                ? "bg-primary text-primary-foreground"
                : "bg-surface text-text-muted hover:bg-surface-muted",
            )}
          >
            {x.label}
          </Link>
        ))}
      </div>

      {invoices.length === 0 ? (
        <EmptyState
          title="Aucune facture"
          description="Ouvre un rendez-vous terminé puis « Créer la facture »."
        />
      ) : (
        <Card className="divide-y divide-border">
          {invoices.map((inv) => {
            const overdue = isOverdue(inv);
            return (
              <Link
                key={inv.id}
                href={`/factures/${inv.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 first:rounded-t-[var(--radius-card)] last:rounded-b-[var(--radius-card)] hover:bg-surface-muted"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text">
                    {inv.number ?? "Brouillon"}
                    <span className="text-text-muted"> · {inv.client.name}</span>
                  </p>
                  <p className="text-xs text-text-muted">
                    {inv.issuedAt
                      ? `Émise le ${formatDateShort(inv.issuedAt, tz)}`
                      : `Créée le ${formatDateShort(inv.createdAt, tz)}`}
                    {inv.dueAt && inv.status === "SENT"
                      ? ` · échéance ${formatDateShort(inv.dueAt, tz)}`
                      : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-text">
                    {formatCents(inv.totalCents)}
                  </span>
                  <Badge
                    tone={
                      overdue ? "danger" : invoiceStatusTone[inv.status]
                    }
                  >
                    {overdue ? "En retard" : invoiceStatusLabel[inv.status]}
                  </Badge>
                </div>
              </Link>
            );
          })}
        </Card>
      )}
    </>
  );
}
