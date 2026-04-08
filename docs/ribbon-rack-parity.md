# Ribbon rack engine — parity track (gold standards)

This project treats **automated rack layout** as a deterministic rules engine (catalog + precedence + devices + geometry), not AI layout guessing. External builders are **visual/regulatory benchmarks**, not code we can ship.

## Gold standards (manual reference racks)

| Source | URL | Role |
|--------|-----|------|
| US (commercial) | [EZ Rack Builder](https://ezrackbuilder.usamm.com/rack-builder/home) | Row layout, device stacking habits, US-centric precedence UX |
| Commonwealth | [medals.pl/bc](https://www.medals.pl/bc/) | CW row geometry and ordering expectations |

**US regulatory PDFs** (precedence of wear / construction): e.g. *Military Medals and Decorations* refs such as **134833 Vol04**, **NAVMC 2507**, **NAVMC 2897** — these should drive **acceptance criteria** for US racks. The engine must implement **these rules**, not an approximation from a single wiki scrape.

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

When you paste or attach the authoritative excerpts from **134833 / NAVMC 2507 / NAVMC 2897**, map them to explicit tests and engine constants in-repo.
