import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { applyAdoptionAfterCheckoutPayment, extendAdoptionFromSubscriptionInvoice } from "@/lib/stripe-adoption";

export const dynamic = "force-dynamic";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  if (!stripeSecret || !webhookSecret) {
    return NextResponse.json({ error: "Stripe webhook not configured" }, { status: 503 });
  }

  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const stripe = new Stripe(stripeSecret);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature error:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
      return NextResponse.json({ received: true });
    }
    const heroId = session.metadata?.heroId?.trim();
    const userId = session.metadata?.userId?.trim();
    if (!heroId || !userId) {
      return NextResponse.json({ received: true });
    }

    const customerId = typeof session.customer === "string" ? session.customer : "";
    const paymentIntentId =
      typeof session.payment_intent === "string" ? session.payment_intent : "";

    if (session.mode === "payment") {
      const result = await applyAdoptionAfterCheckoutPayment({
        heroId,
        userId,
        stripeSessionId: session.id,
        stripePaymentIntentId: paymentIntentId,
        stripeCustomerId: customerId,
        amountCents: session.amount_total ?? 0,
        currency: session.currency ?? "usd",
      });
      if (!result.ok && result.code !== "conflict") {
        console.warn("applyAdoptionAfterCheckoutPayment (payment):", result.message);
      }
    } else if (session.mode === "subscription") {
      /** First billing period: same as one-time checkout. Renewals use invoice.paid (subscription_cycle only). */
      const result = await applyAdoptionAfterCheckoutPayment({
        heroId,
        userId,
        stripeSessionId: session.id,
        stripePaymentIntentId: paymentIntentId,
        stripeCustomerId: customerId,
        amountCents: session.amount_total ?? 0,
        currency: session.currency ?? "usd",
      });
      if (!result.ok && result.code !== "conflict") {
        console.warn("applyAdoptionAfterCheckoutPayment (subscription checkout):", result.message);
      }
    }
  }

  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice;
    const br = invoice.billing_reason;
    /** First period is handled by checkout.session.completed to avoid double-extending adoption. */
    if (br !== "subscription_cycle") {
      return NextResponse.json({ received: true });
    }
    const subRef = invoice.parent?.subscription_details?.subscription;
    const subId = typeof subRef === "string" ? subRef : subRef?.id;
    if (!subId) {
      return NextResponse.json({ received: true });
    }

    const sub = await stripe.subscriptions.retrieve(subId);
    const heroId = sub.metadata?.heroId?.trim();
    const userId = sub.metadata?.userId?.trim();
    if (!heroId || !userId) {
      return NextResponse.json({ received: true });
    }
    const customerId =
      typeof sub.customer === "string" ? sub.customer : typeof invoice.customer === "string" ? invoice.customer : "";

    const result = await extendAdoptionFromSubscriptionInvoice({
      heroId,
      userId,
      stripeCustomerId: customerId || undefined,
    });
    if (!result.ok) {
      console.warn("extendAdoptionFromSubscriptionInvoice:", result.message);
    }
  }

  return NextResponse.json({ received: true });
}
