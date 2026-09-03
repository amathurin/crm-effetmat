"use client";

import Link from "next/link";
import { useActionState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/form";
import { savePackage } from "./actions";

type PackageDefaults = {
  id?: string;
  name?: string;
  description?: string | null;
  mediaType?: string;
  durationMin?: number;
  priceCents?: number;
  color?: string;
  deliverables?: string | null;
  active?: boolean;
  onlineBookable?: boolean;
};

export function PackageForm({ pkg }: { pkg?: PackageDefaults }) {
  const [state, action] = useActionState<FormState, FormData>(
    savePackage,
    EMPTY_FORM_STATE,
  );
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-col gap-4">
      {pkg?.id ? <input type="hidden" name="id" value={pkg.id} /> : null}
      <FormError>{state.error}</FormError>

      <Field label="Nom du forfait" htmlFor="name" error={fe.name}>
        <Input id="name" name="name" defaultValue={pkg?.name} required autoFocus />
      </Field>

      <Field label="Description" htmlFor="description" error={fe.description}>
        <Textarea
          id="description"
          name="description"
          defaultValue={pkg?.description ?? ""}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Type" htmlFor="mediaType" error={fe.mediaType}>
          <Select
            id="mediaType"
            name="mediaType"
            defaultValue={pkg?.mediaType ?? "PHOTO"}
          >
            <option value="PHOTO">Photo</option>
            <option value="VIDEO">Vidéo</option>
            <option value="PHOTO_VIDEO">Photo + Vidéo</option>
          </Select>
        </Field>
        <Field
          label="Durée (minutes)"
          htmlFor="durationMin"
          error={fe.durationMin}
        >
          <Input
            id="durationMin"
            name="durationMin"
            type="number"
            min={15}
            step={15}
            defaultValue={pkg?.durationMin ?? 60}
            required
          />
        </Field>
        <Field label="Prix (avant taxes)" htmlFor="price" error={fe.priceCents}>
          <Input
            id="price"
            name="price"
            inputMode="decimal"
            placeholder="199,00"
            defaultValue={
              pkg?.priceCents != null
                ? (pkg.priceCents / 100).toFixed(2)
                : ""
            }
            required
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Couleur (agenda)" htmlFor="color" error={fe.color}>
          <Input
            id="color"
            name="color"
            type="color"
            defaultValue={pkg?.color ?? "#6366f1"}
            className="h-9 w-20 p-1"
          />
        </Field>
      </div>

      <Field label="Livrables" htmlFor="deliverables" error={fe.deliverables}>
        <Textarea
          id="deliverables"
          name="deliverables"
          defaultValue={pkg?.deliverables ?? ""}
        />
      </Field>

      <label className="flex items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          name="active"
          defaultChecked={pkg?.active ?? true}
          className="size-4 accent-[var(--color-primary)]"
        />
        Forfait actif
      </label>
      <label className="flex items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          name="onlineBookable"
          defaultChecked={pkg?.onlineBookable ?? true}
          className="size-4 accent-[var(--color-primary)]"
        />
        Réservable en ligne par les clients
      </label>

      <div className="mt-2 flex gap-2">
        <SubmitButton pendingLabel="Enregistrement…">
          {pkg?.id ? "Enregistrer" : "Créer le forfait"}
        </SubmitButton>
        <Link
          href="/forfaits"
          className={buttonVariants({ variant: "secondary" })}
        >
          Annuler
        </Link>
      </div>
    </form>
  );
}
