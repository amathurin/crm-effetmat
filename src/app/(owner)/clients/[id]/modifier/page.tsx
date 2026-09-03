import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/prisma";
import { ClientForm } from "../../client-form";

export const metadata = { title: "Modifier le client — CRM" };

export default async function ModifierClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) notFound();

  return (
    <>
      <PageHeader title={`Modifier — ${client.name}`} />
      <Card>
        <CardContent className="py-6">
          <ClientForm client={client} />
        </CardContent>
      </Card>
    </>
  );
}
