"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { type FormState, str, zodToFieldErrors } from "@/lib/form";
import { prisma } from "@/lib/prisma";
import { clientSchema } from "@/lib/validation";

export async function saveClient(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();

  const id = str(formData, "id") || null;
  const parsed = clientSchema.safeParse({
    name: str(formData, "name"),
    company: str(formData, "company"),
    email: str(formData, "email"),
    phone: str(formData, "phone"),
    billingAddress: str(formData, "billingAddress"),
    notes: str(formData, "notes"),
  });

  if (!parsed.success) {
    return { error: "Vérifie les champs.", fieldErrors: zodToFieldErrors(parsed.error) };
  }

  let clientId = id;
  if (id) {
    await prisma.client.update({ where: { id }, data: parsed.data });
  } else {
    const created = await prisma.client.create({ data: parsed.data });
    clientId = created.id;
  }

  revalidatePath("/clients");
  redirect(`/clients/${clientId}`);
}

export async function setClientArchived(formData: FormData): Promise<void> {
  await requireUser();
  const id = str(formData, "id");
  const archived = str(formData, "archived") === "true";
  if (!id) return;
  await prisma.client.update({ where: { id }, data: { archived } });
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
}
