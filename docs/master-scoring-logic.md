# Master Scoring Logic — Military Heroes Index

Authoritative plain-language specification. Implementation lives in `src/lib/scoring-engine.ts`, `src/lib/models/ScoringConfig.ts`, and hero fields (`combatAchievements`, `submarineCommandEligible`). Medal **display** precedence remains catalog-driven and independent of these points.

## Design intent

- **Canonical precedence & country context** — ribbon rack and medal pages (authenticity).
- **Normalized gallantry levels** — cross-country scoring so, for example, VC and MOH can both map to level 1 (100 pts) in the global lens.
- **Context leaderboards** — branch, combat specialty, and conflict-era ranks on the hero profile (`src/lib/contextual-ranks.ts`); these do not replace the global score.

---

## Section 1 — Gallantry levels (core valour)

Rule: full points for **each award instance**. Bars/clusters/repeats count as separate instances at the same level.

| Level | Points | Examples |
|-------|--------|----------|
| 1 | 100 | UK/Commonwealth: VC, GC · USA: MOH · India: Param Vir Chakra, Ashoka Chakra · *Foreign supreme awards are **not** flat 100 — see §Foreign (tiered frequency model; 100 cap on foreign patterns except via CORE domestic rows).* |
| 2 | 75 | UK/Commonwealth: DSO, CGC, DSC, MC, DFC, AFC · CA SMV · AU/NZ SG · USA: DSC, Navy Cross, Air Force Cross · India: Maha Vir Chakra, Kirti Chakra · e.g. French Croix de Guerre with bronze palm (army-level) |
| 3 | 50 | UK/Commonwealth: MM, DSM, DFM, AFM, SGM · CA MMV · AU/NZ MG · **USA: Silver Star (always 50)** · India: Vir Chakra, Shaurya Chakra |
| 4 | 25 | UK/Commonwealth: MiD, QGM, King’s/Queen’s Commendation for Brave Conduct · **USA: Bronze Star (V only), Commendation Medal (V only) — always 25 / 25 with V** · e.g. French Croix de Guerre with bronze star (regimental) |

**Engine:** Uses this table. **Légion d’honneur** Chevalier/Officier are **not** CORE domestic medals; they use **foreign pattern rules** (45 pts base + optional valour bonus — see §Foreign national awards).

---

## Section 2 — British orders (military division only)

Civil division scores **0** on the hero index. Military division uses the **hasValor** / gallantry flag in the app as the practical “military stripe” gate.

Tier base **60** points:

| Grade | Examples | Points |
|-------|----------|--------|
| 1 | GBE, GCB, GCMG (grand cross) | 60 |
| 2 | KBE, DBE, KCB, KCMG | 48 |
| 3 | CBE, CB, CMG | 36 |
| 4 | OBE | 24 |
| 5 | MBE | 12 |

Same percentage ladder applies to Order of the Bath and Order of St Michael and St George where applicable.

---

## Section 3 — Indian multi-grade system

For medals with gold / silver / bronze (or 1st / 2nd / 3rd class) of the **same** type:

- Gold / 1st class: **100%** of level score  
- Silver / 2nd class: **66%**  
- Bronze / 3rd class: **33%**  

Implemented in `resolveIndianGradeAdjustedPoints()` in the scoring engine.

---

## Section 4 — Wounded scoring (Purple Heart & wound stripes)

- First instance: **0** medal points (entry fee).  
- Each **additional** instance: **+5** (config: `woundsBonusPerHeart`), summed across Purple Heart and wound-stripe rows.

---

## Section 5 — Encoding test case (Audie Murphy–style)

**Master rule:** **Section 1** is authoritative. Older “Audie Murphy” / worksheet line items that used **75 per Silver Star** or **50 per Bronze Star (V)** are **outliers** — do not use them to validate totals.

Example arithmetic aligned with Section 1 (illustrative only):

| Item | Pts |
|------|-----|
| 1× MOH (L1) | 100 |
| 1× DSC (L2) | 75 |
| 2× Silver Star (L3) | **100** (50 × 2) |
| 1× Legion of Merit | 24 |
| 2× Bronze Star (V) (L4) | **50** (25 × 2) |
| 3× Purple Heart (wound bonus only) | +10 |
| French Legion (Chevalier) + Croix de Guerre (palm) | per **§Foreign** |

**Fixed points (US):** **Silver Star = 50** each instance. **Bronze Star with V = 25** each instance. Recalculate any legacy totals that assumed **75/50** math on those two awards.

---

## Foreign national awards (frequency-modulated)

Implemented by **name patterns** in `FOREIGN_SCORE_RULES` in `scoring-engine.ts` (after CORE and British order rules). Catalog `category: foreign` **fallback** uses `MedalType.basePoints` only when **no** pattern matches.

**Not flat 100 for every national #1:** Top foreign decorations use a **tiered base** (typically **70** for grand-cross–class awards). **Only MOH, VC, and GC** (and other CORE level-1 domestic rows such as Indian Param Vir / Ashoka where coded) reach **100** by default — not foreign pattern rows at 100 base.

**Valour multiplier (+15):** For rows with `gallantryBonusEligible: true`, if **`hasValor`** is true, add **+15** to the **grade-adjusted** base (e.g. 70 → **85**). Capped per medal by `FOREIGN_PATTERN_SCORE_CAP` (**100**) so e.g. Virtuti Militari 90 + 15 does not exceed 100.

**Multi-grade:** For foreign awards with gold/silver/bronze or 1st/2nd/3rd class in the name, the same **100% / 66% / 33%** scaling as §3 is applied to the pattern **base** before the valour add (`resolveIndianGradeAdjustedPoints`).

| Tier | Base (examples) | Notes |
|------|-----------------|--------|
| Foreign L1 | Grand-Croix **70** · Leopold Grand Cordon **70** · Philippine Medal of Valor **70** · Military William Order **70** · **Virtuti Militari 90** | Légion **Grand-Croix** explicitly **70** base; VM **90** base (rarity). |
| Foreign L2 | 45–65 | e.g. Médaille Militaire 65, Croix w/ palm 60, Légion Chevalier/Officier 45 |
| Foreign L3 | 25–40 | Service / high-volume rows; NATO MSM & Philippine Defense/Liberation **25**, no valour bonus |

UK **Order of the Bath** military division remains under **§ British orders** (stripe/`hasValor` gate), not foreign L1.

---

## Section 6 — Aviation ace scoring

- **Ace threshold** (default 5 kills): **+25** once (`aviationMissionPts`).  
- Each kill **after** threshold: **+2** (`aviationKillPtsPerKill`).  
- Example: 10 kills → 25 + (5 × 2) = **35** pilot points.

Defining-missions multiplier is **not** applied to aviation specialty in the engine (ace formula only).

---

## Section 7 — Submarine command scoring

- Eligible only if **`submarineCommandEligible`** is true on the hero (default true) and specialty is submarine.  
- First **3** ships sunk: **+25** (`submarineMissionPts`).  
- Each ship **after** 3: **+5** (`submarineShipPtsPerShip`).  
- Example: 8 ships → 25 + (5 × 5) = **50** sub points.

---

## Section 8 — Worked examples (Section 11/12 in source brief)

**RAF pilot (e.g. 34 kills):** award subtotal from medals + ace block + incremental kills.  
**Sub commander (e.g. 16 ships):** VC + DSO + bars + sub command block as above.

---

## Section 9 — Data fields

| Field | Role |
|-------|------|
| `combatAchievements.confirmedKills` | Pilot kills |
| `combatAchievements.shipsSunk` | Ships sunk |
| `submarineCommandEligible` | Gate submarine sink scoring |

Configurable multipliers: `ScoringConfig` in Mongo (`key: "default"`) and `DEFAULT_SCORING_CONFIG` in code.

---

## Section 10 — Context ranks (product)

For each published hero, the profile can show **#rank of total** within:

- Same **branch** string  
- Same **combat specialty** (`combatAchievements.type`)  
- Each **war** tag on the hero  

Computed by `getContextualRanksForHero()` (same score ordering as global).

---

## Maintenance

- Rebalance modifiers: admin **Recalculate scores** (`/api/scoring-config/recalculate`) after changing config or rules.  
- UK/Commonwealth fairness depends on **medal catalog** names, `category`, and `countryCode` on each `MedalType` row feeding into `calculateScore`.

## Ribbon rack (display) — parity

Rack **sorting and layout** are separate from this score matrix. See **`docs/ribbon-rack-parity.md`** for the EZ Rack Builder / medals.pl benchmark workflow and US regulatory PDF acceptance track.
