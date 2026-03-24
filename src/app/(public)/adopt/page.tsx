import { Suspense } from "react";
import type { Metadata } from "next";
import dbConnect from "@/lib/mongodb";
import HeroListClient from "../HeroListClient";
import { getPublishedHeroesForPublicList } from "@/lib/public-heroes";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Adopt a Hero",
  description:
    "Browse published hero profiles that are available for adoption, filter by country, branch, war, and specialty, and support a hero profile as its named supporter.",
};

function Stat({
  value,
  label,
}: {
  value: string | number;
  label: string;
}) {
  return (
    <div className="hero-card p-4 text-center">
      <div className="text-2xl font-bold text-[var(--color-gold)]">{value}</div>
      <div className="mt-1 text-xs text-[var(--color-text-muted)]">{label}</div>
    </div>
  );
}

export default async function AdoptPage() {
  await dbConnect();
  const heroes = await getPublishedHeroesForPublicList();
  const availableCount = heroes.filter((h) => h.availableForAdoption).length;
  const supportedCount = heroes.length - availableCount;
  const countryCount = new Set(heroes.map((h) => (h.countryCode || "US").toUpperCase())).size;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <section className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Adopt a Hero</h1>
          <p className="max-w-3xl text-sm text-[var(--color-text-muted)]">
            Browse published profiles and find heroes that are currently available for adoption. Adopting a hero makes
            you the named supporter for the profile and unlocks tribute editing on your Owner account.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat value={availableCount} label="Available now" />
          <Stat value={supportedCount} label="Already supported" />
          <Stat value={heroes.length} label="Published heroes" />
          <Stat value={countryCount} label="Countries covered" />
        </div>
      </section>

      <section>
        <div className="flex items-center gap-4 mb-5">
          <div>
            <h2 className="text-xl font-bold leading-none">Marketplace</h2>
            <p className="text-xs mt-0.5 text-[var(--color-text-muted)]">
              Default view shows heroes available for adoption. Switch availability filters below to browse everything.
            </p>
          </div>
          <div className="flex-1 h-px bg-[var(--color-border)]" />
        </div>
        <Suspense>
          <HeroListClient
            heroes={heroes}
            profileFrom="adopt"
            marketplaceMode
            initialAvailability="available"
          />
        </Suspense>
      </section>
    </div>
  );
}
