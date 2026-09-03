import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Card, CardContent } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata = { title: "Connexion — CRM" };

export default async function ConnexionPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-mint/40 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2.5 text-center">
          <div className="grid size-12 place-items-center rounded-md bg-primary font-display text-base font-extrabold text-primary-foreground">
            EM<span className="text-accent">.</span>
          </div>
          <h1 className="font-display text-lg font-bold uppercase tracking-wide text-primary">
            Effet Mat — CRM
          </h1>
          <p className="text-sm text-text-muted">
            Espace propriétaire — connectez-vous pour continuer.
          </p>
        </div>
        <Card>
          <CardContent className="py-6">
            <LoginForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
