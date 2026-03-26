# Site functionality: from first app commit to current

This document summarizes **what visitors, members, and admins can do** that changed or was added after the repository’s first full Next.js application tree. It complements [git-function-changes-guide.md](./git-function-changes-guide.md), which maps **exported symbols** in changed modules—not product behavior.

## Git baselines

| Commit     | Meaning |
|-----------|---------|
| `2481fb7` | Earliest “Initial commit” in history: **only** `README.md` (no app). |
| `803f38e` | First commit with the real app under `src/` (labeled “initial commit” in git). |

**Range used here:** `803f38e` → `HEAD`. Treat everything below as “since the first deployable app,” unless noted.

**Recorded `HEAD` when written:** `4728d759f80a78f83d9cd6366ba8f10065ff4578` — run `git rev-parse HEAD` to refresh.

```bash
git log 803f38e..HEAD --oneline
```

---

## What already existed at `803f38e` (baseline snapshot)

Roughly, the baseline app already included:

- **Public:** home, hero browse and detail, medal catalog and detail, rankings, scoring explainer, categories, contact, public login/register and password reset, public suggestions.
- **Admin:** dashboard, users, groups and group privileges, permissions, menus, wars, USM-25 tools, hero CRUD (including `heroes2`), medal CRUD and gallery, rankings admin, scoring admin, suggestions, submit/inbox, logs, AI usage, staff register.

So later work is mostly **new surfaces**, **deeper flows** (adoption, email verify, imports), **integrations** (Stripe, Resend, Cloudinary, Gemini), and **reliability/accuracy** (security, ribbon rack, Wikipedia images and titles).

---

## New routes (pages) since baseline

These `page.tsx` paths were **added** after `803f38e` (new URLs or split flows):

| Area   | Path |
|--------|------|
| Public | `/account/login`, `/account/register` |
| Public | `/adopt` |
| Public | `/explore`, `/explore/heroes` |
| Public | `/heroes/[slug]/edit` (owner/editor hero edits on the public site) |
| Public | `/my-heroes` |
| Public | `/verify-email` |
| Admin  | `/admin/caretaker-queue` |
| Admin  | `/admin/heroes/import` |
| Admin  | `/admin/marketplace` |
| App    | `/go/admin`, `/go/member` (entry helpers for staff vs site session) |

Existing routes (home, medals, rankings, etc.) also gained **behavior and UI changes** without always adding a new path.

---

## Commit-by-commit themes (`803f38e..HEAD`)

Commit messages are short; this table interprets them for **site functionality**:

| Commit   | Message | Functional impact (summary) |
|----------|---------|------------------------------|
| `29b7345` | Second commit (before Stripe test) | Early Stripe/adoption wiring and related plumbing toward paid adoption. |
| `2988444` | 3rd commit (primarily completed) | Broader “make it shippable” pass: auth, adoption, member flows, and admin alignment with the README feature set. |
| `94cd7b7` | readme update | Documentation only; no user-facing behavior. |
| `f81f52e` | security leak fix | Prevents sensitive data from being exposed to clients or logs inappropriately (security/privacy). |
| `dc37aec` | fix ribbon-pack click action | Public/medal UI: ribbon stack interactions work as expected when clicking ribbon packs. |
| `7e82299` | 4th commit (AI fix) | Admin (and related) **Gemini** flows more reliable or correctly gated; fewer broken AI-assisted operations. |
| `7a0351b` | 5th commit (tmp update) | Miscellaneous fixes or WIP stabilization between larger milestones. |
| `5061d45` | rack ribbon rules fix | **Ribbon rack rendering and ordering rules** corrected (devices, rows, country-aware behavior where applicable). |
| `8aa8df7` | stage1-3 | Staged rollout of major features (often adoption, member area, imports, or admin queue—see diff for detail). |
| `76c08e7` | 6th commit | Further integration and polish on top of stage work. |
| `540fa7b` | hero, medal image | **Wikimedia / Wikipedia images** for heroes and medals: normalization, fallbacks, `next/image` and referrer behavior so images actually display in lists and detail views; import pipeline keeps usable URLs when Cloudinary is absent. |
| `4728d75` | fetch from web fix | Admin **“fetch from web”** for medals: better **Wikipedia title resolution** (search/OpenSearch/fallbacks), medal vs **ribbon** image selection (ribbon fetch avoids using the obverse coin image; deeper `prop=images` scans). |

---

## Feature areas expanded since baseline

### Public site and discovery

- **Explore** landing and hero-focused explore views.
- **Email verification** flow for site accounts.
- **Alternate account URLs** under `/account/...` alongside legacy `/login` and `/register` paths.

### Owners and site members

- **Adopt a hero** (`/adopt`) with **Stripe** checkout (configurable price via env).
- **My heroes** dashboard for adopted / associated heroes.
- **Edit hero** on the public site where permitted (`/heroes/[slug]/edit`).

### Admin and operations

- **Caretaker queue** for processing imported or pending hero work.
- **Hero import** UI (`/admin/heroes/import`) and pipeline improvements (Wikipedia scraping, images, queue integration).
- **Marketplace** admin surface (per new route).
- **Go links** for quick **admin vs member** session entry.

### Medals, scoring, and display

- **Ribbon rack** logic fixes and **country / Commonwealth**-style device and repeat-award handling (structured rules, normalization).
- **Primary vs ribbon images** and catalog fallbacks aligned across admin and public medal detail.
- **Award text normalization** improvements for matching medals and rendering racks.

### Integrations and platform

- **Stripe** for adoption (and optional supporting flows described in the root README).
- **Resend** for verification and password reset when configured.
- **Cloudinary** for uploads; **direct normalized Wikipedia URLs** as fallback when Cloudinary is not used or fails.
- **Google Gemini** for admin AI features, with fixes for failure modes.
- Optional **BullMQ worker** (see README) for background jobs when Redis is configured.

---

## Related documentation

- [README.md](../README.md) — stack, env vars, credentials.
- [user-guide.md](./user-guide.md), [owner-guide.md](./owner-guide.md), [admin-guide.md](./admin-guide.md) — role-based how-tos.
- [git-function-changes-guide.md](./git-function-changes-guide.md) — export/symbol map for `803f38e..HEAD` in changed `src/` modules.

---

## Regenerating or extending this guide

This file is **hand-curated** from git history, route diffs, and product docs. To list **new** app routes programmatically:

```bash
git diff 803f38e..HEAD --name-only --diff-filter=A -- "src/app/**/page.tsx"
```

To see all touched app files:

```bash
git diff --name-only 803f38e..HEAD -- src/app/
```

For a narrative from **absolute repo birth** (`2481fb7`): the only change from empty tree to `803f38e` is “the entire application appears”; use this document from **§ What already existed at `803f38e`** onward for behavior, and treat the baseline section as “initial product scope.”
