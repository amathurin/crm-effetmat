"use client";

import { useActionState, useRef } from "react";
import { Plus } from "lucide-react";
import { Field, FormError, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/form";
import { addLineItem } from "../actions";

export function AddLineForm({ invoiceId }: { invoiceId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState<FormState, FormData>(
    async (prev, fd) => {
      const res = await addLineItem(prev, fd);
      if (res.ok) formRef.current?.reset();
      return res;
    },
    EMPTY_FORM_STATE,
  );

  return (
    <form
      ref={formRef}
      action={action}
      className="flex flex-col gap-3 border-t border-border pt-4"
    >
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <FormError>{state.error}</FormError>
      <div className="grid gap-2 sm:grid-cols-[1fr_5rem_7rem]">
        <Field label="Description" htmlFor="description" error={state.fieldErrors?.description}>
          <Input id="description" name="description" required />
        </Field>
        <Field label="Qté" htmlFor="quantity">
          <Input
            id="quantity"
            name="quantity"
            type="number"
            min={1}
            defaultValue={1}
          />
        </Field>
        <Field label="Prix unitaire" htmlFor="unitPrice" error={state.fieldErrors?.unitCents}>
          <Input id="unitPrice" name="unitPrice" inputMode="decimal" placeholder="0,00" required />
        </Field>
      </div>
      <SubmitButton variant="secondary" size="sm" className="self-start" pendingLabel="Ajout…">
        <Plus className="size-4" /> Ajouter une ligne
      </SubmitButton>
    </form>
  );
}
