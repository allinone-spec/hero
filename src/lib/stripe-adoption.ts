import dbConnect from "@/lib/mongodb";
import Hero from "@/lib/models/Hero";
import AdoptionTransaction from "@/lib/models/AdoptionTransaction";
import ProcessedStripeInvoice from "@/lib/models/ProcessedStripeInvoice";
import { User } from "@/lib/models/User";
import { isAdoptionActive, nextAdoptionExpiry } from "@/lib/adoption";

export type AdoptionCheckoutContext = {
  heroId: string;
  userId: string;
  stripeSessionId: string;
  stripePaymentIntentId?: string;
  stripeCustomerId?: string;
  amountCents: number;
  currency: string;
};

/**
 * Idempotent: upserts AdoptionTransaction and applies hero + user updates when payment is valid.
 * Used by Stripe webhook and verify-adoption fallback.
 */
export async function applyAdoptionAfterCheckoutPayment(
  ctx: AdoptionCheckoutContext,
): Promise<
  | { ok: true; slug: string }
  | { ok: false; code: "not_found" | "unpublished" | "blocked" | "conflict"; message: string }
> {
  await dbConnect();
  const hero = await Hero.findById(ctx.heroId).select("_id slug ownerUserId adoptionExpiry published");
  if (!hero) {
    return { ok: false, code: "not_found", message: "Hero not found" };
  }
  if (!hero.published) {
    return { ok: false, code: "unpublished", message: "Hero is not available for adoption" };
  }

  const currentOwnerId = hero.ownerUserId?.toString();
  const activeElsewhere =
    isAdoptionActive(hero.adoptionExpiry) && currentOwnerId && currentOwnerId !== String(ctx.userId);

  await AdoptionTransaction.updateOne(
    { stripeSessionId: ctx.stripeSessionId },
    {
      $set: {
        stripePaymentIntentId: ctx.stripePaymentIntentId || "",
        stripeCustomerId: ctx.stripeCustomerId || "",
        userId: ctx.userId,
        heroId: ctx.heroId,
        amountCents: ctx.amountCents,
        currency: ctx.currency,
        status: activeElsewhere ? "blocked" : "paid",
        note: activeElsewhere ? "Active adoption already owned by another user" : "",
      },
    },
    { upsert: true },
  );

  if (activeElsewhere) {
    return { ok: false, code: "conflict", message: "Hero already has an active supporter." };
  }

  await Hero.findByIdAndUpdate(ctx.heroId, {
    ownerUserId: ctx.userId,
    adoptionExpiry: nextAdoptionExpiry(hero.adoptionExpiry),
  });

  await User.findByIdAndUpdate(ctx.userId, {
    role: "owner",
    ...(ctx.stripeCustomerId ? { stripeCustomerId: ctx.stripeCustomerId } : {}),
    subscriptionStatus: "adopted",
  }).catch(() => undefined);

  return { ok: true, slug: hero.slug };
}

/**
 * Yearly subscription renewals (invoice.paid): extend adoption for the same owner.
 * Does not write AdoptionTransaction (checkout session is one-time); safe to call repeatedly per invoice id if you add dedup later.
 */
function isMongoDuplicateKey(err: unknown): boolean {
  return Boolean(err && typeof err === "object" && "code" in err && (err as { code: number }).code === 11000);
}

export async function extendAdoptionFromSubscriptionInvoice(opts: {
  heroId: string;
  userId: string;
  stripeCustomerId?: string;
  /** When set, processing is idempotent per Stripe invoice (webhook retries). */
  stripeInvoiceId?: string;
}): Promise<{ ok: true } | { ok: false; code: "not_found" | "blocked"; message: string }> {
  await dbConnect();
  if (opts.stripeInvoiceId) {
    try {
      await ProcessedStripeInvoice.create({ stripeInvoiceId: opts.stripeInvoiceId });
    } catch (e) {
      if (isMongoDuplicateKey(e)) {
        return { ok: true };
      }
      throw e;
    }
  }

  const hero = await Hero.findById(opts.heroId).select("_id ownerUserId adoptionExpiry published");
  if (!hero) {
    if (opts.stripeInvoiceId) {
      await ProcessedStripeInvoice.deleteOne({ stripeInvoiceId: opts.stripeInvoiceId }).catch(() => undefined);
    }
    return { ok: false, code: "not_found", message: "Hero not found" };
  }
  if (!hero.published) {
    if (opts.stripeInvoiceId) {
      await ProcessedStripeInvoice.deleteOne({ stripeInvoiceId: opts.stripeInvoiceId }).catch(() => undefined);
    }
    return { ok: false, code: "blocked", message: "Hero not published" };
  }
  const current = hero.ownerUserId?.toString();
  const activeOther =
    isAdoptionActive(hero.adoptionExpiry) && current && current !== String(opts.userId);
  if (activeOther) {
    if (opts.stripeInvoiceId) {
      await ProcessedStripeInvoice.deleteOne({ stripeInvoiceId: opts.stripeInvoiceId }).catch(() => undefined);
    }
    return { ok: false, code: "blocked", message: "Hero has a different active supporter" };
  }

  await Hero.findByIdAndUpdate(opts.heroId, {
    ownerUserId: opts.userId,
    adoptionExpiry: nextAdoptionExpiry(hero.adoptionExpiry),
  });
  await User.findByIdAndUpdate(opts.userId, {
    role: "owner",
    ...(opts.stripeCustomerId ? { stripeCustomerId: opts.stripeCustomerId } : {}),
    subscriptionStatus: "adopted",
  }).catch(() => undefined);

  return { ok: true };
}
