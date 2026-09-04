import { DateTime } from "luxon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { mapsEnabled } from "@/lib/maps";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { stripeEnabled } from "@/lib/stripe";
import { AvailabilityManager } from "./availability-manager";
import { GoogleCalendarCard } from "./google-calendar-card";
import { PublicLink } from "./public-link";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Réglages — CRM" };

export default async function ReglagesPage({
  searchParams,
}: {
  searchParams: Promise<{ google?: string }>;
}) {
  const [{ google: googleNotice }, settings, rules, exceptions] =
    await Promise.all([
      searchParams,
      getSettings(),
      prisma.availabilityRule.findMany({
        orderBy: [{ weekday: "asc" }, { startMinutes: "asc" }],
      }),
      prisma.availabilityException.findMany({ orderBy: { date: "asc" } }),
    ]);

  return (
    <>
      <PageHeader
        title="Réglages"
        description="Coordonnées, taxes, agenda et disponibilités."
      />

      <PublicLink
        url={`${process.env.APP_URL ?? "http://localhost:3000"}/reserver`}
        enabled={settings.publicBookingEnabled}
      />

      <Card>
        <CardHeader>
          <CardTitle>Paiement en ligne (Stripe)</CardTitle>
          <span
            className={
              stripeEnabled()
                ? "text-xs font-medium text-success"
                : "text-xs font-medium text-text-muted"
            }
          >
            {stripeEnabled() ? "Connecté" : "Non configuré"}
          </span>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-muted">
            {stripeEnabled()
              ? "Les factures finalisées sont créées dans Stripe ; le client reçoit un lien de paiement par carte et le statut se met à jour automatiquement."
              : "Ajoutez STRIPE_SECRET_KEY et STRIPE_WEBHOOK_SECRET dans .env pour activer le paiement par carte. Sans Stripe, les factures restent utilisables avec les modalités de paiement ci-dessous."}
          </p>
        </CardContent>
      </Card>

      <GoogleCalendarCard notice={googleNotice} />

      <Card>
        <CardHeader>
          <CardTitle>Trajet réel (Google Maps)</CardTitle>
          <span
            className={
              mapsEnabled()
                ? "text-xs font-medium text-success"
                : "text-xs font-medium text-text-muted"
            }
          >
            {mapsEnabled() ? "Connecté" : "Non configuré"}
          </span>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-muted">
            {mapsEnabled()
              ? "Le battement entre deux séances est ajusté au temps de trajet réel (Google Maps) quand il dépasse le battement fixe du forfait."
              : "Ajoutez GOOGLE_MAPS_API_KEY dans .env (API Distance Matrix activée, facturation Google Cloud requise) pour ajuster automatiquement le battement au trajet réel entre deux adresses. Sans elle, seul le battement fixe du forfait s'applique."}
          </p>
        </CardContent>
      </Card>

      <SettingsForm
        settings={{
          businessName: settings.businessName,
          businessEmail: settings.businessEmail,
          businessPhone: settings.businessPhone,
          businessAddress: settings.businessAddress,
          gstNumber: settings.gstNumber,
          qstNumber: settings.qstNumber,
          timezone: settings.timezone,
          bufferAfterMin: settings.bufferAfterMin,
          slotIntervalMin: settings.slotIntervalMin,
          minLeadTimeHours: settings.minLeadTimeHours,
          bookingHorizonDays: settings.bookingHorizonDays,
          autoConfirm: settings.autoConfirm,
          publicBookingEnabled: settings.publicBookingEnabled,
          bookingIntroText: settings.bookingIntroText,
          taxesEnabled: settings.taxesEnabled,
          gstRate: Number(settings.gstRate),
          qstRate: Number(settings.qstRate),
          invoiceDueDays: settings.invoiceDueDays,
          paymentInstructions: settings.paymentInstructions,
        }}
      />

      <AvailabilityManager
        rules={rules.map((r) => ({
          id: r.id,
          weekday: r.weekday,
          startMinutes: r.startMinutes,
          endMinutes: r.endMinutes,
        }))}
        exceptions={exceptions.map((e) => ({
          id: e.id,
          date: DateTime.fromJSDate(e.date, { zone: "utc" }).toFormat(
            "yyyy-LL-dd",
          ),
          type: e.type,
          startMinutes: e.startMinutes,
          endMinutes: e.endMinutes,
          note: e.note,
        }))}
      />
    </>
  );
}
