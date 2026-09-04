"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DateTime } from "luxon";
import { isSlotBookable } from "@/lib/availability";
import { syncBookingToGoogle } from "@/lib/google";
import {
  bookingConfirmationEmail,
  ownerBookingNotificationEmail,
} from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";
import { type FormState, str, zodToFieldErrors } from "@/lib/form";
import { buildIcs } from "@/lib/ics";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { publicBookingSchema } from "@/lib/validation";

export async function createPublicBooking(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const settings = await getSettings();
  if (!settings.publicBookingEnabled) {
    return { error: "La réservation en ligne est actuellement fermée." };
  }

  const parsed = publicBookingSchema.safeParse({
    packageId: str(formData, "packageId"),
    start: str(formData, "start"),
    name: str(formData, "name"),
    email: str(formData, "email"),
    phone: str(formData, "phone"),
    propertyAddress: str(formData, "propertyAddress"),
    notes: str(formData, "notes"),
  });
  if (!parsed.success) {
    return {
      error: "Vérifiez le formulaire.",
      fieldErrors: zodToFieldErrors(parsed.error),
    };
  }

  const pkg = await prisma.package.findUnique({
    where: { id: parsed.data.packageId },
  });
  if (!pkg || !pkg.active || !pkg.onlineBookable) {
    return { error: "Cette prestation n'est plus disponible à la réservation." };
  }

  const start = new Date(parsed.data.start);
  if (Number.isNaN(start.getTime())) {
    return { error: "Créneau invalide, veuillez en choisir un autre." };
  }

  if (
    !(await isSlotBookable(start, {
      durationMin: pkg.durationMin,
      bufferMin: pkg.bufferMin,
    }))
  ) {
    return {
      error: "Ce créneau vient d'être réservé. Merci d'en choisir un autre.",
      fieldErrors: { start: "Créneau indisponible." },
    };
  }

  const end = new Date(start.getTime() + pkg.durationMin * 60_000);
  const { email, name, phone, propertyAddress, notes } = parsed.data;

  let client = await prisma.client.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  if (!client) {
    client = await prisma.client.create({ data: { name, email, phone } });
  } else if ((!client.phone && phone) || client.archived) {
    client = await prisma.client.update({
      where: { id: client.id },
      data: { phone: client.phone ?? phone, archived: false },
    });
  }

  const confirmed = settings.autoConfirm;
  const booking = await prisma.booking.create({
    data: {
      clientId: client.id,
      packageId: pkg.id,
      propertyAddress,
      startAt: start,
      endAt: end,
      status: confirmed ? "CONFIRMED" : "REQUESTED",
      source: "CLIENT",
      notes,
    },
  });

  await syncBookingToGoogle(booking.id);

  await sendBookingEmails({
    settings,
    booking: { id: booking.id },
    pkg: { name: pkg.name },
    start,
    end,
    confirmed,
    client: { name, email, phone },
    propertyAddress,
    notes,
  });

  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  redirect(`/reserver/merci?statut=${confirmed ? "confirme" : "demande"}`);
}

async function sendBookingEmails(args: {
  settings: Awaited<ReturnType<typeof getSettings>>;
  booking: { id: string };
  pkg: { name: string };
  start: Date;
  end: Date;
  confirmed: boolean;
  client: { name: string; email: string; phone: string | null };
  propertyAddress: string;
  notes: string | null;
}) {
  const { settings } = args;
  const tz = settings.timezone;
  const whenLabel = DateTime.fromJSDate(args.start, { zone: tz })
    .setLocale("fr-CA")
    .toFormat("cccc d LLLL yyyy 'à' HH'h'mm");
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const businessName = settings.businessName || "le studio";

  try {
    const mail = bookingConfirmationEmail({
      clientName: args.client.name,
      businessName,
      packageName: args.pkg.name,
      whenLabel,
      address: args.propertyAddress,
      confirmed: args.confirmed,
    });
    const attachments = args.confirmed
      ? [
          {
            filename: "seance.ics",
            content: Buffer.from(
              buildIcs({
                uid: `${args.booking.id}@crm-studio`,
                start: args.start,
                end: args.end,
                summary: `Séance — ${args.pkg.name}`,
                description: args.pkg.name,
                location: args.propertyAddress,
                organizerEmail: settings.businessEmail || undefined,
              }),
            ).toString("base64"),
          },
        ]
      : undefined;

    await sendEmail({
      to: args.client.email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      replyTo: settings.businessEmail || undefined,
      attachments,
    });
  } catch (err) {
    console.error("Email client échoué:", err);
  }

  if (settings.businessEmail) {
    try {
      const mail = ownerBookingNotificationEmail({
        businessName,
        clientName: args.client.name,
        clientEmail: args.client.email,
        clientPhone: args.client.phone,
        packageName: args.pkg.name,
        whenLabel,
        address: args.propertyAddress,
        notes: args.notes,
        confirmed: args.confirmed,
        bookingUrl: `${appUrl}/agenda/${args.booking.id}`,
      });
      await sendEmail({
        to: settings.businessEmail,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        replyTo: args.client.email,
      });
    } catch (err) {
      console.error("Email propriétaire échoué:", err);
    }
  }
}
