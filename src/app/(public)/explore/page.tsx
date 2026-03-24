import Link from "next/link";
import type { Metadata } from "next";
import ExploreNavigator from "@/components/explore/ExploreNavigator";

export const metadata: Metadata = {
  title: "Explore by country & specialty",
  description: "Drill down by country, U.S. service branch, and metadata tags to find decorated heroes.",
};

export default function ExplorePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      <div>
        <Link
          href="/"
          className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-gold)] inline-flex items-center gap-1 mb-4"
        >
          &lt; Back to Heroes
        </Link>
        <h1 className="text-3xl font-bold mb-2">Explore heroes</h1>
        <p className="text-sm max-w-lg" style={{ color: "var(--color-text-muted)" }}>
          Choose a country, then service (U.S. only), then a specialty tag. Use <strong>Back</strong> to change a
          prior step without using the browser back button.
        </p>
      </div>
      <ExploreNavigator />
    </div>
  );
}
