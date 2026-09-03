import "server-only";
import { prisma } from "@/lib/prisma";
import type { TaxConfig } from "@/lib/tax";
import { DEFAULT_TIMEZONE } from "@/lib/datetime";

export const SETTINGS_ID = 1;

/** Récupère la ligne de réglages unique, en la créant au besoin. */
export async function getSettings() {
  return prisma.settings.upsert({
    where: { id: SETTINGS_ID },
    update: {},
    create: { id: SETTINGS_ID },
  });
}

export async function getTaxConfig(): Promise<TaxConfig> {
  const s = await getSettings();
  return {
    enabled: s.taxesEnabled,
    gstRate: Number(s.gstRate),
    qstRate: Number(s.qstRate),
  };
}

export async function getTimezone(): Promise<string> {
  const s = await getSettings();
  return s.timezone || DEFAULT_TIMEZONE;
}
