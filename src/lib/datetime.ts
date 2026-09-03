import { DateTime } from "luxon";

export const DEFAULT_TIMEZONE = "America/Toronto";

const WEEKDAY_LABELS = [
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
  "dimanche",
];

/** Libellé d'un jour de semaine (convention Luxon : 1 = lundi … 7 = dimanche). */
export function weekdayLabel(weekday: number): string {
  return WEEKDAY_LABELS[weekday - 1] ?? "";
}

export function minutesToHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function hhmmToMinutes(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const hours = Number(m[1]);
  const mins = Number(m[2]);
  if (hours > 23 || mins > 59) return null;
  return hours * 60 + mins;
}

function dt(date: Date, zone: string) {
  return DateTime.fromJSDate(date, { zone }).setLocale("fr-CA");
}

export function formatDateTime(date: Date, zone = DEFAULT_TIMEZONE): string {
  return dt(date, zone).toFormat("cccc d LLLL yyyy 'à' HH'h'mm");
}

export function formatDate(date: Date, zone = DEFAULT_TIMEZONE): string {
  return dt(date, zone).toFormat("cccc d LLLL yyyy");
}

export function formatDateShort(date: Date, zone = DEFAULT_TIMEZONE): string {
  return dt(date, zone).toFormat("d LLL yyyy");
}

export function formatTime(date: Date, zone = DEFAULT_TIMEZONE): string {
  return dt(date, zone).toFormat("HH'h'mm");
}

export function formatTimeRange(
  start: Date,
  end: Date,
  zone = DEFAULT_TIMEZONE,
): string {
  return `${formatTime(start, zone)} – ${formatTime(end, zone)}`;
}

/** Convertit une date + heure locale (dans `zone`) vers un instant JS (UTC). */
export function localDateTimeToUtc(
  isoLocal: string,
  zone = DEFAULT_TIMEZONE,
): Date | null {
  const parsed = DateTime.fromISO(isoLocal, { zone });
  return parsed.isValid ? parsed.toJSDate() : null;
}

/** Formate un instant JS vers la valeur d'un `<input type="datetime-local">`. */
export function toDateTimeLocalValue(
  date: Date,
  zone = DEFAULT_TIMEZONE,
): string {
  return DateTime.fromJSDate(date, { zone }).toFormat("yyyy-MM-dd'T'HH:mm");
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function isSameOrAfterNow(date: Date): boolean {
  return date.getTime() >= Date.now();
}
