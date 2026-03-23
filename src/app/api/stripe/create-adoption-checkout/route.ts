import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import dbConnect from "@/lib/mongodb";
import Hero from "@/lib/models/Hero";
import { getSiteSession } from "@/lib/site-auth";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const priceCents = parseInt(process.env.STRIPE_ADOPTION_PRICE_CENTS || "999", 10);

/** Stripe requires absolute URLs with an explicit https:// or http:// scheme. */
function normalizeEnvOrigin(raw: string | undefined): string | null {
  const s = raw?.trim().replace(/\/$/, "");
  if (!s) return null;
  let withScheme = s;
  if (!/^https?:\/\//i.test(s)) {
    const host = s.split("/")[0].toLowerCase();
    withScheme =
      host.startsWith("localhost") || host.startsWith("127.0.0.1") ? `http://${s}` : `https://${s}`;
  }
  try {
    return new URL(withScheme).origin;
  } catch {
    return null;
  }
}

/**
 * Return URLs for Stripe must match the site the user is on.
 * Prefer the request origin so local dev (localhost) is not overridden by
 * NEXT_PUBLIC_* env vars that often point at production.
 */
function appOrigin(req: NextRequest): string {
  const fromRequest = req.nextUrl?.origin;
  if (fromRequest && /^https?:\/\//i.test(fromRequest)) {
    return fromRequest;
  }
  return (
    normalizeEnvOrigin(process.env.NEXT_PUBLIC_APP_URL) ||
    normalizeEnvOrigin(process.env.NEXT_PUBLIC_BASE_URL) ||
    "http://localhost:3000"
  );
}

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
  const hero = await Hero.findById(heroId).select("name slug published").lean();
  if (!hero) {
    return NextResponse.json({ error: "Hero not found" }, { status: 404 });
  }
  if (!hero.published) {
    return NextResponse.json({ error: "Hero is not available for adoption" }, { status: 400 });
  }

  const stripe = new Stripe(stripeSecret);
  const origin = appOrigin(req);

  let checkout: Stripe.Checkout.Session;
  try {
    checkout = await stripe.checkout.sessions.create({
      mode: "payment",
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
      success_url: `${origin}/heroes/${hero.slug}?adopted=1`,
      cancel_url: `${origin}/heroes/${hero.slug}?adopted=0`,
      metadata: {
        heroId: hero._id.toString(),
        userId: session.sub,
        userEmail: session.email,
      },
      client_reference_id: session.sub,
    });
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
