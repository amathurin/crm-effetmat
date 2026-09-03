import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/prisma";
import { PackageForm } from "../../package-form";

export const metadata = { title: "Modifier le forfait — CRM" };

export default async function ModifierForfaitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pkg = await prisma.package.findUnique({ where: { id } });
  if (!pkg) notFound();

  return (
    <>
      <PageHeader title={`Modifier — ${pkg.name}`} />
      <Card>
        <CardContent className="py-6">
          <PackageForm pkg={pkg} />
        </CardContent>
      </Card>
    </>
  );
}
