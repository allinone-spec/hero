import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import dbConnect from "@/lib/mongodb";
import AdminUser from "@/lib/models/AdminUser";
import CoffeeTransaction from "@/lib/models/CoffeeTransaction";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.payment_status !== "paid") {
      return NextResponse.json({ received: true });
    }

    const email = session.metadata?.email;
    const coffeeAmount = parseInt(session.metadata?.coffeeAmount || "2", 10);

    if (!email) {
      return NextResponse.json({ received: true });
    }

    try {
      await dbConnect();

      // Idempotent: skip if already processed
      const existing = await CoffeeTransaction.findOne({ stripeSessionId: session.id });
      if (existing) {
        return NextResponse.json({ received: true });
      }

      const user = await AdminUser.findOneAndUpdate(
        { email },
        { $inc: { coffeeBalance: coffeeAmount } },
        { returnDocument: "after" }
      );

      if (user) {
        await CoffeeTransaction.create({
          userId: user._id,
          amount: coffeeAmount,
          type: "purchase",
          stripeSessionId: session.id,
        });
      }
    } catch (err) {
      console.error("Webhook processing error:", err);
    }
  }

  return NextResponse.json({ received: true });
}
