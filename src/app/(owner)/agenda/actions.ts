"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { localDateTimeToUtc } from "@/lib/datetime";
import { type FormState, str, zodToFieldErrors } from "@/lib/form";
import { deleteGoogleEvent, syncBookingToGoogle } from "@/lib/google";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { bookingSchema } from "@/lib/validation";
import type { BookingStatus } from "@prisma/client";

export async function saveBooking(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const settings = await getSettings();
  const tz = settings.timezone;

  const id = str(formData, "id") || null;
  const packageId = str(formData, "packageId") || null;

  const startAt = localDateTimeToUtc(str(formData, "startAt"), tz);
  if (!startAt) {
    return { error: "Date de début invalide.", fieldErrors: { startAt: "Requis." } };
  }

  let endAt = localDateTimeToUtc(str(formData, "endAt"), tz);
  if (!endAt && packageId) {
    const pkg = await prisma.package.findUnique({ where: { id: packageId } });
    if (pkg) endAt = new Date(startAt.getTime() + pkg.durationMin * 60_000);
  }
  if (!endAt) {
    return {
      error: "Date de fin invalide.",
      fieldErrors: { endAt: "Renseigne une fin ou choisis un forfait." },
    };
  }

  const parsed = bookingSchema.safeParse({
    clientId: str(formData, "clientId"),
    packageId,
    propertyAddress: str(formData, "propertyAddress"),
    startAt,
    endAt,
    status: str(formData, "status") || "CONFIRMED",
    notes: str(formData, "notes"),
  });

  if (!parsed.success) {
    return { error: "Vérifie les champs.", fieldErrors: zodToFieldErrors(parsed.error) };
  }
  if (parsed.data.endAt <= parsed.data.startAt) {
    return {
      error: "La fin doit suivre le début.",
      fieldErrors: { endAt: "La fin doit suivre le début." },
    };
  }

  const data = {
    clientId: parsed.data.clientId,
    packageId: parsed.data.packageId,
    propertyAddress: parsed.data.propertyAddress,
    startAt: parsed.data.startAt,
    endAt: parsed.data.endAt,
    status: parsed.data.status,
    notes: parsed.data.notes,
  };

  let bookingId = id;
  if (id) {
    await prisma.booking.update({ where: { id }, data });
  } else {
    const created = await prisma.booking.create({
      data: { ...data, source: "MANUAL" },
    });
    bookingId = created.id;
  }

  if (bookingId) await syncBookingToGoogle(bookingId);

  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  redirect(`/agenda/${bookingId}`);
}

export async function setBookingStatus(formData: FormData): Promise<void> {
  await requireUser();
  const id = str(formData, "id");
  const status = str(formData, "status");
  const allowed: BookingStatus[] = [
    "REQUESTED",
    "CONFIRMED",
    "COMPLETED",
    "CANCELLED",
  ];
  if (!id || !allowed.includes(status as BookingStatus)) return;
  await prisma.booking.update({
    where: { id },
    data: { status: status as BookingStatus },
  });
  await syncBookingToGoogle(id);
  revalidatePath("/agenda");
  revalidatePath(`/agenda/${id}`);
  revalidatePath("/dashboard");
}

export async function deleteBooking(formData: FormData): Promise<void> {
  await requireUser();
  const id = str(formData, "id");
  if (!id) return;
  const booking = await prisma.booking.findUnique({
    where: { id },
    select: { googleEventId: true },
  });
  await prisma.booking.delete({ where: { id } });
  if (booking?.googleEventId) await deleteGoogleEvent(booking.googleEventId);
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  redirect("/agenda");
}
