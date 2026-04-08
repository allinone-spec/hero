import { USM25_MATRIX_SECTIONS } from "@/lib/usm25-matrix-sections";

export default function AdminUSM25Page() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Unified Scoring Matrix — USM-25
        </h1>
        <p className="text-[var(--color-text-muted)]">
          The complete scoring methodology used to rank decorated military heroes
        </p>
      </div>

      <div className="max-w-5xl mx-auto space-y-6">
        {USM25_MATRIX_SECTIONS.map((section) => (
          <div
            key={section.title}
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5"
          >
            <h2 className="text-lg font-semibold mb-4 text-[var(--color-gold)]">
              {section.title}
            </h2>
            <div className="divide-y divide-[var(--color-border)]">
              {section.items.map((item, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 gap-x-8 gap-y-2 py-3 first:pt-0 items-start sm:grid-cols-[minmax(18rem,38%)_minmax(0,1fr)]"
                >
                  <span className="text-sm text-[var(--color-text)]">{item.label}</span>
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
          <h2 className="text-lg font-semibold mb-3 text-[var(--color-gold)]">
            About This Matrix
          </h2>
          <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
            The Unified Scoring Matrix (USM-25) is a standardized framework
            designed to objectively assess and rank military heroes based on their
            documented awards, combat service, and recognized achievements. The
            matrix was developed to provide a transparent, academically defensible
            methodology for comparing decorated service members across different
            eras, branches, and conflicts. All scores are computed automatically
            from verified award records.
          </p>
        </div>
      </div>
    </div>
  );
}
