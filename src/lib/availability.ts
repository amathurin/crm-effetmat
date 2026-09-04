import "server-only";
import { DateTime } from "luxon";
import { googleBusyIntervals } from "@/lib/google";
import { travelMinutesBatch } from "@/lib/maps";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

export type Slot = {
  /** Début du créneau, ISO 8601 UTC. */
  start: string;
  /** Fin du créneau, ISO 8601 UTC. */
  end: string;
  /** Heure locale affichable, ex. « 09:30 ». */
  label: string;
};

export type DaySlots = {
  date: string; // yyyy-MM-dd dans le fuseau configuré
  label: string; // ex. « lundi 8 septembre »
  slots: Slot[];
};

/** Prestation à réserver : durée + battement propre (0 = visioconférence). */
export type SlotTarget = {
  durationMin: number;
  bufferMin: number;
  /** Adresse de la propriété — permet d'ajuster le battement au trajet réel. */
  propertyAddress?: string | null;
};

type Window = { start: number; end: number }; // minutes depuis minuit

function exceptionKey(date: Date): string {
  return DateTime.fromJSDate(date, { zone: "utc" }).toFormat("yyyy-MM-dd");
}

async function loadContext(target: SlotTarget, horizonDays?: number) {
  const settings = await getSettings();
  const tz = settings.timezone;
  const now = DateTime.now().setZone(tz);
  const earliest = now.plus({ hours: settings.minLeadTimeHours });
  const horizon = Math.min(
    horizonDays ?? settings.bookingHorizonDays,
    settings.bookingHorizonDays,
  );
  const rangeEnd = now.plus({ days: horizon }).endOf("day");
  const defaultBufferMs = settings.bufferAfterMin * 60_000;

  const [rules, exceptions, bookings] = await Promise.all([
    prisma.availabilityRule.findMany(),
    prisma.availabilityException.findMany({
      where: {
        date: {
          gte: now.startOf("day").toUTC().toJSDate(),
          lte: rangeEnd.toUTC().toJSDate(),
        },
      },
    }),
    prisma.booking.findMany({
      where: {
        status: { in: ["REQUESTED", "CONFIRMED"] },
        endAt: { gte: earliest.toUTC().toJSDate() },
        startAt: { lte: rangeEnd.toUTC().toJSDate() },
      },
      select: {
        startAt: true,
        endAt: true,
        propertyAddress: true,
        package: { select: { bufferMin: true } },
      },
    }),
  ]);

  // Trajet réel (Google Maps) entre l'adresse de la prestation candidate et
  // celle de chaque rendez-vous existant, si une clé API est configurée.
  const propertyAddress = target.propertyAddress?.trim() || null;
  const travelMinutesByAddress = propertyAddress
    ? await travelMinutesBatch(
        propertyAddress,
        bookings.map((b) => b.propertyAddress),
      )
    : new Map<string, number>();

  // Chaque rendez-vous « occupe » sa durée + le battement nécessaire de part
  // et d'autre : au minimum le plus grand des deux battements (le rendez-vous
  // déjà réservé et la prestation candidate), ou le trajet réel si connu et
  // plus long (ex. Québec → Lévis vs. deux adresses voisines).
  const busy = bookings.map((b) => {
    const bookedBuffer = b.package?.bufferMin ?? settings.bufferAfterMin;
    const fixedGap = Math.max(bookedBuffer, target.bufferMin);
    const travel = travelMinutesByAddress.get(b.propertyAddress);
    const gapMs = Math.max(fixedGap, travel ?? 0) * 60_000;
    return {
      from: b.startAt.getTime() - gapMs,
      to: b.endAt.getTime() + gapMs,
    };
  });

  // Périodes occupées de Google Calendar (si connecté) — battement par défaut.
  const googleBusy = await googleBusyIntervals(
    now.toUTC().toJSDate(),
    rangeEnd.toUTC().toJSDate(),
  );
  for (const g of googleBusy) {
    busy.push({ from: g.from - defaultBufferMs, to: g.to + defaultBufferMs });
  }

  const exceptionByDay = new Map(
    exceptions.map((e) => [exceptionKey(e.date), e]),
  );

  const windowsForDay = (day: DateTime): Window[] | null => {
    const ex = exceptionByDay.get(day.toFormat("yyyy-MM-dd"));
    if (ex?.type === "BLOCKED") return null;
    if (
      ex?.type === "CUSTOM_HOURS" &&
      ex.startMinutes != null &&
      ex.endMinutes != null
    ) {
      return [{ start: ex.startMinutes, end: ex.endMinutes }];
    }
    return rules
      .filter((r) => r.weekday === day.weekday)
      .map((r) => ({ start: r.startMinutes, end: r.endMinutes }));
  };

  // Chaque période « occupée » inclut déjà le battement des deux côtés :
  // un créneau candidat entre en conflit dès qu'il chevauche cette période.
  const slotConflicts = (startMs: number, endMs: number) =>
    busy.some((b) => startMs < b.to && endMs > b.from);

  return {
    settings,
    tz,
    now,
    earliest,
    horizon,
    windowsForDay,
    slotConflicts,
    durationMin: target.durationMin,
    stepMin: Math.max(5, settings.slotIntervalMin),
  };
}

/** Créneaux disponibles pour une prestation. */
export async function getAvailability(
  target: SlotTarget,
  horizonDays?: number,
): Promise<{ tz: string; days: DaySlots[] }> {
  const ctx = await loadContext(target, horizonDays);
  const { tz, now, earliest, stepMin, durationMin } = ctx;
  const days: DaySlots[] = [];

  for (let i = 0; i <= ctx.horizon; i++) {
    const day = now.startOf("day").plus({ days: i });
    const windows = ctx.windowsForDay(day);
    if (!windows || windows.length === 0) continue;

    const seen = new Set<string>();
    const slots: Slot[] = [];

    for (const w of windows) {
      // On aligne le pas sur l'heure d'ouverture de la plage.
      for (let m = w.start; m + durationMin <= w.end; m += stepMin) {
        const startLocal = day.plus({ minutes: m });
        if (startLocal < earliest) continue;

        const endLocal = startLocal.plus({ minutes: durationMin });
        const startMs = startLocal.toMillis();
        if (seen.has(String(startMs))) continue;
        if (ctx.slotConflicts(startMs, endLocal.toMillis())) continue;

        seen.add(String(startMs));
        slots.push({
          start: startLocal.toUTC().toISO() ?? "",
          end: endLocal.toUTC().toISO() ?? "",
          label: startLocal.toFormat("HH:mm"),
        });
      }
    }

    if (slots.length > 0) {
      slots.sort((a, b) => a.start.localeCompare(b.start));
      days.push({
        date: day.toFormat("yyyy-MM-dd"),
        label: day.setLocale("fr-CA").toFormat("cccc d LLLL"),
        slots,
      });
    }
  }

  return { tz, days };
}

/**
 * Revalidation côté serveur au moment de la réservation (anti-course).
 */
export async function isSlotBookable(
  start: Date,
  target: SlotTarget,
): Promise<boolean> {
  const ctx = await loadContext(target);
  const startLocal = DateTime.fromJSDate(start, { zone: ctx.tz });
  if (!startLocal.isValid) return false;
  if (startLocal < ctx.earliest) return false;
  if (startLocal > ctx.now.plus({ days: ctx.horizon }).endOf("day")) return false;

  const day = startLocal.startOf("day");
  const windows = ctx.windowsForDay(day);
  if (!windows) return false;

  const minutes = startLocal.diff(day, "minutes").minutes;
  const endMinutes = minutes + target.durationMin;
  const inWindow = windows.some(
    (w) => minutes >= w.start && endMinutes <= w.end,
  );
  if (!inWindow) return false;

  const endLocal = startLocal.plus({ minutes: target.durationMin });
  return !ctx.slotConflicts(startLocal.toMillis(), endLocal.toMillis());
}
