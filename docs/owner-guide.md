# Owner guide — adopted hero supporters

**Owners** are site members who **adopted** a hero (or were granted Owner capabilities by staff). This guide covers **My Heroes**, **tribute editing**, and **billing**.

---

## How to open the Owner area

- **Direct:** open **`/my-heroes`** (My Heroes).
- **From staff console:** If you also have an admin account, use **Account → Switch role** (or visit `/go/member`) to jump to the **site** session. That checks your **site** login and sends you to **My Heroes** or **Login** with a return path.

The Owner experience uses the **`site-user-token`** session (not the admin JWT).

---

## My Heroes

On **My Heroes** you’ll see heroes you **currently support**:

- **Name, avatar, score** — Snapshot of the public profile.
- **Adoption period** — Expiry or renewal rules as shown on the page.
- **Renew** — If renewal is offered, follow the on-page action (may open Stripe).
- **Open profile** — Public hero page.
- **Edit tribute** — Opens the **owner editor** for that hero (allowed fields only).

If the list is empty, you have no active adoption, or you’re not signed in as the correct site user.

---

## Editing your hero (tribute editor)

For heroes you own, **Edit tribute** goes to:

`/heroes/[slug]/edit`

You can update **allowed** fields (for example **biography** and **avatar** — medals and scoring are restricted). Changes may be subject to moderation or validation depending on site rules.

If you see **forbidden** or **not found**, the slug may be wrong or your account may not be linked as `ownerUserId` on that hero.

---

## Stripe & billing

- **Customer portal** — When available, **My Heroes** offers a control to open the **Stripe Customer Portal** (manage payment method, invoices, subscriptions if applicable). You need a **Stripe customer** on file from a prior checkout.
- **Return URL** — After the portal, you typically return to **My Heroes**.

If portal or renewal fails, note the on-screen error and contact the team (e.g. **Contact** on the public site).

---

## Account basics

- **Email verification** — Required for adoption and some actions.
- **Password** — Reset via **Forgot password** on login if needed.
- **Role** — Owner capabilities are tied to your account record (`owner` role and adoption linkage). Super-admins can adjust roles in the staff **Users → Owners** area.

---

## Admins who are also Owners

- **Admin session** — `/admin`, staff menus, `admin-token` (or equivalent) cookie.
- **Site session** — Login via **Login** as a **member**, then **My Heroes**.

Use **Switch role** in the admin header when you need to move between them quickly. Logging out of one does not always log out the other.
