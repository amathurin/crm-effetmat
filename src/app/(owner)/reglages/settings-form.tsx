"use client";

import { useActionState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/form";
import { saveBusinessSettings } from "./actions";

const TIMEZONES = [
  "America/Toronto",
  "America/Montreal",
  "America/Halifax",
  "America/Winnipeg",
  "America/Edmonton",
  "America/Vancouver",
  "America/St_Johns",
];

type Defaults = {
  businessName: string;
  businessEmail: string;
  businessPhone: string;
  businessAddress: string;
  gstNumber: string;
  qstNumber: string;
  timezone: string;
  bufferAfterMin: number;
  minLeadTimeHours: number;
  bookingHorizonDays: number;
  autoConfirm: boolean;
  publicBookingEnabled: boolean;
  bookingIntroText: string;
  taxesEnabled: boolean;
  gstRate: number;
  qstRate: number;
  invoiceDueDays: number;
  paymentInstructions: string;
};

function Check({
  name,
  defaultChecked,
  children,
}: {
  name: string;
  defaultChecked: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-text">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="size-4 accent-[var(--color-primary)]"
      />
      {children}
    </label>
  );
}

export function SettingsForm({ settings }: { settings: Defaults }) {
  const [state, action] = useActionState<FormState, FormData>(
    saveBusinessSettings,
    EMPTY_FORM_STATE,
  );
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Entreprise</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom" htmlFor="businessName" error={fe.businessName}>
            <Input
              id="businessName"
              name="businessName"
              defaultValue={settings.businessName}
            />
          </Field>
          <Field label="Courriel" htmlFor="businessEmail" error={fe.businessEmail}>
            <Input
              id="businessEmail"
              name="businessEmail"
              type="email"
              defaultValue={settings.businessEmail}
            />
          </Field>
          <Field label="Téléphone" htmlFor="businessPhone">
            <Input
              id="businessPhone"
              name="businessPhone"
              defaultValue={settings.businessPhone}
            />
          </Field>
          <Field label="Adresse" htmlFor="businessAddress">
            <Input
              id="businessAddress"
              name="businessAddress"
              defaultValue={settings.businessAddress}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Taxes (factures)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Check name="taxesEnabled" defaultChecked={settings.taxesEnabled}>
            Appliquer les taxes sur les factures
          </Check>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="No TPS" htmlFor="gstNumber">
              <Input
                id="gstNumber"
                name="gstNumber"
                defaultValue={settings.gstNumber}
              />
            </Field>
            <Field label="No TVQ" htmlFor="qstNumber">
              <Input
                id="qstNumber"
                name="qstNumber"
                defaultValue={settings.qstNumber}
              />
            </Field>
            <Field label="Taux TPS (%)" htmlFor="gstRate" error={fe.gstRate}>
              <Input
                id="gstRate"
                name="gstRate"
                inputMode="decimal"
                defaultValue={settings.gstRate}
              />
            </Field>
            <Field label="Taux TVQ (%)" htmlFor="qstRate" error={fe.qstRate}>
              <Input
                id="qstRate"
                name="qstRate"
                inputMode="decimal"
                defaultValue={settings.qstRate}
              />
            </Field>
            <Field
              label="Échéance des factures (jours)"
              htmlFor="invoiceDueDays"
              error={fe.invoiceDueDays}
            >
              <Input
                id="invoiceDueDays"
                name="invoiceDueDays"
                type="number"
                min={0}
                defaultValue={settings.invoiceDueDays}
              />
            </Field>
          </div>
          <Field
            label="Modalités de paiement (affichées sur la facture sans Stripe)"
            htmlFor="paymentInstructions"
          >
            <Textarea
              id="paymentInstructions"
              name="paymentInstructions"
              defaultValue={settings.paymentInstructions}
              placeholder="Virement Interac à paiement@exemple.com · Chèque à l'ordre de…"
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agenda & réservation en ligne</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field label="Fuseau horaire" htmlFor="timezone">
            <Select
              id="timezone"
              name="timezone"
              defaultValue={settings.timezone}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace("America/", "").replace("_", " ")}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label="Pause entre les séances (min)"
              htmlFor="bufferAfterMin"
              error={fe.bufferAfterMin}
              hint="Rangement + déplacement. Détermine aussi l'espacement des créneaux : chaque créneau proposé = durée du forfait + cette pause."
            >
              <Input
                id="bufferAfterMin"
                name="bufferAfterMin"
                type="number"
                min={0}
                step={5}
                defaultValue={settings.bufferAfterMin}
              />
            </Field>
            <Field
              label="Délai minimum (h)"
              htmlFor="minLeadTimeHours"
              error={fe.minLeadTimeHours}
            >
              <Input
                id="minLeadTimeHours"
                name="minLeadTimeHours"
                type="number"
                min={0}
                defaultValue={settings.minLeadTimeHours}
              />
            </Field>
            <Field
              label="Horizon (jours)"
              htmlFor="bookingHorizonDays"
              error={fe.bookingHorizonDays}
            >
              <Input
                id="bookingHorizonDays"
                name="bookingHorizonDays"
                type="number"
                min={1}
                defaultValue={settings.bookingHorizonDays}
              />
            </Field>
          </div>

          <Check
            name="publicBookingEnabled"
            defaultChecked={settings.publicBookingEnabled}
          >
            Page de réservation publique active
          </Check>
          <Check name="autoConfirm" defaultChecked={settings.autoConfirm}>
            Confirmer automatiquement les réservations des clients
          </Check>

          <Field label="Message d'accueil (page publique)" htmlFor="bookingIntroText">
            <Textarea
              id="bookingIntroText"
              name="bookingIntroText"
              defaultValue={settings.bookingIntroText}
            />
          </Field>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <SubmitButton pendingLabel="Enregistrement…">Enregistrer</SubmitButton>
        {state.ok ? (
          <span className="text-sm text-success">Réglages enregistrés.</span>
        ) : null}
        <FormError>{state.error}</FormError>
      </div>
    </form>
  );
}
