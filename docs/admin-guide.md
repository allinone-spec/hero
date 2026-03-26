# Admin guide — staff console

**Admins** use the **staff console** at `/admin` with a **separate** session from public **site** accounts. Access is controlled by **group** and **menu privileges** (view / create / edit / delete per area).

---

## Signing in

1. Open **`/go/admin`** (recommended) or **`/login?role=admin`**.  
2. After a successful check of **`/api/auth/me`**, you’re redirected to **`/admin`**.  
3. If not authenticated, you’re sent to **admin login** with a **`next`** return path.

Super-admins see the **Dashboard** by default; other groups may land on **Submit Hero** or another allowed home per app logic.

---

## Navigation & help

- **Tabs** — Built from your group’s allowed menus; overflow may appear under **More**.
- **Suggestions badge** — Count of items needing attention (when you have **Suggestions / Hero Intake** access).
- **Inbox / Contact** — Super-admin: inbox. Others: contact modal.
- **Guide (?)** — In-console help panel summarizes major sections.
- **Theme** — Light / dark toggle.
- **Account menu** — Profile, **Switch role** → public Owner flow (`/go/member`), **Log out** (clears admin session hint).

---

## Core content areas

### Dashboard (Super Admin)

Stats (heroes, medals, admin users), recent heroes, quick links (e.g. add hero, medals, scoring, users).

### Heroes

- List, search, filters, sort.
- **Add** — New hero (forms / Wikipedia tools as configured).
- **View / Edit** — Full staff editor: medals, bio, wars, publishing, scores.
- **Published / Draft** — Control public visibility when permitted.
- **Delete** — Permanent; also removes linked **caretaker queue** rows that pointed at that hero and adjusts batch **approved** counts when applicable.
- **CSV bulk** — Bulk import under **Heroes** (separate from public Suggestions).

### Hero Intake (`/admin/suggestions`)

Combines:

1. **Suggestions** — Public-submitted Wikipedia URLs.  
   - **Queue** — Sends the URL into the **caretaker pipeline** and marks the suggestion reviewed.  
   - **Deny** — Reject (may refund submitter **coffee** when rules apply).  
   - **Delete** — Remove the suggestion record.

2. **Caretaker Queue** — Import pipeline (AI / Wikipedia / batch jobs).  
   - Filters: **NEEDS_REVIEW**, **PROCESSING**, **QUEUED**, **APPROVED**, **FAILED**, **DISMISSED**, **ALL** (with counts when loaded).  
   - **Approve to draft** — Creates/opens a **draft** hero (`canCreate`).  
   - **Dismiss** — Marks non-approved items dismissed (`canEdit`).  
   - **Delete from queue** — For **approved** rows only: removes the queue document and decrements import **approvedRows**; does **not** delete the draft hero (`canDelete`).  
   - **Open draft** — Admin hero editor for `createdHeroId`.

Requires privileges on **`/admin/suggestions`** and **`/admin/heroes`** as appropriate.

### Rankings

Admin preview of published ordering and ribbon display for QA.

### Medals

Medal types: points, ribbons, valor rules, gallery links as configured.

### USM-25 & Scoring

Reference material and **scoring config**; **recalculate** all heroes when permitted.

### Wars

War/conflict list for hero forms; optional AI-assisted import if enabled.

### Users

- **Admins** — Approvals, active flag, groups, passwords.  
- **Owners** (Super Admin) — Public Owner accounts, Stripe linkage, role **user** vs **owner**, adoption-related actions.

### Access control

**Groups**, **Menus** (registry), **Group privileges** — define who sees which console routes and CRUD level.

### Logs

Filterable **activity log** (heroes, medals, auth, scoring, etc.).

### AI Usage

Budget and per-action usage when Gemini (or configured AI) is enabled.

### Marketplace

Adoption metrics, Stripe sync helpers, operational stats.

---

## Background worker (optional)

**`npm run worker`** — BullMQ consumer for **hero-import** jobs (Wikipedia / queue processing). Requires **Redis** (`REDIS_HOST`, `REDIS_PORT`). Without it, queued imports may stall depending on deployment.

---

## Privilege tips

- If a button is missing or disabled, your **group** likely lacks **view/create/edit/delete** on that menu path.  
- Super-admin overrides most restrictions; editors may be scoped.  
- **Delete** on heroes vs **Delete from queue** on approved intake rows are different operations (see above).

---

## Security practices

- Strong passwords; don’t reuse personal site passwords for staff accounts.  
- Log out on shared machines.  
- Production: HTTPS, `COOKIE_SECURE`, rotate `NEXTAUTH_SECRET`, restrict MongoDB network access.
