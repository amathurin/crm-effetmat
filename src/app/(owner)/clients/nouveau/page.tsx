import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ClientForm } from "../client-form";

export const metadata = { title: "Nouveau client — CRM" };

export default function NouveauClientPage() {
  return (
    <>
      <PageHeader title="Nouveau client" />
      <Card>
        <CardContent className="py-6">
          <ClientForm />
        </CardContent>
      </Card>
    </>
  );
}
