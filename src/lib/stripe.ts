import "server-only";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { SETTINGS_ID } from "@/lib/settings";
import type {
  Client,
  Invoice,
  InvoiceLineItem,
  Settings,
} from "@prisma/client";

const secretKey = process.env.STRIPE_SECRET_KEY;

export const stripe = secretKey ? new Stripe(secretKey) : null;

export function stripeEnabled(): boolean {
  return stripe !== null;
}

/** Crée (ou retrouve) le client Stripe et mémorise son id. */
export async function ensureStripeCustomer(client: Client): Promise<string> {
  if (!stripe) throw new Error("Stripe non configuré.");
  if (client.stripeCustomerId) return client.stripeCustomerId;

  const customer = await stripe.customers.create({
    name: client.company ? `${client.name} (${client.company})` : client.name,
    email: client.email,
    phone: client.phone ?? undefined,
    metadata: { crmClientId: client.id },
  });

  await prisma.client.update({
    where: { id: client.id },
    data: { stripeCustomerId: customer.id },
  });
  return customer.id;
}

/** Crée les taux de taxe Stripe (TPS, TVQ) une seule fois et mémorise leurs ids. */
export async function ensureTaxRates(
  settings: Settings,
): Promise<{ gst: string; qst: string } | null> {
  if (!stripe || !settings.taxesEnabled) return null;

  let gst = settings.stripeGstTaxRateId;
  let qst = settings.stripeQstTaxRateId;

  if (!gst) {
    const rate = await stripe.taxRates.create({
      display_name: "TPS",
      description: settings.gstNumber ? `TPS ${settings.gstNumber}` : "TPS",
      percentage: Number(settings.gstRate),
      inclusive: false,
      country: "CA",
      jurisdiction: "CA",
    });
    gst = rate.id;
  }
  if (!qst) {
    const rate = await stripe.taxRates.create({
      display_name: "TVQ",
      description: settings.qstNumber ? `TVQ ${settings.qstNumber}` : "TVQ",
      percentage: Number(settings.qstRate),
      inclusive: false,
      country: "CA",
      state: "QC",
      jurisdiction: "CA-QC",
    });
    qst = rate.id;
  }

  if (gst !== settings.stripeGstTaxRateId || qst !== settings.stripeQstTaxRateId) {
    await prisma.settings.update({
      where: { id: SETTINGS_ID },
      data: { stripeGstTaxRateId: gst, stripeQstTaxRateId: qst },
    });
  }

  return { gst, qst };
}

/**
 * Crée la facture correspondante dans Stripe, la finalise et l'envoie au client.
 * Retourne l'id Stripe et l'URL de paiement hébergée.
 */
export async function createAndSendStripeInvoice(
  invoice: Invoice & { client: Client; lineItems: InvoiceLineItem[] },
  settings: Settings,
): Promise<{ stripeInvoiceId: string; hostedInvoiceUrl: string | null }> {
  if (!stripe) throw new Error("Stripe non configuré.");

  const customerId = await ensureStripeCustomer(invoice.client);
  const rates = await ensureTaxRates(settings);
  const taxRates = rates ? [rates.gst, rates.qst] : undefined;

  const draft = await stripe.invoices.create({
    customer: customerId,
    collection_method: "send_invoice",
    days_until_due: settings.invoiceDueDays,
    auto_advance: false,
    currency: "cad",
    description: invoice.number ? `Facture ${invoice.number}` : undefined,
    metadata: {
      crmInvoiceId: invoice.id,
      crmInvoiceNumber: invoice.number ?? "",
    },
  });

  for (const li of invoice.lineItems) {
    await stripe.invoiceItems.create({
      customer: customerId,
      invoice: draft.id as string,
      currency: "cad",
      amount: li.amountCents,
      description:
        li.quantity > 1 ? `${li.description} (×${li.quantity})` : li.description,
      tax_rates: taxRates,
    });
  }

  const finalized = await stripe.invoices.finalizeInvoice(draft.id as string);
  await stripe.invoices.sendInvoice(draft.id as string);

  return {
    stripeInvoiceId: finalized.id as string,
    hostedInvoiceUrl: finalized.hosted_invoice_url ?? null,
  };
}

export async function voidStripeInvoice(stripeInvoiceId: string): Promise<void> {
  if (!stripe) return;
  try {
    await stripe.invoices.voidInvoice(stripeInvoiceId);
  } catch (err) {
    console.error("voidStripeInvoice:", err);
  }
}
