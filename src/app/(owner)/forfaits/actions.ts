"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { bool, type FormState, str, zodToFieldErrors } from "@/lib/form";
import { parseAmountToCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { packageSchema } from "@/lib/validation";

export async function savePackage(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();

  const id = str(formData, "id") || null;
  const priceCents = parseAmountToCents(str(formData, "price"));

  if (priceCents === null) {
    return { error: "Prix invalide.", fieldErrors: { priceCents: "Prix invalide." } };
  }

  const parsed = packageSchema.safeParse({
    name: str(formData, "name"),
    description: str(formData, "description"),
    mediaType: str(formData, "mediaType"),
    durationMin: str(formData, "durationMin"),
    priceCents,
    color: str(formData, "color") || "#6366f1",
    deliverables: str(formData, "deliverables"),
    active: bool(formData, "active"),
    onlineBookable: bool(formData, "onlineBookable"),
  });

  if (!parsed.success) {
    return { error: "Vérifie les champs.", fieldErrors: zodToFieldErrors(parsed.error) };
  }

  if (id) {
    await prisma.package.update({ where: { id }, data: parsed.data });
  } else {
    const max = await prisma.package.aggregate({ _max: { sortOrder: true } });
    await prisma.package.create({
      data: { ...parsed.data, sortOrder: (max._max.sortOrder ?? 0) + 1 },
    });
  }

  revalidatePath("/forfaits");
  revalidatePath("/reserver");
  redirect("/forfaits");
}

export async function setPackageActive(formData: FormData): Promise<void> {
  await requireUser();
  const id = str(formData, "id");
  const active = str(formData, "active") === "true";
  if (!id) return;
  await prisma.package.update({ where: { id }, data: { active } });
  revalidatePath("/forfaits");
}
