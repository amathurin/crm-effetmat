"use client";

import { useActionState } from "react";
import { FormError } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/form";
import { finalizeInvoiceAction } from "../actions";

export function FinalizeButton({
  invoiceId,
  stripeEnabled,
}: {
  invoiceId: string;
  stripeEnabled: boolean;
}) {
  const [state, action] = useActionState<FormState, FormData>(
    finalizeInvoiceAction,
    EMPTY_FORM_STATE,
  );

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <FormError>{state.error}</FormError>
      <SubmitButton className="w-full" pendingLabel="Envoi…">
        Finaliser et envoyer
      </SubmitButton>
      <p className="text-xs text-text-muted">
        {stripeEnabled
          ? "Crée la facture dans Stripe et envoie le lien de paiement au client."
          : "Attribue le numéro et envoie la facture au client par courriel."}
      </p>
    </form>
  );
}
