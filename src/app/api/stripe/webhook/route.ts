import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import dbConnect from "@/lib/mongodb";
import Hero from "@/lib/models/Hero";
import AdoptionTransaction from "@/lib/models/AdoptionTransaction";
import { User } from "@/lib/models/User";
import { isAdoptionActive, nextAdoptionExpiry } from "@/lib/adoption";

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
    const heroId = session.metadata?.heroId;
    const userId = session.metadata?.userId;
    if (heroId && userId) {
      await dbConnect();
      const hero = await Hero.findById(heroId).select("ownerUserId adoptionExpiry published");
      if (hero?.published) {
        const currentOwnerId = hero.ownerUserId?.toString();
        const activeElsewhere =
          isAdoptionActive(hero.adoptionExpiry) && currentOwnerId && currentOwnerId !== String(userId);

        await AdoptionTransaction.updateOne(
          { stripeSessionId: session.id },
          {
            $set: {
              stripePaymentIntentId:
                typeof session.payment_intent === "string" ? session.payment_intent : "",
              stripeCustomerId: typeof session.customer === "string" ? session.customer : "",
              userId,
              heroId,
              amountCents: session.amount_total ?? 0,
              currency: session.currency ?? "usd",
              status: activeElsewhere ? "blocked" : "paid",
              note: activeElsewhere ? "Active adoption already owned by another user" : "",
            },
          },
          { upsert: true }
        );

        if (!activeElsewhere) {
          hero.ownerUserId = userId as never;
          hero.adoptionExpiry = nextAdoptionExpiry(hero.adoptionExpiry) as never;
          await hero.save();
          await User.findByIdAndUpdate(userId, {
            role: "owner",
            ...(typeof session.customer === "string" ? { stripeCustomerId: session.customer } : {}),
            subscriptionStatus: "adopted",
          }).catch(() => undefined);
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
