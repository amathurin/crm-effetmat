"use client";

import Link from "next/link";
import { useActionState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Field, FormError, Input, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/form";
import { saveClient } from "./actions";

type ClientDefaults = {
  id?: string;
  name?: string;
  company?: string | null;
  email?: string;
  phone?: string | null;
  billingAddress?: string | null;
  notes?: string | null;
};

export function ClientForm({ client }: { client?: ClientDefaults }) {
  const [state, action] = useActionState<FormState, FormData>(
    saveClient,
    EMPTY_FORM_STATE,
  );
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-col gap-4">
      {client?.id ? <input type="hidden" name="id" value={client.id} /> : null}
      <FormError>{state.error}</FormError>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom" htmlFor="name" error={fe.name}>
          <Input
            id="name"
            name="name"
            defaultValue={client?.name}
            required
            autoFocus
          />
        </Field>
        <Field label="Entreprise / courtier" htmlFor="company" error={fe.company}>
          <Input
            id="company"
            name="company"
            defaultValue={client?.company ?? ""}
          />
        </Field>
        <Field label="Courriel" htmlFor="email" error={fe.email}>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={client?.email}
            required
          />
        </Field>
        <Field label="Téléphone" htmlFor="phone" error={fe.phone}>
          <Input id="phone" name="phone" defaultValue={client?.phone ?? ""} />
        </Field>
      </div>

      <Field
        label="Adresse de facturation"
        htmlFor="billingAddress"
        error={fe.billingAddress}
      >
        <Input
          id="billingAddress"
          name="billingAddress"
          defaultValue={client?.billingAddress ?? ""}
        />
      </Field>

      <Field label="Notes" htmlFor="notes" error={fe.notes}>
        <Textarea id="notes" name="notes" defaultValue={client?.notes ?? ""} />
      </Field>

      <div className="mt-2 flex gap-2">
        <SubmitButton pendingLabel="Enregistrement…">
          {client?.id ? "Enregistrer" : "Créer le client"}
        </SubmitButton>
        <Link
          href={client?.id ? `/clients/${client.id}` : "/clients"}
          className={buttonVariants({ variant: "secondary" })}
        >
          Annuler
        </Link>
      </div>
    </form>
  );
}
