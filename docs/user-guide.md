# User guide — public site & site members

This guide is for anyone using the **public** Heroes Archive: browsing without an account, or signed in as a **site member** (registration is oriented toward people who may **adopt** a hero).

---

## No account required

- **Home** — Landing and highlights.
- **Heroes** — Published profiles, search and filters.
- **Hero detail** — Full profile: medals (ribbon rack), biography, score, and related info.
- **Rankings** — Leaderboard-style view of published heroes.
- **Medals** — Medal types and detail pages.
- **Explore** — Curated exploration paths for heroes.
- **Categories** — Themed groupings where enabled.
- **Scoring** — How USM-25-style scoring works (reference content).
- **Contact** — Message the team (availability may depend on configuration).

---

## Creating a site account (Owner registration)

1. Open **Register** (e.g. from **Adopt** or the account links).
2. Choose **Owner** / member registration when prompted — this is the path used for **adoption** and **My Heroes**.
3. Complete signup and **verify your email** using the link sent to your inbox (check spam; link validity depends on your host’s URL settings).

Until email is verified, some actions (such as adoption checkout) may be blocked.

---

## Sign in

- Use **Login** with your site email and password.
- If you use both **staff admin** and **public owner** access, they are **separate sessions** (different cookies). Use the appropriate entry point (see [Admin guide](./admin-guide.md) / [Owner guide](./owner-guide.md)).

**Forgot password** — Use the reset flow from the login page; email must match your account.

---

## Adopt a hero

1. Go to **Adopt a Hero**.
2. Browse heroes **available for adoption** (filters may include country, branch, war, specialty).
3. You must be **logged in** with a **verified** site account.
4. Complete **Stripe** checkout when offered — adoption is a paid supporter slot with rules shown at checkout.
5. After success, the hero appears under **My Heroes** and you can open tribute editing (see [Owner guide](./owner-guide.md)).

If a hero is already supported or not listed as available, it cannot be adopted until a slot opens per site rules.

---

## Suggestions (Wikipedia hero ideas)

The **Suggestions** page lets logged-in members propose **Wikipedia URLs** for heroes not yet in the archive (or not yet published).

- Submitting typically costs **one “coffee”** credit from your balance (if the feature is enabled).
- Staff review suggestions in **Hero Intake** (admin): your entry may be **queued** for import, **denied** (coffee may be refunded), or otherwise resolved.
- You can view **your** submissions and delete them when the UI allows.

This is **not** the same as CSV bulk import (staff-only).

---

## Roles: `user` vs `owner` (site account)

The site distinguishes:

- **`user`** — Registered member without the Owner adoption role.
- **`owner`** — Member who can hold adoptions (often assigned when you adopt or by super-admins).

Day-to-day browsing is the same; **My Heroes**, adoption, and billing are centered on **Owner**-capable accounts. If something is disabled, your account may need the Owner role or verification — contact support if unsure.

---

## Privacy & security tips

- Use a strong, unique password for your site account.
- Sign out on shared devices.
- Admin and site logins are separate; don’t confuse staff credentials with your public account.
