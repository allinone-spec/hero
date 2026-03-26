import { NextResponse } from "next/server";
import Stripe from "stripe";
import { requirePrivilege } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { getMarketplaceAdminStats } from "@/lib/marketplace-admin-stats";
import { syncUserStripeFieldsFromSubscriptions } from "@/lib/stripe-subscription-sync";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET() {
  try {
    await requirePrivilege("/admin/marketplace", "canView");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });
  }

  try {
    const stats = await getMarketplaceAdminStats();
    const yearlyConfigured = Boolean(process.env.STRIPE_ADOPTION_YEARLY_PRICE_ID?.trim());
    return NextResponse.json({ stats, yearlyConfigured }, { headers: noStore });
  } catch (e) {
    console.error("marketplace GET:", e);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500, headers: noStore });
  }
}

/**
 * Reconcile Stripe subscription status for all Owner accounts with a Stripe customer id.
 * Safe to run periodically or after webhook outages.
 */
export async function POST(req: Request) {
  try {
    await requirePrivilege("/admin/marketplace", "canEdit");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503, headers: noStore });
  }

  let body: { limit?: number };
  try {
    body = await req.json().catch(() => ({}));
  } catch {
    body = {};
  }
  const limit = Math.min(500, Math.max(1, Number(body.limit) || 200));

  await dbConnect();
  const owners = await User.find({
    role: "owner",
    stripeCustomerId: { $exists: true, $nin: ["", null] },
  })
    .select("_id stripeCustomerId")
    .limit(limit)
    .lean();

  const stripe = new Stripe(secret);
  let synced = 0;
  const errors: string[] = [];

  for (const o of owners) {
    const cid = String(o.stripeCustomerId || "").trim();
    if (!cid) continue;
    const r = await syncUserStripeFieldsFromSubscriptions(stripe, String(o._id), cid);
    if (r.ok) {
      synced += 1;
    } else {
      errors.push(`${o._id}: ${r.message}`);
    }
  }

  return NextResponse.json(
    { ok: true, processed: owners.length, synced, errors: errors.slice(0, 20) },
    { headers: noStore },
  );
}
