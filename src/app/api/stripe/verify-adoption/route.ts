import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { applyAdoptionAfterCheckoutPayment } from "@/lib/stripe-adoption";
import { getSiteSession } from "@/lib/site-auth";

const stripeSecret = process.env.STRIPE_SECRET_KEY;

/**
 * Confirms paid Checkout and applies adoption when the webhook is delayed or unreachable
 * (e.g. local dev without stripe listen). Same checks as /api/stripe/webhook.
 */
export async function POST(req: NextRequest) {
  if (!stripeSecret) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const site = await getSiteSession();
  if (!site) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { sessionId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sessionId = body.sessionId?.trim();
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const stripe = new Stripe(stripeSecret);
  let checkoutSession: Stripe.Checkout.Session;
  try {
    checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return NextResponse.json({ error: "Invalid or expired checkout session" }, { status: 400 });
  }

  const status = checkoutSession.payment_status;
  if (status !== "paid" && status !== "no_payment_required") {
    return NextResponse.json({ error: "Payment not completed" }, { status: 400 });
  }

  const heroId = checkoutSession.metadata?.heroId?.trim();
  const userId = checkoutSession.metadata?.userId?.trim();
  if (!heroId || !userId) {
    return NextResponse.json({ error: "This checkout is not an adoption session" }, { status: 400 });
  }
  if (userId !== site.sub) {
    return NextResponse.json({ error: "This purchase belongs to a different account" }, { status: 403 });
  }

  const customerId =
    typeof checkoutSession.customer === "string" ? checkoutSession.customer : "";

  if (checkoutSession.mode === "subscription") {
    const subId = checkoutSession.subscription;
    if (typeof subId !== "string") {
      return NextResponse.json({ error: "Subscription not ready yet; try again in a moment." }, { status: 409 });
    }
    const sub = await stripe.subscriptions.retrieve(subId);
    const sh = sub.metadata?.heroId?.trim();
    const su = sub.metadata?.userId?.trim();
    if (sh !== heroId || su !== userId) {
      return NextResponse.json({ error: "Subscription metadata mismatch" }, { status: 400 });
    }
  }

  const result = await applyAdoptionAfterCheckoutPayment({
    heroId,
    userId,
    stripeSessionId: checkoutSession.id,
    stripePaymentIntentId:
      typeof checkoutSession.payment_intent === "string" ? checkoutSession.payment_intent : "",
    stripeCustomerId: customerId,
    amountCents: checkoutSession.amount_total ?? 0,
    currency: checkoutSession.currency ?? "usd",
  });

  if (!result.ok) {
    if (result.code === "conflict") {
      return NextResponse.json({ error: result.message }, { status: 409 });
    }
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, slug: result.slug });
}
