import type Stripe from "stripe";
import dbConnect from "@/lib/mongodb";
import { User } from "@/lib/models/User";

/**
 * Pick the subscription row to store on the Owner user (one field on User; customer may have several heroes).
 */
export function pickPrimarySubscription(
  subs: Stripe.Subscription[],
  userId: string,
): Stripe.Subscription | null {
  const uid = String(userId);
  const forUser = subs.filter((s) => String(s.metadata?.userId || "") === uid);
  const pool = forUser.length > 0 ? forUser : subs;
  const active = pool.find((s) => s.status === "active" || s.status === "trialing");
  if (active) return active;
  if (pool.length > 0) return pool.sort((a, b) => b.created - a.created)[0] ?? null;
  return null;
}

export async function syncUserStripeFieldsFromSubscriptions(
  stripe: Stripe,
  userId: string,
  stripeCustomerId: string,
): Promise<{ ok: true; subscriptionId: string | null; subscriptionStatus: string | null } | { ok: false; message: string }> {
  await dbConnect();
  const cid = stripeCustomerId.trim();
  if (!cid) {
    return { ok: false, message: "Missing Stripe customer id" };
  }

  let subs: Stripe.Subscription[] = [];
  try {
    const page = await stripe.subscriptions.list({ customer: cid, status: "all", limit: 100 });
    subs = page.data;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Stripe list failed";
    return { ok: false, message };
  }

  const primary = pickPrimarySubscription(subs, userId);
  const $set: Record<string, string> = {
    subscriptionStatus: primary ? primary.status : "adopted",
  };
  if (primary) {
    $set.stripeSubscriptionId = primary.id;
  }
  const update = primary
    ? { $set }
    : { $set, $unset: { stripeSubscriptionId: 1 as const } };
  await User.findByIdAndUpdate(userId, update).catch(() => undefined);

  return {
    ok: true,
    subscriptionId: primary?.id ?? null,
    subscriptionStatus: primary?.status ?? null,
  };
}
