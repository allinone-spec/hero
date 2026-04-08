# Medal inventory → `MedalType`

Run: `npm run import-medals` — loads **`Final_Medal_Sheet_Client.csv`** from this folder into Mongo.

To wipe the catalog and all heroes’ medal assignments (then re-import): `npm run clear-medals`

## Client sheet columns

Documented in `src/lib/medal-inventory-importer.ts` (`parseRibbonsInventoryCsv`).

- **Precedence** → `precedenceOrder` (ribbon rack ordering with hero nationality tie-breaks in `rack-engine.ts`)
- **Bong_Score** → `basePoints` / `valorPoints` (catalog input for scoring; empty values import as `0`)
- **Ribbon_File_Direct_URL** / **Ribbon_Thumbnail_URL** (or legacy **Ribbon_Link**) → `ribbonImageUrl`; **Wiki_Link** → `wikipediaUrl` (**Medal_Link** is usually the Wikipedia article, not the ribbon image)

Legacy `ribbons.csv` row shapes are still parsed if you point code at that file; the default import filename is the client sheet above.
