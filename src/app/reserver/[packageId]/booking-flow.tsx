"use client";

import { useActionState, useMemo, useState } from "react";
import { ArrowLeft, CalendarX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FormError, Input, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import type { DaySlots } from "@/lib/availability";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/form";
import { createPublicBooking } from "../actions";

type SelectedSlot = { start: string; dayLabel: string; timeLabel: string };

export function BookingFlow({
  packageId,
  packageName,
  durationMin,
  days,
}: {
  packageId: string;
  packageName: string;
  durationMin: number;
  days: DaySlots[];
}) {
  const [selected, setSelected] = useState<SelectedSlot | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [state, action] = useActionState<FormState, FormData>(
    createPublicBooking,
    EMPTY_FORM_STATE,
  );

  const visibleDays = useMemo(
    () => (showAll ? days : days.slice(0, 7)),
    [days, showAll],
  );

  if (days.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
          <CalendarX className="size-6 text-text-muted" />
          <p className="text-sm font-medium text-text">
            Aucun créneau disponible pour le moment
          </p>
          <p className="max-w-xs text-sm text-text-muted">
            Écrivez-nous directement, nous trouverons une date ensemble.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!selected) {
    return (
      <div className="flex flex-col gap-5">
        <p className="text-sm text-text-muted">
          Séance de {durationMin} minutes. Choisissez un créneau :
        </p>
        {visibleDays.map((day) => (
          <div key={day.date}>
            <p className="mb-2 text-sm font-medium capitalize text-text">
              {day.label}
            </p>
            <div className="flex flex-wrap gap-2">
              {day.slots.map((slot) => (
                <button
                  key={slot.start}
                  type="button"
                  onClick={() =>
                    setSelected({
                      start: slot.start,
                      dayLabel: day.label,
                      timeLabel: slot.label,
                    })
                  }
                  className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
                >
                  {slot.label}
                </button>
              ))}
            </div>
          </div>
        ))}
        {!showAll && days.length > 7 ? (
          <Button
            variant="secondary"
            size="sm"
            className="self-start"
            onClick={() => setShowAll(true)}
          >
            Voir plus de dates
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => setSelected(null)}
        className="inline-flex items-center gap-1.5 self-start text-sm text-text-muted hover:text-text"
      >
        <ArrowLeft className="size-4" /> Changer de créneau
      </button>

      <Card>
        <CardContent className="py-4">
          <p className="text-sm text-text-muted">Créneau choisi</p>
          <p className="text-base font-semibold capitalize text-text">
            {selected.dayLabel} · {selected.timeLabel}
          </p>
          <p className="text-sm text-text-muted">{packageName}</p>
        </CardContent>
      </Card>

      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="packageId" value={packageId} />
        <input type="hidden" name="start" value={selected.start} />
        <FormError>{state.error}</FormError>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom complet" htmlFor="name" error={state.fieldErrors?.name}>
            <Input id="name" name="name" required autoFocus />
          </Field>
          <Field label="Courriel" htmlFor="email" error={state.fieldErrors?.email}>
            <Input id="email" name="email" type="email" required />
          </Field>
          <Field label="Téléphone" htmlFor="phone">
            <Input id="phone" name="phone" type="tel" />
          </Field>
        </div>

        <Field
          label="Adresse de la propriété"
          htmlFor="propertyAddress"
          error={state.fieldErrors?.propertyAddress}
        >
          <Input
            id="propertyAddress"
            name="propertyAddress"
            placeholder="123 rue Principale, Montréal, QC"
            required
          />
        </Field>

        <Field label="Précisions (facultatif)" htmlFor="notes">
          <Textarea
            id="notes"
            name="notes"
            placeholder="Type de propriété, superficie, code d'accès, stationnement…"
          />
        </Field>

        <SubmitButton className="mt-1 self-start" pendingLabel="Envoi…">
          Confirmer la réservation
        </SubmitButton>
      </form>
    </div>
  );
}
