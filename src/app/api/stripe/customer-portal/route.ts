import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import dbConnect from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import { getSiteSession } from "@/lib/site-auth";

export const dynamic = "force-dynamic";

/**
 * Stripe Customer Portal — configure products, invoices, and cancellation in the Stripe Dashboard
 * (Settings → Customer portal). Owners need a saved `stripeCustomerId` (created at first checkout).
 */
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  const session = await getSiteSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  await dbConnect();
  const user = await User.findById(session.sub).select("stripeCustomerId").lean();
  const customerId = String(user?.stripeCustomerId || "").trim();
  if (!customerId) {
    return NextResponse.json(
      { error: "No billing profile on file. Complete an adoption checkout first." },
      { status: 400 },
    );
  }

  const siteOrigin = getPublicSiteUrl(req);
  let returnUrl = `${siteOrigin}/my-heroes`;
  try {
    const body = await req.json().catch(() => ({}));
    const u = typeof body.returnUrl === "string" ? body.returnUrl.trim() : "";
    if (u.startsWith("/") && !u.startsWith("//")) {
      returnUrl = `${siteOrigin}${u}`;
    }
  } catch {
    /* use default */
  }

  const stripe = new Stripe(secret);
  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    if (!portal.url) {
      return NextResponse.json({ error: "Could not create portal session." }, { status: 500 });
    }
    return NextResponse.json({ url: portal.url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Portal error";
    console.error("customer-portal:", e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
