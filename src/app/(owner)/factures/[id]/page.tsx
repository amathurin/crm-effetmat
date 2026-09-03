import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { InvoiceTable } from "@/components/invoice-table";
import { formatDateShort } from "@/lib/datetime";
import { invoiceStatusLabel, invoiceStatusTone } from "@/lib/labels";
import { isOverdue } from "@/lib/invoice";
import { formatCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { stripeEnabled } from "@/lib/stripe";
import {
  deleteLineItem,
  markPaidAction,
  resendInvoiceAction,
  voidInvoiceAction,
} from "../actions";
import { AddLineForm } from "./add-line-form";
import { FinalizeButton } from "./finalize-button";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [invoice, settings] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id },
      include: {
        client: true,
        booking: true,
        lineItems: { orderBy: { sortOrder: "asc" } },
        payments: { orderBy: { paidAt: "desc" } },
      },
    }),
    getSettings(),
  ]);
  if (!invoice) notFound();

  const tz = settings.timezone;
  const isDraft = invoice.status === "DRAFT";
  const overdue = isOverdue(invoice);
  const publicUrl = `${process.env.APP_URL ?? "http://localhost:3000"}/facture/${invoice.publicToken}`;

  return (
    <>
      <PageHeader
        title={invoice.number ? `Facture ${invoice.number}` : "Brouillon de facture"}
        description={
          <>
            <Link
              href={`/clients/${invoice.clientId}`}
              className="text-primary hover:underline"
            >
              {invoice.client.name}
            </Link>
            {invoice.booking ? (
              <>
                {" · "}
                <Link
                  href={`/agenda/${invoice.bookingId}`}
                  className="text-primary hover:underline"
                >
                  rendez-vous
                </Link>
              </>
            ) : null}
          </>
        }
        actions={
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: "secondary" })}
          >
            <ExternalLink className="size-4" /> Page client
          </a>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Lignes</CardTitle>
            <Badge tone={overdue ? "danger" : invoiceStatusTone[invoice.status]}>
              {overdue ? "En retard" : invoiceStatusLabel[invoice.status]}
            </Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <InvoiceTable
              lineItems={invoice.lineItems}
              subtotalCents={invoice.subtotalCents}
              gstCents={invoice.gstCents}
              qstCents={invoice.qstCents}
              totalCents={invoice.totalCents}
              gstRate={Number(settings.gstRate)}
              qstRate={Number(settings.qstRate)}
              showTaxes={settings.taxesEnabled}
              action={
                isDraft
                  ? (l) => (
                      <form action={deleteLineItem}>
                        <input type="hidden" name="invoiceId" value={invoice.id} />
                        <input type="hidden" name="itemId" value={l.id} />
                        <button
                          type="submit"
                          aria-label="Supprimer la ligne"
                          className="text-text-muted hover:text-danger"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </form>
                    )
                  : undefined
              }
            />
            {isDraft ? <AddLineForm invoiceId={invoice.id} /> : null}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {isDraft ? (
                <FinalizeButton
                  invoiceId={invoice.id}
                  stripeEnabled={stripeEnabled()}
                />
              ) : null}

              {invoice.status === "SENT" ? (
                <>
                  <form action={markPaidAction} className="flex flex-col gap-2">
                    <input type="hidden" name="invoiceId" value={invoice.id} />
                    <select
                      name="method"
                      className="h-9 rounded-lg border border-border bg-surface px-3 text-sm"
                      defaultValue="virement Interac"
                    >
                      <option>virement Interac</option>
                      <option>chèque</option>
                      <option>comptant</option>
                      <option>carte (hors ligne)</option>
                      <option>manuel</option>
                    </select>
                    <Button type="submit" className="w-full">
                      Marquer payée
                    </Button>
                  </form>
                  <form action={resendInvoiceAction}>
                    <input type="hidden" name="invoiceId" value={invoice.id} />
                    <Button type="submit" variant="secondary" size="sm" className="w-full">
                      Renvoyer le courriel
                    </Button>
                  </form>
                </>
              ) : null}

              {invoice.hostedInvoiceUrl ? (
                <a
                  href={invoice.hostedInvoiceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonVariants({ variant: "secondary", size: "sm" })}
                >
                  <ExternalLink className="size-4" /> Facture Stripe
                </a>
              ) : null}

              {invoice.status !== "PAID" && invoice.status !== "VOID" ? (
                <form action={voidInvoiceAction}>
                  <input type="hidden" name="invoiceId" value={invoice.id} />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    className="w-full text-danger"
                  >
                    Annuler la facture
                  </Button>
                </form>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <Row label="Créée" value={formatDateShort(invoice.createdAt, tz)} />
              {invoice.issuedAt ? (
                <Row label="Émise" value={formatDateShort(invoice.issuedAt, tz)} />
              ) : null}
              {invoice.dueAt ? (
                <Row label="Échéance" value={formatDateShort(invoice.dueAt, tz)} />
              ) : null}
              {invoice.paidAt ? (
                <Row
                  label="Payée le"
                  value={formatDateShort(invoice.paidAt, tz)}
                />
              ) : null}
              <Row label="Total" value={formatCents(invoice.totalCents)} />
              {invoice.payments.length > 0 ? (
                <div className="mt-1 border-t border-border pt-2">
                  <p className="text-xs text-text-muted">Paiements</p>
                  {invoice.payments.map((p) => (
                    <p key={p.id} className="text-sm text-text">
                      {formatCents(p.amountCents)} — {p.method} (
                      {formatDateShort(p.paidAt, tz)})
                    </p>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-text-muted">{label}</span>
      <span className="text-text">{value}</span>
    </div>
  );
}
