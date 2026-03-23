const SECTIONS = [
  {
    title: "1. Base Medal Values",
    items: [
      { label: "Medal of Honor", points: "100 pts" },
      { label: "Service Cross (DSC, Navy Cross, Air Force Cross, Coast Guard Cross)", points: "60 pts" },
      { label: "Silver Star", points: "35 pts" },
      { label: "Distinguished Flying Cross (with \"V\" device)", points: "25 pts" },
      { label: "Soldier's / Navy / Airman's / Coast Guard Medal", points: "20 pts" },
      { label: "Bronze Star (with \"V\" device)", points: "15 pts" },
      { label: "Air Medal (with \"V\" device)", points: "10 pts" },
      { label: "Purple Heart", points: "8 pts" },
      { label: "Commendation Medal (with \"V\" device)", points: "5 pts" },
      { label: "Achievement Medal (with \"V\" device)", points: "2 pts" },
      { label: "Foreign Gallantry Awards — Croix de Guerre, RVN Gallantry Cross, etc.", points: "20 pts" },
      { label: "Foreign Service/Campaign Awards — NATO, UN, Kuwait Liberation, etc.", points: "0 pts (display only)" },
    ],
  },
  {
    title: "2. Bonuses and Multipliers",
    items: [
      { label: "Multiple Awards", points: "Full point value × count" },
      { label: "Valor Clusters", points: "+2 pts per V device" },
      { label: "Combat Theater Bonus", points: "+5 pts per distinct war/theater" },
      { label: "Combat Leadership Bonus", points: "+10 pts for unit-level command in combat" },
      {
        label: "Survival / POW Heroism Bonus",
        points: "+15 pts for extended captivity, escape, or leadership under torture",
      },
      { label: "Wounds Bonus", points: "+2 pts per additional Purple Heart beyond the first" },
    ],
  },
  {
    title: "3. Combat Achievement Modifier",
    items: [
      { label: "Aviation — kills beyond 5", points: "+5 pts per confirmed kill" },
      { label: "Aviation — defining missions", points: "+10 pts per mission" },
      { label: "Submarine — ships sunk beyond 5", points: "+5 pts per ship" },
      { label: "Submarine — extreme risk missions", points: "+10 pts per mission" },
      { label: "Surface/Naval — major engagements", points: "+5 pts per engagement" },
      { label: "Surface/Naval — conspicuous bravery", points: "+10 pts" },
    ],
  },
  {
    title: "4. Cumulative Recognition",
    items: [
      { label: "Multi-service or multi-war service", points: "+5% bonus to total" },
    ],
  },
  {
    title: "5. Ranking Rules",
    items: [
      { label: "All totals rounded to nearest 5 pts", points: "" },
      { label: "Tie-breaker 1: Highest single award", points: "" },
      { label: "Tie-breaker 2: Total combat tours", points: "" },
      { label: "Tie-breaker 3: Wounds sustained", points: "" },
    ],
  },
];

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

      <div className="max-w-3xl mx-auto space-y-6">
        {SECTIONS.map((section) => (
          <div
            key={section.title}
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5"
          >
            <h2 className="text-lg font-semibold mb-4 text-[var(--color-gold)]">
              {section.title}
            </h2>
            <div className="space-y-2">
              {section.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-1.5 border-b border-[var(--color-border)] last:border-0"
                >
                  <span className="text-sm">{item.label}</span>
                  {item.points && (
                    <span className="text-sm font-semibold text-[var(--color-gold)] shrink-0 ml-4">
                      {item.points}
                    </span>
                  )}
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
