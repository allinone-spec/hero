# Ribbon rack engine — parity track (gold standards)

This project treats **automated rack layout** as a deterministic rules engine (catalog + precedence + devices + geometry), not AI layout guessing. External builders are **visual/regulatory benchmarks**, not code we can ship.

## Regulatory sources (US — precedence & construction)

In-repo copies under **`docs/references/ribbon-rack/`** (see that folder’s `README.md`). Cite **chapter and table** when writing tests or reconciling catalog numbers.

| File | Typical content (verify in-doc) |
|------|----------------------------------|
| **`docs/references/ribbon-rack/134833_Vol04.pdf`** | DoD *Military Awards* / decorations — **order of precedence** tables and award system context. |
| **`docs/references/ribbon-rack/NAVMC 2507.pdf`** | USMC uniform regs — **ribbon rack construction**, spacing. |
| **`docs/references/ribbon-rack/NAVMC 2897.pdf`** | USMC **medals / precedence of wear**. |

**Engine rule:** Implement **explicit tests** derived from tables in these PDFs (plus manual EZ Rack reference racks). Do not substitute wiki-only precedence for regulatory order where they conflict — fix **catalog `precedenceOrder`** to match the PDF table for US rows.

## Gate model (Stage 1 “brain” vs plumbing)

| Gate | Meaning | Status |
|------|---------|--------|
| **0 — Catalog** | Every medal/ribbon row has **`precedenceOrder`**, **`countryCode`**, **`otherNames`** (DFC, slang), device rules, ribbon asset. | **Data** — spreadsheet → CSV import, wiki backfill, admin edits. |
| **1 — Sort** | Resolved hero medals sorted by precedence (home-country first when context is set). | **Implemented** — `compareMedalForRackOrder`, `sortHeroMedalEntries`, `buildRibbonRackMedals` in `src/lib/rack-engine.ts`. |
| **2+ — Layout** | Devices locked to ribbons, rows (3/4), pyramid — per PDF + `RibbonRack.tsx` / `ribbon-devices.ts`. | **Partial** — refine against gold racks. |

**Aliases:** Matching free text to catalog uses `matchAiMedalsToDatabase` (`src/lib/match-ai-medals.ts`) against **`name`**, **`otherNames`**, **`shortName`**. Your spreadsheet should list synonyms so they can be imported into `otherNames` (optional CSV column `other_names` — pipe- or semicolon-separated — see `medal-inventory-importer.ts`).

## Spreadsheet → database (`us_armed_forces_ribbons_v2.xlsx`)

The workbook lives at **`docs/references/ribbon-rack/us_armed_forces_ribbons_v2.xlsx`** (sheets: README, Current Awards, Inactive Awards, Foreign Awards). See **`docs/references/ribbon-rack/README.md`** for columns and how **Precedence No.** relates to global `precedenceOrder`.

Export to **CSV** compatible with the inventory importer:

`medal_id,medal_name,precedence_weight,country_code,device_logic,v_device_allowed,category[,base_points[,valor_points[,other_names]]]`

- **`precedence_weight`** → `MedalType.precedenceOrder` (lower = higher precedence / wears first).
- **`other_names`** (optional): e.g. `DFC|Distinguished Flying Cross (United Kingdom)` so imports do not “hang” on abbreviations.

Ribbon images/colors: fill via admin or wiki scrape after the row exists; importer defaults new rows to placeholder gray until updated.

## Gold standards (manual reference racks)

| Source | URL | Role |
|--------|-----|------|
| US (commercial) | [EZ Rack Builder](https://ezrackbuilder.usamm.com/rack-builder/home) | Row layout, device stacking habits, US-centric precedence UX |
| Commonwealth | [medals.pl/bc](https://www.medals.pl/bc/) | CW row geometry and ordering expectations |

## Immediate workflow

1. **Golden rack acceptance pack** — Fixed list of heroes (e.g. high foreign + US mix such as [Courtney Hodges](https://en.wikipedia.org/wiki/Courtney_Hodges)) with **expected** rack rows, order, and device behavior.
2. **Manual EZ Rack / medals.pl** — Build the same medal sets by hand; export or screenshot row structure as **reference**.
3. **Parity checklist** — Precedence order, alias resolution, device rules, ribbon image mapping, row width (3/4-wide), centering.
4. **Automated output** — Compare our dynamic rack output to reference until pass threshold.
5. **Sign-off** — Document pass/fail matrix and residual gaps + ETA.
6. **Commonwealth import** — Repeat with the same acceptance method using CW catalog rows.

## Engine priorities (locked)

1. Country/ruleset precedence and sort (`sortHeroMedalEntries` and related).
2. Device layering and repeat bars/clusters per medal family rules.
3. Row geometry (3/4-wide rows, centering) — renderer + constants.
4. Click-through to wiki/medal detail (product UX; keep aligned with data).

## What we cannot do here

- Import proprietary logic from EZ Rack Builder or medals.pl (not available as open source).
- Replace DoD/USMC/MCO PDF rules with a single Wikipedia infobox scrape.

Map tables in **`docs/references/ribbon-rack/*.pdf`** to explicit tests and engine constants (cite section/table in test names).
