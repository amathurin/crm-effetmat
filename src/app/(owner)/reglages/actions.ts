"use server";

import { revalidatePath } from "next/cache";
import { hhmmToMinutes } from "@/lib/datetime";
import { bool, type FormState, str, zodToFieldErrors } from "@/lib/form";
import { disconnectGoogle, setGoogleCalendars } from "@/lib/google";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { SETTINGS_ID } from "@/lib/settings";
import {
  availabilityRuleSchema,
  businessSettingsSchema,
  exceptionTypeSchema,
} from "@/lib/validation";

function revalidateSettings() {
  revalidatePath("/reglages");
  revalidatePath("/reserver");
  revalidatePath("/agenda");
}

export async function saveBusinessSettings(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();

  const parsed = businessSettingsSchema.safeParse({
    businessName: str(formData, "businessName"),
    businessEmail: str(formData, "businessEmail"),
    businessPhone: str(formData, "businessPhone"),
    businessAddress: str(formData, "businessAddress"),
    gstNumber: str(formData, "gstNumber"),
    qstNumber: str(formData, "qstNumber"),
    timezone: str(formData, "timezone"),
    bufferAfterMin: str(formData, "bufferAfterMin"),
    slotIntervalMin: str(formData, "slotIntervalMin"),
    minLeadTimeHours: str(formData, "minLeadTimeHours"),
    bookingHorizonDays: str(formData, "bookingHorizonDays"),
    autoConfirm: bool(formData, "autoConfirm"),
    publicBookingEnabled: bool(formData, "publicBookingEnabled"),
    bookingIntroText: str(formData, "bookingIntroText"),
    taxesEnabled: bool(formData, "taxesEnabled"),
    gstRate: str(formData, "gstRate"),
    qstRate: str(formData, "qstRate"),
    invoiceDueDays: str(formData, "invoiceDueDays"),
    paymentInstructions: str(formData, "paymentInstructions"),
  });

  if (!parsed.success) {
    return {
      error: "Vérifie les champs.",
      fieldErrors: zodToFieldErrors(parsed.error),
    };
  }

  await prisma.settings.upsert({
    where: { id: SETTINGS_ID },
    update: parsed.data,
    create: { id: SETTINGS_ID, ...parsed.data },
  });

  revalidateSettings();
  return { ok: true };
}

export async function addAvailabilityRule(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();

  const start = hhmmToMinutes(str(formData, "start"));
  const end = hhmmToMinutes(str(formData, "end"));
  if (start === null || end === null) {
    return { error: "Heures invalides (format HH:MM)." };
  }

  const parsed = availabilityRuleSchema.safeParse({
    weekday: str(formData, "weekday"),
    startMinutes: start,
    endMinutes: end,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Plage invalide." };
  }

  await prisma.availabilityRule.create({ data: parsed.data });
  revalidateSettings();
  return { ok: true };
}

export async function deleteAvailabilityRule(formData: FormData): Promise<void> {
  await requireUser();
  const id = str(formData, "id");
  if (id) await prisma.availabilityRule.delete({ where: { id } });
  revalidateSettings();
}

export async function addException(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();

  const dateStr = str(formData, "date");
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return { error: "Date invalide." };

  const type = exceptionTypeSchema.safeParse(str(formData, "type"));
  if (!type.success) return { error: "Type invalide." };

  let startMinutes: number | null = null;
  let endMinutes: number | null = null;
  if (type.data === "CUSTOM_HOURS") {
    startMinutes = hhmmToMinutes(str(formData, "start"));
    endMinutes = hhmmToMinutes(str(formData, "end"));
    if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
      return { error: "Heures spéciales invalides." };
    }
  }

  await prisma.availabilityException.upsert({
    where: { date },
    update: {
      type: type.data,
      startMinutes,
      endMinutes,
      note: str(formData, "note") || null,
    },
    create: {
      date,
      type: type.data,
      startMinutes,
      endMinutes,
      note: str(formData, "note") || null,
    },
  });
  revalidateSettings();
  return { ok: true };
}

export async function deleteException(formData: FormData): Promise<void> {
  await requireUser();
  const id = str(formData, "id");
  if (id) await prisma.availabilityException.delete({ where: { id } });
  revalidateSettings();
}

export async function saveGoogleCalendarsAction(
  formData: FormData,
): Promise<void> {
  await requireUser();
  const work = str(formData, "workCalendarId");
  const busy = formData.getAll("busyCalendarIds").map(String).filter(Boolean);
  await setGoogleCalendars(work, busy);
  revalidateSettings();
}

export async function disconnectGoogleAction(): Promise<void> {
  await requireUser();
  await disconnectGoogle();
  revalidateSettings();
}
