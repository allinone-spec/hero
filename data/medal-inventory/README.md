# Medal inventory → `MedalType`

Run: `npm run import-medals` — loads the medal inventory CSV from this folder into Mongo (prefers **`_Final_Medal_Sheet_Client.synced.csv`** when present, otherwise `Final_Medal_Sheet_Client.csv`).

To refresh points from code: `npm run sync-medal-csv` (writes/updates **`_Final_Medal_Sheet_Client.synced.csv`**). If the main file is locked in your editor, copy the synced file over `Final_Medal_Sheet_Client.csv` when convenient.

To wipe the catalog and all heroes’ medal assignments (then re-import): `npm run clear-medals`

## Client sheet columns

Documented in `src/lib/medal-inventory-importer.ts` (`parseRibbonsInventoryCsv`).

- **Precedence** → `precedenceOrder` (ribbon rack ordering with hero nationality tie-breaks in `rack-engine.ts`)
- **Bong_Score** → `basePoints` / `valorPoints` (1–100 heroic scale; empty → computed from `medal-inventory-scoring.ts`)
- **Valor_Tier** → `MedalType.tier` (1–4 = heroic matrix; 5+ = 0 heroic points toward rank)
- **Device** → used with medal name to infer V-device requirements
- **Ribbon_File_Direct_URL** / **Ribbon_Thumbnail_URL** (or legacy **Ribbon_Link**) → `ribbonImageUrl`; **Wiki_Link** → `wikipediaUrl` (**Medal_Link** is usually the Wikipedia article, not the ribbon image)

Legacy `ribbons.csv` row shapes are still parsed if you point code at that file; the default import filename is the client sheet above.
