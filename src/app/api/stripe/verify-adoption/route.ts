import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import dbConnect from "@/lib/mongodb";
import Hero from "@/lib/models/Hero";
import { User } from "@/lib/models/User";
import { getSiteSession } from "@/lib/site-auth";

const stripeSecret = process.env.STRIPE_SECRET_KEY;

function adoptionExpiryDate(): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d;
}

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
  const hero = await Hero.findById(heroId).select("_id slug").lean();
  if (!hero) {
    return NextResponse.json({ error: "Hero not found" }, { status: 404 });
  }

  await Hero.findByIdAndUpdate(heroId, {
    ownerUserId: userId,
    adoptionExpiry: adoptionExpiryDate(),
  });
  await User.findByIdAndUpdate(userId, { role: "owner" }).catch(() => undefined);

  return NextResponse.json({ success: true, slug: hero.slug });
}
