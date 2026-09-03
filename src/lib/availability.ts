import "server-only";
import { DateTime } from "luxon";
import { googleBusyIntervals } from "@/lib/google";
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

type Window = { start: number; end: number }; // minutes depuis minuit

function exceptionKey(date: Date): string {
  return DateTime.fromJSDate(date, { zone: "utc" }).toFormat("yyyy-MM-dd");
}

async function loadContext(durationMin: number, horizonDays?: number) {
  const settings = await getSettings();
  const tz = settings.timezone;
  const now = DateTime.now().setZone(tz);
  const earliest = now.plus({ hours: settings.minLeadTimeHours });
  const horizon = Math.min(
    horizonDays ?? settings.bookingHorizonDays,
    settings.bookingHorizonDays,
  );
  const rangeEnd = now.plus({ days: horizon }).endOf("day");

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
      select: { startAt: true, endAt: true },
    }),
  ]);

  const bufBefore = settings.bufferBeforeMin * 60_000;
  const bufAfter = settings.bufferAfterMin * 60_000;
  const busy = bookings.map((b) => ({
    from: b.startAt.getTime() - bufBefore,
    to: b.endAt.getTime() + bufAfter,
  }));

  // Périodes occupées de Google Calendar (si connecté).
  const googleBusy = await googleBusyIntervals(
    now.toUTC().toJSDate(),
    rangeEnd.toUTC().toJSDate(),
  );
  for (const g of googleBusy) {
    busy.push({ from: g.from - bufBefore, to: g.to + bufAfter });
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

  const slotConflicts = (startMs: number, endMs: number) =>
    busy.some((b) => startMs - bufBefore < b.to && endMs + bufAfter > b.from);

  return {
    settings,
    tz,
    now,
    earliest,
    horizon,
    windowsForDay,
    slotConflicts,
    durationMin,
  };
}

/** Créneaux disponibles pour une prestation d'une durée donnée. */
export async function getAvailability(
  durationMin: number,
  horizonDays?: number,
): Promise<{ tz: string; days: DaySlots[] }> {
  const ctx = await loadContext(durationMin, horizonDays);
  const { settings, tz, now, earliest } = ctx;
  const days: DaySlots[] = [];

  for (let i = 0; i <= ctx.horizon; i++) {
    const day = now.startOf("day").plus({ days: i });
    const windows = ctx.windowsForDay(day);
    if (!windows || windows.length === 0) continue;

    const seen = new Set<string>();
    const slots: Slot[] = [];

    for (const w of windows) {
      for (
        let m = w.start;
        m + durationMin <= w.end;
        m += settings.slotIntervalMin
      ) {
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
 * Vérifie que `start` tombe dans une plage de travail, respecte le délai
 * minimum et n'entre pas en conflit avec un rendez-vous existant.
 */
export async function isSlotBookable(
  start: Date,
  durationMin: number,
): Promise<boolean> {
  const ctx = await loadContext(durationMin);
  const startLocal = DateTime.fromJSDate(start, { zone: ctx.tz });
  if (!startLocal.isValid) return false;
  if (startLocal < ctx.earliest) return false;
  if (startLocal > ctx.now.plus({ days: ctx.horizon }).endOf("day")) return false;

  const day = startLocal.startOf("day");
  const windows = ctx.windowsForDay(day);
  if (!windows) return false;

  const minutes = startLocal.diff(day, "minutes").minutes;
  const endMinutes = minutes + durationMin;
  const inWindow = windows.some(
    (w) => minutes >= w.start && endMinutes <= w.end,
  );
  if (!inWindow) return false;

  const endLocal = startLocal.plus({ minutes: durationMin });
  return !ctx.slotConflicts(startLocal.toMillis(), endLocal.toMillis());
}
