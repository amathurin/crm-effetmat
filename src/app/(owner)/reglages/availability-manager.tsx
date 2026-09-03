"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FormError, Input, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { minutesToHHMM, weekdayLabel } from "@/lib/datetime";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/form";
import {
  addAvailabilityRule,
  addException,
  deleteAvailabilityRule,
  deleteException,
} from "./actions";

type Rule = { id: string; weekday: number; startMinutes: number; endMinutes: number };
type Exception = {
  id: string;
  date: string;
  type: "BLOCKED" | "CUSTOM_HOURS";
  startMinutes: number | null;
  endMinutes: number | null;
  note: string | null;
};

export function AvailabilityManager({
  rules,
  exceptions,
}: {
  rules: Rule[];
  exceptions: Exception[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <RulesCard rules={rules} />
      <ExceptionsCard exceptions={exceptions} />
    </div>
  );
}

function RulesCard({ rules }: { rules: Rule[] }) {
  const [state, action] = useActionState<FormState, FormData>(
    addAvailabilityRule,
    EMPTY_FORM_STATE,
  );

  const byDay = new Map<number, Rule[]>();
  for (const r of rules) {
    if (!byDay.has(r.weekday)) byDay.set(r.weekday, []);
    byDay.get(r.weekday)!.push(r);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Disponibilités récurrentes</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {rules.length === 0 ? (
          <p className="text-sm text-text-muted">
            Aucune plage définie. Les clients ne pourront pas réserver en ligne.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7].flatMap((d) =>
              (byDay.get(d) ?? []).map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between rounded-lg bg-surface-muted px-3 py-2 text-sm"
                >
                  <span>
                    <span className="font-medium capitalize">
                      {weekdayLabel(d)}
                    </span>{" "}
                    · {minutesToHHMM(r.startMinutes)} – {minutesToHHMM(r.endMinutes)}
                  </span>
                  <form action={deleteAvailabilityRule}>
                    <input type="hidden" name="id" value={r.id} />
                    <button
                      type="submit"
                      aria-label="Supprimer"
                      className="text-text-muted hover:text-danger"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </form>
                </li>
              )),
            )}
          </ul>
        )}

        <form action={action} className="flex flex-col gap-3 border-t border-border pt-4">
          <FormError>{state.error}</FormError>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Jour" htmlFor="weekday">
              <Select id="weekday" name="weekday" defaultValue="1">
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <option key={d} value={d} className="capitalize">
                    {weekdayLabel(d)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Début" htmlFor="start">
              <Input id="start" name="start" type="time" defaultValue="09:00" />
            </Field>
            <Field label="Fin" htmlFor="end">
              <Input id="end" name="end" type="time" defaultValue="17:00" />
            </Field>
          </div>
          <SubmitButton variant="secondary" size="sm" pendingLabel="Ajout…">
            Ajouter la plage
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}

function ExceptionsCard({ exceptions }: { exceptions: Exception[] }) {
  const [state, action] = useActionState<FormState, FormData>(
    addException,
    EMPTY_FORM_STATE,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Congés & exceptions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {exceptions.length === 0 ? (
          <p className="text-sm text-text-muted">Aucune exception.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {exceptions.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between rounded-lg bg-surface-muted px-3 py-2 text-sm"
              >
                <span>
                  <span className="font-medium">{e.date}</span> ·{" "}
                  {e.type === "BLOCKED"
                    ? "Bloqué"
                    : `${minutesToHHMM(e.startMinutes ?? 0)} – ${minutesToHHMM(e.endMinutes ?? 0)}`}
                  {e.note ? (
                    <span className="text-text-muted"> — {e.note}</span>
                  ) : null}
                </span>
                <form action={deleteException}>
                  <input type="hidden" name="id" value={e.id} />
                  <button
                    type="submit"
                    aria-label="Supprimer"
                    className="text-text-muted hover:text-danger"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form action={action} className="flex flex-col gap-3 border-t border-border pt-4">
          <FormError>{state.error}</FormError>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Date" htmlFor="date">
              <Input id="date" name="date" type="date" required />
            </Field>
            <Field label="Type" htmlFor="type">
              <Select id="type" name="type" defaultValue="BLOCKED">
                <option value="BLOCKED">Journée bloquée</option>
                <option value="CUSTOM_HOURS">Heures spéciales</option>
              </Select>
            </Field>
            <Field label="Début (si heures spéciales)" htmlFor="exStart">
              <Input id="exStart" name="start" type="time" />
            </Field>
            <Field label="Fin (si heures spéciales)" htmlFor="exEnd">
              <Input id="exEnd" name="end" type="time" />
            </Field>
          </div>
          <Field label="Note" htmlFor="note">
            <Input id="note" name="note" placeholder="Vacances, férié…" />
          </Field>
          <SubmitButton variant="secondary" size="sm" pendingLabel="Ajout…">
            Ajouter l'exception
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
