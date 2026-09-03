import type {
  BookingSource,
  BookingStatus,
  InvoiceStatus,
  MediaType,
} from "@prisma/client";

type Tone = "neutral" | "success" | "warning" | "danger" | "info";

export const bookingStatusLabel: Record<BookingStatus, string> = {
  REQUESTED: "Demandé",
  CONFIRMED: "Confirmé",
  COMPLETED: "Terminé",
  CANCELLED: "Annulé",
};

export const bookingStatusTone: Record<BookingStatus, Tone> = {
  REQUESTED: "warning",
  CONFIRMED: "info",
  COMPLETED: "success",
  CANCELLED: "neutral",
};

export const bookingSourceLabel: Record<BookingSource, string> = {
  MANUAL: "Ajouté manuellement",
  CLIENT: "Réservé par le client",
};

export const mediaTypeLabel: Record<MediaType, string> = {
  PHOTO: "Photo",
  VIDEO: "Vidéo",
  PHOTO_VIDEO: "Photo + Vidéo",
};

export const invoiceStatusLabel: Record<InvoiceStatus, string> = {
  DRAFT: "Brouillon",
  SENT: "Envoyée",
  PAID: "Payée",
  OVERDUE: "En retard",
  VOID: "Annulée",
};

export const invoiceStatusTone: Record<InvoiceStatus, Tone> = {
  DRAFT: "neutral",
  SENT: "info",
  PAID: "success",
  OVERDUE: "danger",
  VOID: "neutral",
};
