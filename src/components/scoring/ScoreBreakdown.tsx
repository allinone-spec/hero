"use client";

import { ScoreBreakdownItem } from "@/types";

interface ScoreBreakdownProps {
  breakdown: ScoreBreakdownItem[];
  total: number;
}

export default function ScoreBreakdown({ breakdown, total }: ScoreBreakdownProps) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
      <h3 className="text-lg font-semibold mb-4 text-[var(--color-gold)]">
        Score Breakdown
      </h3>

      <div className="space-y-2">
        {breakdown.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between py-1.5 border-b border-[var(--color-border)] last:border-0"
          >
            <div>
              <span className="text-sm font-medium">{item.label}</span>
              {item.detail && (
                <span className="text-xs text-[var(--color-text-muted)] ml-2">
                  ({item.detail})
                </span>
              )}
            </div>
            <span
              className={`text-sm font-semibold ${item.points > 0 ? "text-[var(--color-gold)]" : "text-[var(--color-text-muted)]"}`}
            >
              {item.points > 0 ? `+${item.points}` : "0"}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t-2 border-[var(--color-gold)]/30 flex items-center justify-between">
        <span className="font-bold text-lg">Total (rounded to nearest 5)</span>
        <span className="score-badge text-lg">{total} pts</span>
      </div>
    </div>
  );
}
