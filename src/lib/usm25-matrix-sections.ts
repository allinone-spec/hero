/**
 * Public/admin copy for the USM-25 matrix — aligned with `scoring-engine.ts` and
 * `docs/master-scoring-logic.md` (Section 1 master; foreign tiered model; defaults from ScoringConfig).
 */
export const USM25_MATRIX_SECTIONS = [
  {
    title: "1. Base Medal Values",
    items: [
      {
        label:
          "Medal of Honor, Victoria Cross, George Cross (and coded Indian level-1 gallantry)",
        points: "100 pts per instance",
      },
      {
        label:
          "Level 2 — Service Crosses (DSC, Navy Cross, Air Force Cross), DFC, MC, DSO, CGC, etc.",
        points: "75 pts per instance",
      },
      {
        label: "Level 3 — Silver Star, Military Medal, DSM, Vir Chakra, etc.",
        points: "50 pts per instance (Silver Star always 50)",
      },
      {
        label:
          "Level 4 — Bronze Star / Commendation Medal (with V or gallantry), MiD, QGM, etc.",
        points: "25 pts per instance when valor applies",
      },
      { label: "Legion of Merit", points: "24 pts" },
      {
        label: "Purple Heart & wound stripes",
        points: "0 pts first instance; +5 per additional (wound bonus)",
      },
      {
        label:
          "Foreign gallantry & national orders (not flat 100 for every #1)",
        points:
          "Tiered bases (~70 typical top tier); +15 when gallantry-flagged; 100 cap on foreign patterns; Virtuti Militari 90 base; Légion Grand-Croix 70; gold/silver/bronze or 1st/2nd/3rd class → 100% / 66% / 33% of pattern base",
      },
      {
        label: "Other medals",
        points: "Catalog basePoints when no engine pattern matches",
      },
    ],
  },
  {
    title: "2. Bonuses and Multipliers",
    items: [
      { label: "Multiple awards", points: "Full value × count per instance" },
      { label: "Valor devices (config)", points: "+2 pts per V device (default)" },
      { label: "Combat theater", points: "+5 pts per distinct war/theater (default)" },
      {
        label: "Combat leadership",
        points: "+10 pts for unit-level command in combat (default)",
      },
      {
        label: "Survival / POW heroism",
        points: "+15 pts when POW heroism flag applies (default)",
      },
      {
        label: "Wounds bonus",
        points: "+5 pts per additional Purple Heart / wound stripe after the first (default)",
      },
    ],
  },
  {
    title: "3. Combat Achievement Modifier (defaults)",
    items: [
      {
        label: "Aviation — ace threshold",
        points:
          "+25 at 5 confirmed kills, then +2 per kill beyond 5 (defaults; defining-missions multiplier not applied to aviation ace line)",
      },
      {
        label: "Submarine — ship sink threshold",
        points:
          "+25 for first 3 ships sunk, +5 per ship beyond 3 when in command; extreme-risk missions ×25 pts each (defaults)",
      },
      {
        label: "Surface / generic — major engagements",
        points: "+5 pts per engagement (default)",
      },
      {
        label: "Surface / generic — defining missions & conspicuous bravery",
        points: "+10 pts per mission (default)",
      },
    ],
  },
  {
    title: "4. Cumulative Recognition",
    items: [
      {
        label: "Multi-service or multi-war",
        points: "+5% of subtotal before rounding (default)",
      },
    ],
  },
  {
    title: "5. Ranking Rules",
    items: [
      { label: "Totals", points: "Rounded to nearest 5 pts (default)" },
      { label: "Tie-breaker 1", points: "Highest single award" },
      { label: "Tie-breaker 2", points: "Total combat tours" },
      { label: "Tie-breaker 3", points: "Wounds sustained" },
    ],
  },
] as const;
