import { DateTime } from "luxon";
import type { NextRequest } from "next/server";
import { bookingReminderEmail } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";
import { dunOverdueInvoices } from "@/lib/invoice";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

/**
 * Tâches quotidiennes : rappels de séances (24–48 h avant) et relances des
 * factures échues. À déclencher une fois par jour (Vercel Cron — vercel.json).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Non autorisé", { status: 401 });
  }

  const settings = await getSettings();
  const now = Date.now();

  // --- Rappels de séances -------------------------------------------------
  const bookings = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      reminderSentAt: null,
      startAt: {
        gte: new Date(now + 24 * 3_600_000),
        lte: new Date(now + 48 * 3_600_000),
      },
    },
    include: { client: true, package: true },
  });

  let remindersSent = 0;
  for (const b of bookings) {
    const whenLabel = DateTime.fromJSDate(b.startAt, { zone: settings.timezone })
      .setLocale("fr-CA")
      .toFormat("cccc d LLLL 'à' HH'h'mm");
    const mail = bookingReminderEmail({
      clientName: b.client.name,
      businessName: settings.businessName || "le studio",
      packageName: b.package?.name ?? "votre séance",
      whenLabel,
      address: b.propertyAddress,
    });
    try {
      const res = await sendEmail({
        to: b.client.email,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        replyTo: settings.businessEmail || undefined,
      });
      if (res.sent) remindersSent += 1;
    } catch (err) {
      console.error("rappel:", err);
    }
    await prisma.booking.update({
      where: { id: b.id },
      data: { reminderSentAt: new Date() },
    });
  }

  // --- Relances de factures --------------------------------------------
  const invoicesDunned = await dunOverdueInvoices();

  return Response.json({
    reminders: { processed: bookings.length, sent: remindersSent },
    invoices: { dunned: invoicesDunned },
  });
}
