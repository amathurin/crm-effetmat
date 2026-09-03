import type { NextRequest } from "next/server";
import type Stripe from "stripe";
import { applyStripePaid } from "@/lib/invoice";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return new Response("Stripe non configuré", { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Signature manquante", { status: 400 });

  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch {
    return new Response("Signature invalide", { status: 400 });
  }

  try {
    switch (event.type) {
      case "invoice.paid": {
        const inv = event.data.object as Stripe.Invoice;
        const pi = (inv as unknown as { payment_intent?: unknown })
          .payment_intent;
        await applyStripePaid(
          inv.id as string,
          typeof pi === "string" ? pi : null,
          inv.amount_paid ?? inv.total ?? 0,
        );
        break;
      }
      case "invoice.finalized": {
        const inv = event.data.object as Stripe.Invoice;
        if (inv.hosted_invoice_url) {
          await prisma.invoice.updateMany({
            where: { stripeInvoiceId: inv.id as string },
            data: { hostedInvoiceUrl: inv.hosted_invoice_url },
          });
        }
        break;
      }
      case "invoice.voided":
      case "invoice.marked_uncollectible": {
        const inv = event.data.object as Stripe.Invoice;
        const local = await prisma.invoice.findUnique({
          where: { stripeInvoiceId: inv.id as string },
        });
        if (local && local.status !== "PAID") {
          await prisma.invoice.update({
            where: { id: local.id },
            data: { status: "VOID" },
          });
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("Stripe webhook:", err);
    return new Response("Erreur interne", { status: 500 });
  }

  return new Response("ok");
}
