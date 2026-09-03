import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata = { title: "Facture" };

export default async function FactureLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSettings();
  return (
    <div className="min-h-screen bg-bg">
      <header className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-2xl px-4 py-5">
          <p className="font-display font-bold uppercase tracking-wider">
            {settings.businessName || "Facture"}
          </p>
        </div>
      </header>
      <div className="mx-auto max-w-2xl px-4 py-10">{children}</div>
    </div>
  );
}
