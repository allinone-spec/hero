# Medal inventory CSV → `MedalType`

Run: `npm run import-medals` (loads every `*.csv` in this folder).

Columns are documented in `src/lib/medal-inventory-importer.ts`. Optional column **`other_names`**: pipe- or semicolon-separated aliases.

## US file

If `us.csv` is open in an editor, the OS may lock the file. The full master-scoring row set is also saved as **`us.scoring.v2.csv`**. When ready, close `us.csv` in the IDE, replace it with the contents of `us.scoring.v2.csv` (or delete `us.csv` and rename `us.scoring.v2.csv` → `us.csv`), then run `npm run import-medals` again.

**Do not** keep both `us.csv` and `us.scoring.v2.csv` as separate full lists during import — the importer reads **all** CSVs and would duplicate US rows. After merging, remove or rename the spare file.

## Scoring note

Hero scores use **`src/lib/scoring-engine.ts`** (CORE + British orders + `FOREIGN_SCORE_RULES` + wounds + aviation/sub modifiers). Catalog `base_points` / `valor_points` align with the master doc; **foreign** name patterns may override catalog `basePoints` when they match.
