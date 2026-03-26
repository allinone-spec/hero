import Link from "next/link";
import type { Metadata } from "next";
import ExploreNavigator from "@/components/explore/ExploreNavigator";
import { EXPLORE_CURATED_PRESETS, curatedPresetHref } from "@/lib/explore-curated-lists";

export const metadata: Metadata = {
  title: "Explore by country & specialty",
  description: "Drill down by country, U.S. service branch, and metadata tags to find decorated heroes.",
};

export default function ExplorePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-10">
      <div>
        <Link
          href="/"
          className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-gold)] inline-flex items-center gap-1 mb-4"
        >
          &lt; Back to home
        </Link>
        <h1 className="text-3xl font-bold mb-2">Explore heroes</h1>
        <p className="text-sm max-w-2xl leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
          Ribbon racks are built by the rule-based precedence engine from each hero&apos;s normalized medal list (not
          AI layout). Lists below use <strong>metadata tags</strong> and branch filters — caretakers can fix tags in
          admin when the AI clerk misses one. Use <strong>Back</strong> in the wizard to change a step without the
          browser back button.
        </p>
      </div>

      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-5 space-y-4">
        <h2 className="text-lg font-bold text-[var(--color-text)]">Spotlight lists (U.S.)</h2>
        <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
          Each shortcut runs a query like: published heroes matching country / branch / tag, ordered by score (or by
          optional comparison index where noted).
        </p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {EXPLORE_CURATED_PRESETS.map((p) => {
            const href = p.kind === "explore" ? curatedPresetHref(p) : p.href;
            return (
              <li key={p.id}>
                <Link
                  href={href}
                  className="block rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm transition-colors hover:border-[var(--color-gold)]/45 hover:bg-[var(--color-gold)]/5"
                >
                  <span className="font-semibold text-[var(--color-text)] block">{p.title}</span>
                  <span className="text-xs text-[var(--color-text-muted)] mt-0.5 block leading-snug">{p.blurb}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-[var(--color-text)]">Custom drill-down</h2>
        <ExploreNavigator />
      </section>
    </div>
  );
}
