# Ribbon rack — regulatory PDFs & workbook

Authoritative references for US precedence, USMC wear/rack construction, and the master ribbon workbook used to seed `MedalType.precedenceOrder` and assets.

## Files in this folder

| File | Role |
|------|------|
| `134833_Vol04.pdf` | DoD *Military Awards* / decorations — precedence tables and context (cite chapter/table in tests). |
| `NAVMC 2507.pdf` | USMC uniform regulations — ribbon rack construction, spacing. |
| `NAVMC 2897.pdf` | USMC medals / precedence of wear. |
| `us_armed_forces_ribbons_v2.xlsx` | Master workbook: ribbon names, Wikipedia precedence numbers, image URLs. |

## Workbook structure (`us_armed_forces_ribbons_v2.xlsx`)

Sheets:

- **README** — provenance (Wikipedia source link).
- **Current Awards** — ~130 rows of active US decorations.
- **Inactive Awards** — obsolete/historical US ribbons.
- **Foreign Awards** — foreign/international awards as listed on the same Wikipedia article.

Column headers (each data sheet):

| Column | Use |
|--------|-----|
| Major Section | Grouping (e.g. “Currently issued”). |
| Category | Sub-group (e.g. “Personal decorations”). |
| Precedence No. | Integer order **within that Wikipedia table** (not necessarily globally unique across sheets — foreign rows restart numbering per section). |
| Ribbon Name | Canonical display name → maps to `MedalType.name`. |
| Ribbon PNG | Optional embedded asset name. |
| Ribbon Image URL | Wikimedia/commons URL → can seed `ribbonImageUrl` / wiki scrape. |
| Qualifier / Branch | Branch notes (Army, etc.). |
| Notes | Free text. |
| Source URL | Citation. |

### Importing into MongoDB

The inventory CSV importer (`src/lib/medal-inventory-importer.ts`) expects **`precedence_weight`** to be a **single global sort key** for `precedenceOrder`. The workbook’s **Precedence No.** is authoritative per Wikipedia’s ordering but may **overlap across sheets** (e.g. foreign “1” vs US “1”). Before bulk import:

1. Assign a **global** number (e.g. US current first, then inactive, then foreign with offset), **or**
2. Export each sheet to CSV with columns renamed to match the importer and **non-colliding** `precedence_weight` values reconciled against **134833 / NAVMC 2897** where regulation differs from Wikipedia.

Optional column **`other_names`** (pipe-separated) can list acronyms (e.g. `DFC`) for `matchAiMedalsToDatabase`.
