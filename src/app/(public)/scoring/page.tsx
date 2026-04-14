import type { Metadata } from "next";
import { USM25_MATRIX_SECTIONS } from "@/lib/usm25-matrix-sections";

export const metadata: Metadata = {
  title: "The Methodology: How We Score True Heroism — USM-25.2",
  description:
    "USM-25.2 (matrix 25-2): documented heroism on a 1–100 heroic catalog scale (Valor_Tier 1–4). Purple Heart and service/campaign medals score 0 heroic points but still display on the rack.",
  openGraph: {
    title: "Scoring Methodology — Medals N Bongs (USM-25.2)",
    description:
      "USM-25.2: heroic awards only on the leaderboard; Purple Heart is rack-only for heroic totals; logarithmic-style catalog scale; U.S. and Commonwealth parity.",
  },
  keywords: [
    "USM-25",
    "USM-25.2",
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
        <h1 className="text-3xl font-bold mb-2">The Methodology: How We Score True Heroism</h1>
        <p className="text-xs sm:text-sm text-[var(--color-gold)] font-semibold mb-4">USM-25.2 (matrix 25-2)</p>
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
      </div>
    </div>
  );
}
