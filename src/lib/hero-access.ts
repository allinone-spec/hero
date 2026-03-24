import { isAdoptionActive } from "@/lib/adoption";
import type { SiteSession } from "@/lib/site-auth";

export type HeroOwnerCheck = {
  ownerUserId?: unknown;
  adoptionExpiry?: Date | string | null;
};

/** Throws if the site user is not the active adoptive owner of this hero. */
export function assertHeroOwnerAccess(hero: HeroOwnerCheck, session: SiteSession): void {
  const ownerId = hero.ownerUserId != null ? String(hero.ownerUserId) : "";
  if (!ownerId || ownerId !== session.sub || !isAdoptionActive(hero.adoptionExpiry)) {
    throw new Error("Forbidden");
  }
}
