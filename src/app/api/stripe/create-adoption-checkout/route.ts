import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import dbConnect from "@/lib/mongodb";
import Hero from "@/lib/models/Hero";
import { User } from "@/lib/models/User";
import { isAdoptionActive } from "@/lib/adoption";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import { getSiteSession } from "@/lib/site-auth";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const priceCents = parseInt(process.env.STRIPE_ADOPTION_PRICE_CENTS || "999", 10);
/** When set, Checkout uses subscription mode (yearly renewal via invoice.paid subscription_cycle). */
const yearlyPriceId = process.env.STRIPE_ADOPTION_YEARLY_PRICE_ID?.trim() || "";

export async function POST(req: NextRequest) {
  if (!stripeSecret) {
    return NextResponse.json(
      { error: "Stripe is not configured (STRIPE_SECRET_KEY)." },
      { status: 503 },
    );
  }

  const session = await getSiteSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to adopt a hero." }, { status: 401 });
  }

  let body: { heroId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const heroId = body.heroId?.trim();
  if (!heroId) {
    return NextResponse.json({ error: "heroId required" }, { status: 400 });
  }

  await dbConnect();
  const dbUser = await User.findById(session.sub).select("emailVerified stripeCustomerId email").lean();
  if (dbUser && dbUser.emailVerified === false) {
    return NextResponse.json(
      {
        error:
          "Verify your email before adopting. Check your inbox for the verification link, or request a new one from the login page.",
      },
      { status: 403 },
    );
  }

  const hero = await Hero.findById(heroId).select("name slug published ownerUserId adoptionExpiry").lean();
  if (!hero) {
    return NextResponse.json({ error: "Hero not found" }, { status: 404 });
  }
  if (!hero.published) {
    return NextResponse.json({ error: "Hero is not available for adoption" }, { status: 400 });
  }
  const activeOwnerId = hero.ownerUserId?.toString();
  const active = isAdoptionActive(hero.adoptionExpiry);
  if (active && activeOwnerId && activeOwnerId !== session.sub) {
    return NextResponse.json({ error: "Hero already has an active supporter." }, { status: 409 });
  }

  const stripe = new Stripe(stripeSecret);
  const origin = getPublicSiteUrl(req);

  let stripeCustomerId = dbUser?.stripeCustomerId?.trim() || "";
  if (!stripeCustomerId) {
    const cust = await stripe.customers.create({
      email: session.email || dbUser?.email || undefined,
      metadata: { userId: session.sub },
    });
    stripeCustomerId = cust.id;
    await User.findByIdAndUpdate(session.sub, { stripeCustomerId }).catch(() => undefined);
  }

  const meta = {
    heroId: hero._id.toString(),
    userId: session.sub,
    userEmail: session.email || "",
  };

  let checkout: Stripe.Checkout.Session;
  try {
    if (yearlyPriceId) {
      checkout = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: stripeCustomerId,
        line_items: [{ price: yearlyPriceId, quantity: 1 }],
        success_url: `${origin}/heroes/${hero.slug}?adopted=1&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/heroes/${hero.slug}?adopted=0`,
        metadata: meta,
        subscription_data: {
          metadata: { heroId: meta.heroId, userId: meta.userId },
        },
        client_reference_id: session.sub,
        ...(session.email ? { customer_update: { name: "auto" as const } } : {}),
      });
    } else {
      checkout = await stripe.checkout.sessions.create({
        mode: "payment",
        customer: stripeCustomerId,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `Hero adoption: ${hero.name}`,
                description: "Supporter adoption — tribute editing for one year (where enabled).",
              },
              unit_amount: Number.isFinite(priceCents) && priceCents > 0 ? priceCents : 999,
            },
            quantity: 1,
          },
        ],
        success_url: `${origin}/heroes/${hero.slug}?adopted=1&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/heroes/${hero.slug}?adopted=0`,
        metadata: meta,
        client_reference_id: session.sub,
        ...(session.email
          ? {
              payment_intent_data: {
                receipt_email: session.email,
              },
            }
          : {}),
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    console.error("create-adoption-checkout:", err);
    return NextResponse.json({ error: message }, { status: 502 });
  }

  if (!checkout.url) {
    return NextResponse.json({ error: "Could not create checkout session" }, { status: 500 });
  }

  return NextResponse.json({ url: checkout.url });
}
