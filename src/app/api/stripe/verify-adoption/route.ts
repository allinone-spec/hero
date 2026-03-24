import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import dbConnect from "@/lib/mongodb";
import Hero from "@/lib/models/Hero";
import AdoptionTransaction from "@/lib/models/AdoptionTransaction";
import { User } from "@/lib/models/User";
import { isAdoptionActive, nextAdoptionExpiry } from "@/lib/adoption";
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

  await dbConnect();
  const hero = await Hero.findById(heroId).select("_id slug ownerUserId adoptionExpiry published");
  if (!hero) {
    return NextResponse.json({ error: "Hero not found" }, { status: 404 });
  }
  if (!hero.published) {
    return NextResponse.json({ error: "Hero is not available for adoption" }, { status: 400 });
  }
  const currentOwnerId = hero.ownerUserId?.toString();
  if (isAdoptionActive(hero.adoptionExpiry) && currentOwnerId && currentOwnerId !== userId) {
    await AdoptionTransaction.updateOne(
      { stripeSessionId: checkoutSession.id },
      {
        $set: {
          stripePaymentIntentId:
            typeof checkoutSession.payment_intent === "string" ? checkoutSession.payment_intent : "",
          stripeCustomerId: typeof checkoutSession.customer === "string" ? checkoutSession.customer : "",
          userId,
          heroId,
          amountCents: checkoutSession.amount_total ?? 0,
          currency: checkoutSession.currency ?? "usd",
          status: "blocked",
          note: "Active adoption already owned by another user",
        },
      },
      { upsert: true }
    );
    return NextResponse.json({ error: "Hero already has an active supporter." }, { status: 409 });
  }

  await Hero.findByIdAndUpdate(heroId, {
    ownerUserId: userId,
    adoptionExpiry: nextAdoptionExpiry(hero.adoptionExpiry),
  });
  await AdoptionTransaction.updateOne(
    { stripeSessionId: checkoutSession.id },
    {
      $set: {
        stripePaymentIntentId:
          typeof checkoutSession.payment_intent === "string" ? checkoutSession.payment_intent : "",
        stripeCustomerId: typeof checkoutSession.customer === "string" ? checkoutSession.customer : "",
        userId,
        heroId,
        amountCents: checkoutSession.amount_total ?? 0,
        currency: checkoutSession.currency ?? "usd",
        status: "paid",
        note: "",
      },
    },
    { upsert: true }
  );
  await User.findByIdAndUpdate(userId, {
    role: "owner",
    ...(typeof checkoutSession.customer === "string" ? { stripeCustomerId: checkoutSession.customer } : {}),
    subscriptionStatus: "adopted",
  }).catch(() => undefined);

  return NextResponse.json({ success: true, slug: hero.slug });
}
