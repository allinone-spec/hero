/**
 * Public copy for the USM-25 heroic matrix (1–100 catalog scale, Valor_Tier 1–4).
 * Matrix revision **25-2** (USM-25.2): Purple Heart is rack-only for heroic totals — see tier list.
 * Aligns with `medal-inventory-scoring.ts`, client CSV `Bong_Score` / `Valor_Tier`, and `scoring-engine.ts`.
 */
export type Usm25MatrixItem = { label: string; points?: string };
export type Usm25MatrixSection = { title: string; items: Usm25MatrixItem[] };

export const USM25_MATRIX_SECTIONS: Usm25MatrixSection[] = [
  {
    title: "USM-25.2 (matrix 25-2)",
    items: [
      {
        label:
          "This revision updates the catalog so the U.S. Purple Heart does not add heroic leaderboard points. It remains on the ribbon rack as the nation’s wounded-in-action recognition, but stacking multiple PHs must not mathematically outrank apex gallantry awards such as the Victoria Cross or Medal of Honor. Earlier matrix notes (25-1) treated PH as a scored baseline-valor item (~25 catalog points).",
      },
    ],
  },
  {
    title: "Design rationale: how the logarithmic matrix was reasoned out",
    items: [
      {
        label:
          "We started from a simple observation: military archives mix incomparable signals — long U.S. ribbon stacks beside lean Commonwealth gallantry rows, multiple wound awards beside single apex citations, and campaign “attendance” ribbons beside one deliberate act of courage. Any leaderboard that treats those signals as interchangeable counts will lie quietly but confidently about who did what. So the first design decision was subtraction: strip everything that is not documented individual heroism from the competitive score, keep it on the rack for context, and only then ask how remaining heroic items should combine.",
      },
      {
        label:
          "The second decision was to reject naive linear addition for valor. A linear system rewards volume: several mid-tier citations can mathematically eclipse a Victoria Cross or Medal of Honor, which contradicts how institutions and history actually weight apex gallantry. We therefore modeled heroism on a steep curve — small increments at the baseline valor band, much larger increments as citations approach national/strategic significance, and a capped 1–100 catalog scale so the UI stays legible while preserving the ratios implied by the older, wider point experiments.",
      },
      {
        label:
          "The third decision was cross-national parity without pretending nations issue medals the same way. Commonwealth forces often consolidate recognition into bars and clasps; U.S. practice often enumerates distinct devices and ribbons. The logarithmic matrix is paired with explicit tier rules (Valor_Tier 1–4) so one high-tier Commonwealth award is not drowned by U.S. citation volume, while still allowing sustained, documented valor in lower tiers to accumulate meaningfully. Purple Heart is treated as wounded-in-action recognition (not gallantry) under USM-25.2 — rack-visible, leaderboard-neutral — so wound counts cannot outrank apex decorations.",
      },
      {
        label:
          "Finally, we compressed years of spreadsheet iteration into the client-visible Bong_Score column: the same ratios the team argued over in committee, now expressed as a single catalog number per medal. The public sections below document how those tiers map to examples; the engine simply enforces the contract: tiers 1–4 score, tier 5+ displays, and ties break on explicit rules rather than hidden multipliers.",
      },
    ],
  },
  {
    title: "Comparing careers fairly",
    items: [
      {
        label:
          "Comparing the military careers of different service members across different nations, eras, and branches is a complex challenge. Military traditions vary wildly; some nations issue a high volume of individual ribbons, while others issue fewer medals but rely heavily on clasps and devices.",
      },
      {
        label:
          "Simply counting the total number of medals on a soldier's chest does not accurately reflect their level of sacrifice, valor, or historical impact. To solve this, Medals N Bongs utilizes a proprietary, mathematically balanced scoring system designed to evaluate United States and British Commonwealth service records on an equal, objective playing field.",
      },
    ],
  },
  {
    title: "The core rule: we only score heroism",
    items: [
      {
        label:
          "The most important distinction in our system is what we choose not to score. Standard service ribbons, training completion awards, and general campaign medals (often referred to as “attendance medals”) receive zero points in our ranking matrix. While these medals tell the story of where a soldier went, they do not measure individual gallantry.",
      },
      {
        label:
          "Our scoring system is strictly activated by documented acts of heroism, combat valor, and supreme gallantry. Only awards with Valor_Tier 1–4 in the catalog (Bong_Score on a 1–100 heroic scale) contribute; Valor_Tier 5+ medals still appear on the ribbon rack but score 0 toward the heroic rank.",
      },
    ],
  },
  {
    title: "The problem with linear scoring",
    items: [
      {
        label:
          "Even when only looking at heroic awards, a linear scoring system (for example assigning 10 points for a lower-tier valor award and 50 for a supreme award) is flawed. Volume can overtake apex valor — for example, several lower-tier combat citations could mathematically outrank a Victoria Cross or Medal of Honor. That misrepresents apex decorations.",
      },
    ],
  },
  {
    title: "The logarithmic approach (the 1–100 scale)",
    items: [
      {
        label:
          "To ensure that extreme acts of valor are appropriately weighted, we apply a logarithmic curve to our scoring matrix, culminating in a standardized 1 to 100 point scale. As tiers of heroic medals rise, catalog points increase on a steep curve, not sequentially.",
      },
      {
        label:
          "On the curve from entry-level heroism up to apex awards: baseline heroic citations (for example Mention in Despatches or a Commendation with a “V” device) sit at the shallow part of the curve. In the catalog these map to Valor_Tier 4 with lower Bong_Score values.",
      },
      {
        label:
          "Mid-curve awards for distinct and prolonged combat valor (for example the Silver Star or the Military Cross) use Valor_Tier 3 in the catalog — the curve steepens sharply.",
      },
      {
        label:
          "Apex awards (Victoria Cross, U.S. Medal of Honor, and peers) use Valor_Tier 1 in the catalog at the top of the 1–100 scale — 100 points for MoH / VC family; George Cross at 95 for supreme gallantry not necessarily in the face of the enemy.",
      },
      {
        label:
          "Why the gap? Since 1856 the Victoria Cross has been awarded only about 1,350 times; the U.S. Medal of Honor a little over 3,500 times since the Civil War — statistical anomalies compared to tens of millions who served. A logarithmic model keeps lower-tier volume from eclipsing Tier 1.",
      },
      {
        label:
          "Early database iterations used a large point matrix; we compressed the same ratios into this precise 1–100 scale for a cleaner interface.",
      },
    ],
  },
  {
    title: "Cross-nation parity: U.S. vs Commonwealth",
    items: [
      {
        label:
          "The U.S. often awards more distinct valor citations; Commonwealth forces may use bars and fewer ribbons for similar conduct. Our curve weights Commonwealth gallantry awards and bars so a single high-tier CW award is not drowned out by U.S. citation volume — whether you are looking at a highly decorated U.S. soldier or a legendary Commonwealth operator, the rank reflects heroism, not ribbon count alone.",
      },
    ],
  },
  {
    title: "Medals N Bongs: tiered valor scoring (catalog)",
    items: [
      {
        label:
          "Developer note: The Bong_Score column in the master client CSV is the catalog point value. Only medals in Valor_Tier 1–4 trigger heroic scoring. Valor_Tier 5 or higher (or non-heroic categories) score 0 heroic points while still displaying on the rack.",
      },
      {
        label:
          "Tier 1 — Apex: U.S. Medal of Honor (Army, Navy, Air Force); Commonwealth VC family; Ashoka Chakra (military); Param Vir Chakra; Malta George Cross anniversary; George Cross (95 pts in catalog).",
        points: "100 pts (Tier 1 apex decorations)",
      },
      {
        label:
          "Tier 2 — Supreme gallantry: U.S. Air Force Cross, Distinguished Service Cross, Navy Cross, Coast Guard Cross; Commonwealth CGC, UK AFC, Australian DSC; DSO when for gallantry; Albert Medal (historical).",
        points: "≈75–85 pts band in catalog",
      },
      {
        label:
          "Tier 3 — Significant combat valor: Silver Star, Military Cross, UK / U.S. DFC (U.S. DFC with “V”), UK DSC (naval), DCM, CGM, Star of Gallantry, and other listed gallantry decorations in this band.",
        points: "≈45–60 pts band in catalog",
      },
      {
        label:
          "Tier 4 — Baseline valor: Bronze Star and Air Medal with “V” only; commendation medals with “V”; Queen’s/King’s Gallantry; Mention in Despatches; UK Military Medal, DFM, UK DSM (historical gallantry context); Commendation for Gallantry / Bravery.",
        points: "≈15–35 pts band in catalog",
      },
      {
        label:
          "Purple Heart — wounded in action (U.S.). Not a gallantry decoration; USM-25.2 assigns Valor_Tier 5 so it scores 0 toward the heroic total while still displaying on the rack.",
        points: "0 heroic pts — rack display only",
      },
      {
        label: "Tier 5 — Service, campaign, training, and general merit",
        points: "0 heroic pts — rack display only",
      },
    ],
  },
  {
    title: "No profile-field modifiers",
    items: [
      {
        label:
          "The heroic score is the sum of catalog points for Valor_Tier 1–4 awards (with V-device rules where the catalog requires it). We do not add points for air or submarine kills, extra theaters, leadership flags, POW narrative, multi-service percentage, or duplicate wound instances beyond what the medals themselves already encode.",
      },
    ],
  },
  {
    title: "Tie-breakers",
    items: [
      { label: "Tie-breaker 1", points: "Highest single award" },
      { label: "Tie-breaker 2", points: "Total combat tours" },
      { label: "Tie-breaker 3", points: "Wounds sustained" },
    ],
  },
];
