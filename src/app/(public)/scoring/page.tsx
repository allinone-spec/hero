import type { Metadata } from "next";
import { USM25_MATRIX_SECTIONS } from "@/lib/usm25-matrix-sections";

export const metadata: Metadata = {
  title: "The Methodology: How We Score True Heroism — USM-25",
  description:
    "Medals N Bongs ranks documented military heroism using a 1–100 heroic catalog scale (Valor_Tier 1–4). Service and campaign medals score 0 heroic points but still display on the rack.",
  openGraph: {
    title: "Scoring Methodology — Medals N Bongs",
    description:
      "Transparent USM-25 methodology: only heroic awards score; logarithmic-style 1–100 catalog scale; U.S. and Commonwealth parity.",
  },
  keywords: [
    "USM-25",
    "scoring matrix",
    "military scoring",
    "medal points",
    "hero ranking methodology",
    "valor scoring",
    "Commonwealth gallantry",
  ],
};

export default function ScoringPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold mb-4">The Methodology: How We Score True Heroism</h1>
        <p className="text-[var(--color-text-muted)] max-w-3xl mx-auto leading-relaxed text-sm sm:text-base">
          We do not rank “how full the rack is.” The scoring engine uses{" "}
          <span className="text-[var(--color-gold)] font-semibold">Bong_Score</span> (1–100) and{" "}
          <span className="text-[var(--color-gold)] font-semibold">Valor_Tier</span> from the master client
          sheet: tiers 1–4 are heroic; tier 5+ always earns{" "}
          <span className="text-[var(--color-gold)] font-semibold">zero</span> catalog points toward the
          heroic leaderboard while medals still render on the visual ribbon rack.
        </p>
      </div>

      <div className="max-w-5xl mx-auto space-y-6">
        {USM25_MATRIX_SECTIONS.map((section) => (
          <div
            key={section.title}
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5"
          >
            <h2 className="text-lg font-semibold mb-4 text-[var(--color-gold)]">{section.title}</h2>
            <div className="divide-y divide-[var(--color-border)]">
              {section.items.map((item, idx) => (
                <div
                  key={idx}
                  className={`grid grid-cols-1 gap-x-8 gap-y-2 py-3 first:pt-0 items-start ${
                    item.points
                      ? "sm:grid-cols-[minmax(18rem,38%)_minmax(0,1fr)]"
                      : ""
                  }`}
                >
                  <span className="text-sm text-[var(--color-text)] leading-relaxed">{item.label}</span>
                  {item.points ? (
                    <span className="text-sm font-semibold text-[var(--color-gold)] sm:text-right break-words">
                      {item.points}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-3 text-[var(--color-gold)]">Catalog and engine</h2>
          <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
            Per-award <code className="text-xs">Bong_Score</code> and{" "}
            <code className="text-xs">Valor_Tier</code> come from{" "}
            <code className="text-xs">data/medal-inventory/Final_Medal_Sheet_Client.csv</code> (after
            running <code className="text-xs">npx tsx scripts/sync-medal-inventory-csv.ts</code> when you
            change rules). The scoring engine applies V-device rules for medals that require a valor device,
            sums configurable bonuses, then rounds. Recalculate heroes after importing medals or changing
            rules on <span className="text-[var(--color-text)]">/admin/scoring</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
