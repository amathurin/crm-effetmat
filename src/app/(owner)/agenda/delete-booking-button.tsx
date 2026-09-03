"use client";

import { Button } from "@/components/ui/button";
import { deleteBooking } from "./actions";

export function DeleteBookingButton({ id }: { id: string }) {
  return (
    <form
      action={deleteBooking}
      onSubmit={(e) => {
        if (!confirm("Supprimer définitivement ce rendez-vous ?")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Button variant="ghost" size="sm" type="submit" className="text-danger">
        Supprimer
      </Button>
    </form>
  );
}
