import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "Merci — Réservation" };

export default async function MerciPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string }>;
}) {
  const { statut } = await searchParams;
  const confirmed = statut === "confirme";

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <CheckCircle2 className="size-8 text-success" />
        <h1 className="text-lg font-semibold text-text">
          {confirmed ? "Séance confirmée !" : "Demande envoyée !"}
        </h1>
        <p className="max-w-sm text-sm text-text-muted">
          {confirmed
            ? "Votre séance est réservée. Vous venez de recevoir un courriel de confirmation avec un fichier d'agenda. La facture vous sera envoyée après la séance."
            : "Nous avons bien reçu votre demande. Vous recevrez un courriel dès qu'elle sera confirmée."}
        </p>
        <Link href="/reserver" className={buttonVariants({ variant: "secondary" })}>
          Retour aux prestations
        </Link>
      </CardContent>
    </Card>
  );
}
