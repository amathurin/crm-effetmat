import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { AppShell } from "@/components/app-shell";

// Espace propriétaire : toujours rendu à la demande (données live, session).
export const dynamic = "force-dynamic";

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/connexion" });
  }

  return (
    <AppShell
      user={{
        name: session.user.name ?? "",
        email: session.user.email ?? "",
      }}
      signOutAction={handleSignOut}
    >
      {children}
    </AppShell>
  );
}
