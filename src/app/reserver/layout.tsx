import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata = { title: "Réservation en ligne" };

export default async function ReserverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSettings();

  return (
    <div className="min-h-screen bg-bg">
      <header className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-5">
          <div className="grid size-9 place-items-center rounded-md bg-primary-foreground font-display text-sm font-extrabold text-primary">
            {(settings.businessName || "RD").slice(0, 2).toUpperCase()}
          </div>
          <p className="font-display font-bold uppercase tracking-wider">
            {settings.businessName || "Réservation en ligne"}
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-10">{children}</main>
      <footer className="mx-auto max-w-2xl px-4 pb-10 text-center text-xs text-text-muted">
        {settings.businessEmail ? (
          <>Une question ? {settings.businessEmail}</>
        ) : null}
      </footer>
    </div>
  );
}
