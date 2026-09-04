import { z } from "zod";

export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1),
});

const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable();

export const clientSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis."),
  company: optionalText,
  email: z.string().trim().toLowerCase().pipe(z.email("Courriel invalide.")),
  phone: optionalText,
  billingAddress: optionalText,
  notes: optionalText,
});
export type ClientInput = z.infer<typeof clientSchema>;

export const mediaTypeSchema = z.enum(["PHOTO", "VIDEO", "PHOTO_VIDEO"]);

export const packageSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis."),
  description: optionalText,
  mediaType: mediaTypeSchema,
  durationMin: z.coerce
    .number()
    .int()
    .min(15, "Durée minimale : 15 minutes.")
    .max(24 * 60),
  priceCents: z.number().int().min(0),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide.")
    .default("#6366f1"),
  deliverables: optionalText,
  active: z.boolean().default(true),
  onlineBookable: z.boolean().default(true),
});
export type PackageInput = z.infer<typeof packageSchema>;

export const bookingStatusSchema = z.enum([
  "REQUESTED",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
]);

export const bookingSchema = z.object({
  clientId: z.string().min(1, "Client requis."),
  packageId: optionalText,
  propertyAddress: z.string().trim().min(1, "Adresse de la propriété requise."),
  startAt: z.date(),
  endAt: z.date(),
  status: bookingStatusSchema,
  notes: optionalText,
});

export const availabilityRuleSchema = z
  .object({
    weekday: z.coerce.number().int().min(1).max(7),
    startMinutes: z.coerce.number().int().min(0).max(24 * 60),
    endMinutes: z.coerce.number().int().min(0).max(24 * 60),
  })
  .refine((v) => v.endMinutes > v.startMinutes, {
    message: "L'heure de fin doit suivre l'heure de début.",
    path: ["endMinutes"],
  });

export const exceptionTypeSchema = z.enum(["BLOCKED", "CUSTOM_HOURS"]);

export const lineItemSchema = z.object({
  description: z.string().trim().min(1, "Description requise."),
  quantity: z.coerce.number().int().min(1).max(999),
  unitCents: z.number().int().min(-1_000_000).max(100_000_000),
});

export const publicBookingSchema = z.object({
  packageId: z.string().min(1, "Prestation requise."),
  start: z.string().min(1, "Créneau requis."),
  name: z.string().trim().min(1, "Votre nom est requis."),
  email: z.string().trim().toLowerCase().pipe(z.email("Courriel invalide.")),
  phone: optionalText,
  propertyAddress: z
    .string()
    .trim()
    .min(1, "L'adresse de la propriété est requise."),
  notes: optionalText,
});
export type PublicBookingInput = z.infer<typeof publicBookingSchema>;

export const businessSettingsSchema = z.object({
  businessName: z.string().trim().default(""),
  businessEmail: z.string().trim().default(""),
  businessPhone: z.string().trim().default(""),
  businessAddress: z.string().trim().default(""),
  gstNumber: z.string().trim().default(""),
  qstNumber: z.string().trim().default(""),
  timezone: z.string().trim().min(1),
  // Pause entre deux séances (rangement / déplacement).
  bufferAfterMin: z.coerce.number().int().min(0).max(480),
  minLeadTimeHours: z.coerce.number().int().min(0).max(720),
  bookingHorizonDays: z.coerce.number().int().min(1).max(365),
  autoConfirm: z.boolean().default(false),
  publicBookingEnabled: z.boolean().default(true),
  bookingIntroText: z.string().trim().default(""),
  taxesEnabled: z.boolean().default(true),
  gstRate: z.coerce.number().min(0).max(100),
  qstRate: z.coerce.number().min(0).max(100),
  invoiceDueDays: z.coerce.number().int().min(0).max(180),
  paymentInstructions: z.string().trim().default(""),
});
