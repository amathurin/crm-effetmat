"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/form";
import { bookingStatusLabel } from "@/lib/labels";
import { saveBooking } from "./actions";

type Option = { id: string; name: string };
type PackageOption = Option & { durationMin: number };

function addMinutesLocal(value: string, minutes: number): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const out = new Date(d.getTime() + minutes * 60_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${out.getFullYear()}-${pad(out.getMonth() + 1)}-${pad(out.getDate())}T${pad(out.getHours())}:${pad(out.getMinutes())}`;
}

export function BookingForm({
  booking,
  clients,
  packages,
  defaults,
}: {
  booking?: {
    id: string;
    clientId: string;
    packageId: string | null;
    propertyAddress: string;
    startAtLocal: string;
    endAtLocal: string;
    status: string;
    notes: string | null;
  };
  clients: Option[];
  packages: PackageOption[];
  defaults?: { clientId?: string; startAtLocal?: string };
}) {
  const [state, action] = useActionState<FormState, FormData>(
    saveBooking,
    EMPTY_FORM_STATE,
  );
  const fe = state.fieldErrors ?? {};

  const [packageId, setPackageId] = useState(booking?.packageId ?? "");
  const [startAt, setStartAt] = useState(
    booking?.startAtLocal ?? defaults?.startAtLocal ?? "",
  );
  const [endAt, setEndAt] = useState(booking?.endAtLocal ?? "");
  const [endTouched, setEndTouched] = useState(Boolean(booking?.endAtLocal));

  const duration = packages.find((p) => p.id === packageId)?.durationMin;
  const autoEnd =
    !endTouched && startAt && duration
      ? addMinutesLocal(startAt, duration)
      : null;
  const endValue = autoEnd ?? endAt;

  return (
    <form action={action} className="flex flex-col gap-4">
      {booking?.id ? <input type="hidden" name="id" value={booking.id} /> : null}
      <FormError>{state.error}</FormError>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Client" htmlFor="clientId" error={fe.clientId}>
          <Select
            id="clientId"
            name="clientId"
            defaultValue={booking?.clientId ?? defaults?.clientId ?? ""}
            required
          >
            <option value="" disabled>
              Choisir un client…
            </option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Forfait" htmlFor="packageId" error={fe.packageId}>
          <Select
            id="packageId"
            name="packageId"
            value={packageId}
            onChange={(e) => setPackageId(e.target.value)}
          >
            <option value="">Aucun / sur mesure</option>
            {packages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.durationMin} min)
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field
        label="Adresse de la propriété"
        htmlFor="propertyAddress"
        error={fe.propertyAddress}
      >
        <Input
          id="propertyAddress"
          name="propertyAddress"
          defaultValue={booking?.propertyAddress ?? ""}
          placeholder="123 rue Principale, Montréal, QC"
          required
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Début" htmlFor="startAt" error={fe.startAt}>
          <Input
            id="startAt"
            name="startAt"
            type="datetime-local"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            required
          />
        </Field>
        <Field
          label="Fin"
          htmlFor="endAt"
          error={fe.endAt}
          hint={
            !endTouched && duration
              ? "Calculée d'après la durée du forfait."
              : undefined
          }
        >
          <Input
            id="endAt"
            name="endAt"
            type="datetime-local"
            value={endValue}
            onChange={(e) => {
              setEndTouched(true);
              setEndAt(e.target.value);
            }}
            required
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Statut" htmlFor="status" error={fe.status}>
          <Select
            id="status"
            name="status"
            defaultValue={booking?.status ?? "CONFIRMED"}
          >
            {(
              ["REQUESTED", "CONFIRMED", "COMPLETED", "CANCELLED"] as const
            ).map((s) => (
              <option key={s} value={s}>
                {bookingStatusLabel[s]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Notes" htmlFor="notes" error={fe.notes}>
        <Textarea
          id="notes"
          name="notes"
          defaultValue={booking?.notes ?? ""}
          placeholder="Code d'accès, stationnement, consignes particulières…"
        />
      </Field>

      <div className="mt-2 flex gap-2">
        <SubmitButton pendingLabel="Enregistrement…">
          {booking?.id ? "Enregistrer" : "Créer le rendez-vous"}
        </SubmitButton>
        <Link
          href={booking?.id ? `/agenda/${booking.id}` : "/agenda"}
          className={buttonVariants({ variant: "secondary" })}
        >
          Annuler
        </Link>
      </div>
    </form>
  );
}
