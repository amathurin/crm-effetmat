import "server-only";
import { DateTime } from "luxon";
import { sendEmail } from "@/lib/email/send";
import {
  invoiceOverdueEmail,
  invoiceSentEmail,
  paymentReceiptEmail,
} from "@/lib/email/templates";
import { formatCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { SETTINGS_ID, getSettings } from "@/lib/settings";
import { computeTaxes, type TaxConfig } from "@/lib/tax";
import {
  createAndSendStripeInvoice,
  stripeEnabled,
  voidStripeInvoice,
} from "@/lib/stripe";
import type { Invoice, Settings } from "@prisma/client";

function appUrl() {
  return process.env.APP_URL ?? "http://localhost:3000";
}

function dateLabel(d: Date, tz: string) {
  return DateTime.fromJSDate(d, { zone: tz })
    .setLocale("fr-CA")
    .toFormat("d LLLL yyyy");
}

function taxConfig(settings: Settings): TaxConfig {
  return {
    enabled: settings.taxesEnabled,
    gstRate: Number(settings.gstRate),
    qstRate: Number(settings.qstRate),
  };
}

/** Numéro de facture séquentiel par année : AAAA-NNN. */
async function assignNextNumber(): Promise<string> {
  return prisma.$transaction(async (tx) => {
    const s = await tx.settings.findUniqueOrThrow({ where: { id: SETTINGS_ID } });
    const year = new Date().getFullYear();
    const seq = s.invoiceSeqYear === year ? s.invoiceNextSeq : 1;
    await tx.settings.update({
      where: { id: SETTINGS_ID },
      data: { invoiceSeqYear: year, invoiceNextSeq: seq + 1 },
    });
    return `${year}-${String(seq).padStart(3, "0")}`;
  });
}

/** Recalcule sous-total, taxes et total à partir des lignes. */
export async function recalcInvoiceTotals(invoiceId: string): Promise<void> {
  const [items, settings] = await Promise.all([
    prisma.invoiceLineItem.findMany({ where: { invoiceId } }),
    getSettings(),
  ]);
  const subtotal = items.reduce((sum, i) => sum + i.amountCents, 0);
  const t = computeTaxes(subtotal, taxConfig(settings));
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      subtotalCents: t.subtotalCents,
      gstCents: t.gstCents,
      qstCents: t.qstCents,
      totalCents: t.totalCents,
    },
  });
}

/** Crée une facture brouillon à partir d'un rendez-vous. */
export async function createInvoiceForBooking(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { package: true, invoice: true },
  });
  if (!booking) throw new Error("Rendez-vous introuvable.");
  if (booking.invoice) return booking.invoice;

  const settings = await getSettings();
  const unit = booking.package?.priceCents ?? 0;
  const description = booking.package
    ? `${booking.package.name} — ${booking.propertyAddress}`
    : `Séance photo/vidéo — ${booking.propertyAddress}`;
  const t = computeTaxes(unit, taxConfig(settings));

  return prisma.invoice.create({
    data: {
      clientId: booking.clientId,
      bookingId: booking.id,
      status: "DRAFT",
      subtotalCents: t.subtotalCents,
      gstCents: t.gstCents,
      qstCents: t.qstCents,
      totalCents: t.totalCents,
      lineItems: {
        create: {
          description,
          quantity: 1,
          unitCents: unit,
          amountCents: unit,
          sortOrder: 0,
        },
      },
    },
  });
}

/** Finalise un brouillon : numéro, dates, Stripe (si configuré). */
export async function finalizeInvoice(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { client: true, lineItems: { orderBy: { sortOrder: "asc" } } },
  });
  if (!invoice) throw new Error("Facture introuvable.");
  if (invoice.status !== "DRAFT") return invoice;
  if (invoice.lineItems.length === 0) {
    throw new Error("Ajoutez au moins une ligne avant de finaliser.");
  }

  const settings = await getSettings();
  const number = invoice.number ?? (await assignNextNumber());
  const issuedAt = new Date();
  const dueAt = new Date(
    issuedAt.getTime() + settings.invoiceDueDays * 86_400_000,
  );

  let stripeInvoiceId: string | null = null;
  let hostedInvoiceUrl: string | null = null;
  if (stripeEnabled()) {
    const res = await createAndSendStripeInvoice(
      { ...invoice, number },
      settings,
    );
    stripeInvoiceId = res.stripeInvoiceId;
    hostedInvoiceUrl = res.hostedInvoiceUrl;
  }

  const updated = await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      number,
      status: "SENT",
      issuedAt,
      dueAt,
      stripeInvoiceId,
      hostedInvoiceUrl,
    },
  });

  // Stripe envoie son propre courriel (avec lien de paiement hébergé) ;
  // sinon on envoie le nôtre.
  if (!stripeEnabled()) {
    await emailInvoiceToClient(invoiceId);
  }

  return updated;
}

/** Envoie (ou renvoie) la facture au client par courriel. */
export async function emailInvoiceToClient(invoiceId: string): Promise<void> {
  const [invoice, settings] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { client: true },
    }),
    getSettings(),
  ]);
  if (!invoice || !invoice.number) return;

  const viewUrl = `${appUrl()}/facture/${invoice.publicToken}`;
  const mail = invoiceSentEmail({
    clientName: invoice.client.name,
    businessName: settings.businessName || "le studio",
    invoiceNumber: invoice.number,
    totalLabel: formatCents(invoice.totalCents),
    dueLabel: invoice.dueAt
      ? dateLabel(invoice.dueAt, settings.timezone)
      : "à réception",
    viewUrl,
    payUrl: invoice.hostedInvoiceUrl ?? null,
    paymentInstructions: settings.paymentInstructions,
  });

  try {
    await sendEmail({
      to: invoice.client.email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      replyTo: settings.businessEmail || undefined,
    });
  } catch (err) {
    console.error("emailInvoiceToClient:", err);
  }
}

async function emailReceiptToClient(invoiceId: string): Promise<void> {
  const [invoice, settings] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { client: true },
    }),
    getSettings(),
  ]);
  if (!invoice || !invoice.number || !invoice.paidAt) return;

  const mail = paymentReceiptEmail({
    clientName: invoice.client.name,
    businessName: settings.businessName || "le studio",
    invoiceNumber: invoice.number,
    totalLabel: formatCents(invoice.totalCents),
    paidLabel: dateLabel(invoice.paidAt, settings.timezone),
    viewUrl: `${appUrl()}/facture/${invoice.publicToken}`,
  });

  try {
    await sendEmail({
      to: invoice.client.email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      replyTo: settings.businessEmail || undefined,
    });
  } catch (err) {
    console.error("emailReceiptToClient:", err);
  }
}

/** Enregistre un paiement (hors ligne) et passe la facture à « payée ». */
export async function markInvoicePaid(
  invoiceId: string,
  method = "manuel",
): Promise<void> {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice || invoice.status === "PAID" || invoice.status === "VOID") return;

  const remaining = invoice.totalCents - invoice.amountPaidCents;
  await prisma.$transaction([
    prisma.payment.create({
      data: { invoiceId, amountCents: remaining, method },
    }),
    prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: "PAID",
        paidAt: new Date(),
        amountPaidCents: invoice.totalCents,
      },
    }),
  ]);
  await emailReceiptToClient(invoiceId);
}

/** Marque une facture Stripe « payée » suite à un webhook. */
export async function applyStripePaid(
  stripeInvoiceId: string,
  paymentIntentId: string | null,
  amountPaidCents: number,
): Promise<void> {
  const invoice = await prisma.invoice.findUnique({
    where: { stripeInvoiceId },
  });
  if (!invoice || invoice.status === "PAID") return;

  await prisma.$transaction([
    prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        amountCents: amountPaidCents,
        method: "stripe",
        stripePaymentIntentId: paymentIntentId,
      },
    }),
    prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: "PAID",
        paidAt: new Date(),
        amountPaidCents,
      },
    }),
  ]);
  await emailReceiptToClient(invoice.id);
}

export async function voidInvoice(invoiceId: string): Promise<void> {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice || invoice.status === "PAID" || invoice.status === "VOID") return;

  if (invoice.stripeInvoiceId) {
    await voidStripeInvoice(invoice.stripeInvoiceId);
  }
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: "VOID" },
  });
}

/** Une facture envoyée est « en retard » si l'échéance est passée. */
export function isOverdue(invoice: Pick<Invoice, "status" | "dueAt">): boolean {
  return (
    invoice.status === "SENT" &&
    invoice.dueAt != null &&
    invoice.dueAt.getTime() < Date.now()
  );
}

/**
 * Relance les factures échues et impayées (max 3 rappels, 1 par semaine).
 * Retourne le nombre de factures traitées.
 */
export async function dunOverdueInvoices(): Promise<number> {
  const settings = await getSettings();
  const now = Date.now();
  const staleBefore = new Date(now - 7 * 86_400_000);

  const invoices = await prisma.invoice.findMany({
    where: {
      status: "SENT",
      dueAt: { lt: new Date(now) },
      reminderCount: { lt: 3 },
      OR: [{ lastReminderAt: null }, { lastReminderAt: { lt: staleBefore } }],
    },
    include: { client: true },
  });

  for (const inv of invoices) {
    if (!inv.number || !inv.dueAt) continue;
    const mail = invoiceOverdueEmail({
      clientName: inv.client.name,
      businessName: settings.businessName || "le studio",
      invoiceNumber: inv.number,
      totalLabel: formatCents(inv.totalCents),
      dueLabel: dateLabel(inv.dueAt, settings.timezone),
      viewUrl: `${appUrl()}/facture/${inv.publicToken}`,
      payUrl: inv.hostedInvoiceUrl ?? null,
      paymentInstructions: settings.paymentInstructions,
    });
    try {
      await sendEmail({
        to: inv.client.email,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        replyTo: settings.businessEmail || undefined,
      });
    } catch (err) {
      console.error("dunOverdueInvoices:", err);
    }
    await prisma.invoice.update({
      where: { id: inv.id },
      data: { lastReminderAt: new Date(), reminderCount: { increment: 1 } },
    });
  }

  return invoices.length;
}
