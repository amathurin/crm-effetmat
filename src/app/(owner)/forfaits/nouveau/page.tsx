import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { PackageForm } from "../package-form";

export const metadata = { title: "Nouveau forfait — CRM" };

export default function NouveauForfaitPage() {
  return (
    <>
      <PageHeader title="Nouveau forfait" />
      <Card>
        <CardContent className="py-6">
          <PackageForm />
        </CardContent>
      </Card>
    </>
  );
}
