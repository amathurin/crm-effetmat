"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { type FormState, str, zodToFieldErrors } from "@/lib/form";
import {
  createInvoiceForBooking,
  emailInvoiceToClient,
  finalizeInvoice,
  markInvoicePaid,
  recalcInvoiceTotals,
  voidInvoice,
} from "@/lib/invoice";
import { parseAmountToCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { lineItemSchema } from "@/lib/validation";

function revalidateInvoice(id: string) {
  revalidatePath("/factures");
  revalidatePath(`/factures/${id}`);
  revalidatePath("/dashboard");
}

export async function createInvoiceAction(formData: FormData): Promise<void> {
  await requireUser();
  const bookingId = str(formData, "bookingId");
  if (!bookingId) return;
  const invoice = await createInvoiceForBooking(bookingId);
  revalidatePath("/agenda");
  revalidatePath(`/agenda/${bookingId}`);
  revalidatePath("/factures");
  redirect(`/factures/${invoice.id}`);
}

async function assertDraft(invoiceId: string) {
  const inv = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { status: true },
  });
  return inv?.status === "DRAFT";
}

export async function addLineItem(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const invoiceId = str(formData, "invoiceId");
  if (!invoiceId || !(await assertDraft(invoiceId))) {
    return { error: "Facture non modifiable." };
  }

  const unitCents = parseAmountToCents(str(formData, "unitPrice"));
  if (unitCents === null) {
    return { error: "Prix invalide.", fieldErrors: { unitCents: "Prix invalide." } };
  }
  const parsed = lineItemSchema.safeParse({
    description: str(formData, "description"),
    quantity: str(formData, "quantity") || "1",
    unitCents,
  });
  if (!parsed.success) {
    return {
      error: "Vérifiez la ligne.",
      fieldErrors: zodToFieldErrors(parsed.error),
    };
  }

  const max = await prisma.invoiceLineItem.aggregate({
    where: { invoiceId },
    _max: { sortOrder: true },
  });
  await prisma.invoiceLineItem.create({
    data: {
      invoiceId,
      description: parsed.data.description,
      quantity: parsed.data.quantity,
      unitCents: parsed.data.unitCents,
      amountCents: parsed.data.unitCents * parsed.data.quantity,
      sortOrder: (max._max.sortOrder ?? 0) + 1,
    },
  });
  await recalcInvoiceTotals(invoiceId);
  revalidateInvoice(invoiceId);
  return { ok: true };
}

export async function deleteLineItem(formData: FormData): Promise<void> {
  await requireUser();
  const invoiceId = str(formData, "invoiceId");
  const itemId = str(formData, "itemId");
  if (!invoiceId || !itemId || !(await assertDraft(invoiceId))) return;
  await prisma.invoiceLineItem.deleteMany({ where: { id: itemId, invoiceId } });
  await recalcInvoiceTotals(invoiceId);
  revalidateInvoice(invoiceId);
}

export async function saveInvoiceNotes(formData: FormData): Promise<void> {
  await requireUser();
  const invoiceId = str(formData, "invoiceId");
  if (!invoiceId) return;
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { notes: str(formData, "notes") || null },
  });
  revalidateInvoice(invoiceId);
}

export async function finalizeInvoiceAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const invoiceId = str(formData, "invoiceId");
  if (!invoiceId) return { error: "Facture introuvable." };
  try {
    await finalizeInvoice(invoiceId);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Échec de la finalisation.",
    };
  }
  revalidateInvoice(invoiceId);
  return { ok: true };
}

export async function resendInvoiceAction(formData: FormData): Promise<void> {
  await requireUser();
  const invoiceId = str(formData, "invoiceId");
  if (!invoiceId) return;
  await emailInvoiceToClient(invoiceId);
  revalidateInvoice(invoiceId);
}

export async function markPaidAction(formData: FormData): Promise<void> {
  await requireUser();
  const invoiceId = str(formData, "invoiceId");
  const method = str(formData, "method") || "manuel";
  if (!invoiceId) return;
  await markInvoicePaid(invoiceId, method);
  revalidateInvoice(invoiceId);
}

export async function voidInvoiceAction(formData: FormData): Promise<void> {
  await requireUser();
  const invoiceId = str(formData, "invoiceId");
  if (!invoiceId) return;
  await voidInvoice(invoiceId);
  revalidateInvoice(invoiceId);
}
