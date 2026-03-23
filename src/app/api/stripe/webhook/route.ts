import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import dbConnect from "@/lib/mongodb";
import Hero from "@/lib/models/Hero";
import { User } from "@/lib/models/User";

export const dynamic = "force-dynamic";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

function adoptionExpiryDate(): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d;
}

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
    const heroId = session.metadata?.heroId;
    const userId = session.metadata?.userId;
    if (heroId && userId) {
      await dbConnect();
      await Hero.findByIdAndUpdate(heroId, {
        ownerUserId: userId,
        adoptionExpiry: adoptionExpiryDate(),
      });
      await User.findByIdAndUpdate(userId, { role: "owner" }).catch(() => undefined);
    }
  }

  return NextResponse.json({ received: true });
}
