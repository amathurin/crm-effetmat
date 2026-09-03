import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { InvoiceTable } from "@/components/invoice-table";
import { formatDateShort } from "@/lib/datetime";
import { isOverdue } from "@/lib/invoice";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [invoice, settings] = await Promise.all([
    prisma.invoice.findUnique({
      where: { publicToken: token },
      include: {
        client: true,
        lineItems: { orderBy: { sortOrder: "asc" } },
      },
    }),
    getSettings(),
  ]);

  if (!invoice || invoice.status === "DRAFT") notFound();

  const tz = settings.timezone;
  const overdue = isOverdue(invoice);
  const paid = invoice.status === "PAID";
  const voided = invoice.status === "VOID";

  return (
    <Card>
      <CardContent className="flex flex-col gap-6 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-lg font-semibold text-text">
              {settings.businessName || "Facture"}
            </p>
            {settings.businessAddress ? (
              <p className="text-sm text-text-muted">
                {settings.businessAddress}
              </p>
            ) : null}
            {settings.businessEmail ? (
              <p className="text-sm text-text-muted">{settings.businessEmail}</p>
            ) : null}
            {settings.taxesEnabled && (settings.gstNumber || settings.qstNumber) ? (
              <p className="mt-1 text-xs text-text-muted">
                {settings.gstNumber ? `TPS ${settings.gstNumber}` : ""}
                {settings.gstNumber && settings.qstNumber ? " · " : ""}
                {settings.qstNumber ? `TVQ ${settings.qstNumber}` : ""}
              </p>
            ) : null}
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-text">
              Facture {invoice.number}
            </p>
            {invoice.issuedAt ? (
              <p className="text-xs text-text-muted">
                Émise le {formatDateShort(invoice.issuedAt, tz)}
              </p>
            ) : null}
            {invoice.dueAt && !paid ? (
              <p className="text-xs text-text-muted">
                Échéance : {formatDateShort(invoice.dueAt, tz)}
              </p>
            ) : null}
          </div>
        </div>

        <div>
          <p className="text-xs text-text-muted">Facturé à</p>
          <p className="text-sm font-medium text-text">{invoice.client.name}</p>
          {invoice.client.company ? (
            <p className="text-sm text-text-muted">{invoice.client.company}</p>
          ) : null}
          {invoice.client.billingAddress ? (
            <p className="text-sm text-text-muted">
              {invoice.client.billingAddress}
            </p>
          ) : null}
        </div>

        <InvoiceTable
          lineItems={invoice.lineItems}
          subtotalCents={invoice.subtotalCents}
          gstCents={invoice.gstCents}
          qstCents={invoice.qstCents}
          totalCents={invoice.totalCents}
          gstRate={Number(settings.gstRate)}
          qstRate={Number(settings.qstRate)}
          showTaxes={settings.taxesEnabled}
        />

        {voided ? (
          <p className="rounded-lg bg-surface-muted px-4 py-3 text-sm text-text-muted">
            Cette facture a été annulée.
          </p>
        ) : paid ? (
          <p className="rounded-lg bg-success-bg px-4 py-3 text-sm font-medium text-success">
            Payée{invoice.paidAt ? ` le ${formatDateShort(invoice.paidAt, tz)}` : ""}. Merci !
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {overdue ? (
              <p className="text-sm font-medium text-danger">
                Paiement en retard.
              </p>
            ) : null}
            {invoice.hostedInvoiceUrl ? (
              <a
                href={invoice.hostedInvoiceUrl}
                className={buttonVariants({ size: "lg" })}
              >
                Payer la facture
              </a>
            ) : settings.paymentInstructions ? (
              <div className="rounded-lg bg-surface-muted px-4 py-3 text-sm text-text">
                <p className="mb-1 font-medium">Modalités de paiement</p>
                <p className="whitespace-pre-wrap text-text-muted">
                  {settings.paymentInstructions}
                </p>
              </div>
            ) : null}
          </div>
        )}

        {invoice.notes ? (
          <p className="whitespace-pre-wrap border-t border-border pt-4 text-xs text-text-muted">
            {invoice.notes}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
