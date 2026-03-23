import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import dbConnect from "@/lib/mongodb";
import AdminUser from "@/lib/models/AdminUser";
import CoffeeTransaction from "@/lib/models/CoffeeTransaction";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.redirect(new URL("/admin/submit", req.url));
  }

  try {
    await dbConnect();

    // Check if already processed (idempotent)
    const existing = await CoffeeTransaction.findOne({ stripeSessionId: sessionId });
    if (existing) {
      return NextResponse.redirect(new URL("/admin/submit?coffee=purchased", req.url));
    }

    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
    if (checkoutSession.payment_status !== "paid") {
      return NextResponse.redirect(new URL("/admin/submit?coffee=failed", req.url));
    }

    const email = checkoutSession.metadata?.email;
    const coffeeAmount = parseInt(checkoutSession.metadata?.coffeeAmount || "2", 10);

    if (!email) {
      return NextResponse.redirect(new URL("/admin/submit?coffee=failed", req.url));
    }

    const user = await AdminUser.findOneAndUpdate(
      { email },
      { $inc: { coffeeBalance: coffeeAmount } },
      { new: true }
    );

    if (user) {
      await CoffeeTransaction.create({
        userId: user._id,
        amount: coffeeAmount,
        type: "purchase",
        stripeSessionId: sessionId,
      });
    }

    return NextResponse.redirect(new URL("/admin/submit?coffee=purchased", req.url));
  } catch {
    return NextResponse.redirect(new URL("/admin/submit?coffee=failed", req.url));
  }
}
