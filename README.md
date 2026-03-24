# Medals N Bongs — Heroes Archive

Next.js app for a public military honors archive (USM-25 scoring, medals, hero profiles), site-member accounts, Stripe hero adoption, and an admin/staff console.

## Stack

- **Framework:** Next.js 15 (App Router), React 19, TypeScript  
- **Data:** MongoDB (Mongoose)  
- **Auth:** JWT cookies — separate sessions for **admin/staff** and **site members**  
- **Email:** [Resend](https://resend.com) (verification, password reset)  
- **Media:** Cloudinary  
- **Payments:** Stripe (adoptions, optional “coffee” flow)  
- **AI:** Google Gemini (configurable via env)  
- **Jobs (optional):** BullMQ + Redis (`npm run worker`)

## Prerequisites

- Node.js 18+  
- A MongoDB database (local or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))  
- Optional: Resend, Cloudinary, Stripe, Google AI — only if you use those features locally

---

## How Next.js loads environment variables

- Put secrets in **`.env.local`** at the **project root** (same folder as `package.json`).  
- Next.js automatically loads `.env.local` for `next dev`, `next build`, and `next start`.  
- **`.env.local` is gitignored** — never commit it. Share secrets via a password manager or your host’s env UI.  
- Variables prefixed with **`NEXT_PUBLIC_`** are embedded in the **browser bundle**. Do not put secrets there.  
- After changing env vars, restart the dev server (or rebuild for production).

---

## Local development: creating `.env.local`

### 1. Create the file

In the repo root:

```bash
# Windows (PowerShell)
New-Item -Path .env.local -ItemType File

# macOS / Linux
touch .env.local
```

Open `.env.local` in your editor and add variables as **one per line**, no quotes unless the value contains spaces:

```env
KEY=value
```

### 2. Minimal local file (core app only)

Enough to run the app, connect to MongoDB, and sign JWTs:

```env
MONGODB_URI=
NEXTAUTH_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Fill **`MONGODB_URI`** with the connection string from Atlas (**Connect** → **Drivers**). In the copied template, replace the `<password>` placeholder with your database user’s password (URL-encode special characters in the password). Do not commit the final string to git.

Generate `NEXTAUTH_SECRET` (32+ random bytes, hex):

```bash
openssl rand -hex 32
```

If you don’t have OpenSSL, use Node (already required for this project):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Recommended local file (typical feature set)

Add the following **as you enable each integration** (see [How to obtain each credential](#how-to-obtain-each-credential)):

```env
# --- Core (required) ---
MONGODB_URI=
NEXTAUTH_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: separate secret for site-member tokens (else uses NEXTAUTH_SECRET)
# SITE_JWT_SECRET=

# --- Email (member verify + password reset) ---
# RESEND_API_KEY=

# --- Images / uploads ---
# CLOUDINARY_CLOUD_NAME=
# CLOUDINARY_API_KEY=
# CLOUDINARY_API_SECRET=

# --- Stripe (use Test mode keys from Dashboard) ---
# STRIPE_SECRET_KEY=(Stripe Dashboard → API keys → Test mode secret)
# STRIPE_WEBHOOK_SECRET=(Stripe → Webhooks → endpoint signing secret)
# STRIPE_ADOPTION_PRICE_CENTS=999

# --- Admin AI features ---
# GEMINI_API_KEY=
# GEMINI_MODEL=gemini-2.0-flash

# --- Optional: seed/bootstrap admin (see src/lib/auth.ts) ---
# ADMIN_EMAIL=you@example.com
# ADMIN_PASSWORD=your-secure-password

# --- Optional: background worker ---
# REDIS_HOST=127.0.0.1
# REDIS_PORT=6379

# --- Cookies: usually omit locally (defaults work with http://localhost) ---
# COOKIE_SECURE=false
```

### 4. Local URLs and email links

- Set **`NEXT_PUBLIC_APP_URL=http://localhost:3000`** for local dev.  
- With **`next dev`**, verification and reset links in emails use the **request host** (e.g. `http://localhost:3000`) so you can still click them even if you also have a production URL in env — see `src/lib/public-site-url.ts`.  
- In **`next dev`**, Resend uses **`onboarding@resend.dev`** as the sender unless your `NEXT_PUBLIC_APP_URL` hostname is non-local and you’ve verified that domain in Resend — see `src/lib/resend-from.ts`.

---

## Production environment

Production does **not** rely on a committed `.env.local` on the server. You set the **same variable names** in your host’s dashboard.

### Typical platforms

| Platform | Where to set env vars |
| -------- | --------------------- |
| [Vercel](https://vercel.com/docs/projects/environment-variables) | Project → Settings → Environment Variables (Production / Preview / Development) |
| [Netlify](https://docs.netlify.com/environment-variables/overview/) | Site → Environment variables |
| VPS / Docker | `.env` file on server (not in git), `docker run -e`, or systemd `Environment=` |
| [Railway](https://docs.railway.app/develop/variables) / [Render](https://render.com/docs/environment-variables) | Service → Variables |

### Production checklist

1. **`MONGODB_URI`** — Use a production cluster; restrict network access (IP allowlist or VPC).  
2. **`NEXTAUTH_SECRET`** — New strong secret, different from local; never reuse dev secrets.  
3. **`NEXT_PUBLIC_APP_URL`** — Your real public origin: `https://yourdomain.com` (no trailing slash).  
4. **`SITE_PUBLIC_URL`** (optional) — Same as public URL if your app runs behind a proxy and you want email links to always use the canonical domain.  
5. **`COOKIE_SECURE`** — Use `true` on HTTPS (cookies are secure by default in production in this app unless `COOKIE_SECURE=false`).  
6. **Stripe** — Switch Dashboard to **Live mode** and use live API + webhook signing secrets; point the webhook URL to `https://yourdomain.com/api/webhooks/stripe` (or the route your app uses).  
7. **Resend** — Use a **verified domain**; `from` is built as `noreply@<host of NEXT_PUBLIC_APP_URL>`.  
8. **Redeploy** after changing env vars so `next build` picks up `NEXT_PUBLIC_*` values.

### Example production values (illustrative only)

Use your real domain and paste secrets from each provider’s dashboard. **Do not put real keys in git** — only in the host’s environment UI or a private `.env` on the server.

```env
MONGODB_URI=
NEXTAUTH_SECRET=
NEXT_PUBLIC_APP_URL=https://your-production-domain.example
SITE_PUBLIC_URL=https://your-production-domain.example
RESEND_API_KEY=
COOKIE_SECURE=true
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
GEMINI_API_KEY=
```

---

## How to obtain each credential

### MongoDB — `MONGODB_URI`

1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).  
2. **Database Access** → add a database user (username + password).  
3. **Network Access** → allow your IP (local) or `0.0.0.0/0` for testing (tighten for production).  
4. **Database** → **Connect** → **Drivers** → copy the connection string.  
5. Replace the `<password>` placeholder in that string with your user’s password (URL-encode special characters in the password).  
6. See MongoDB’s [connection string format](https://www.mongodb.com/docs/manual/reference/connection-string/) — keep the real URI only in `.env.local` or your host’s secret store, never in the repo.

### JWT secrets — `NEXTAUTH_SECRET`, `SITE_JWT_SECRET`

- Not from a vendor dashboard — **you generate them**.  
- Use `openssl rand -hex 32` (or similar) and paste into `.env.local` / production env.  
- `NEXTAUTH_SECRET` signs **admin** JWTs; site-member JWTs use `SITE_JWT_SECRET` or fall back to `NEXTAUTH_SECRET`.

### Resend — `RESEND_API_KEY` and sending domain

1. Sign up at [resend.com](https://resend.com).  
2. **API Keys** → create a key → copy the key value into **`RESEND_API_KEY`**.  
3. **Domains** → **Add domain** → add DNS records (SPF, DKIM, MX on `send` subdomain) at your DNS host (e.g. Hostinger).  
4. Wait until the domain shows **Verified**.  
5. Set **`NEXT_PUBLIC_APP_URL`** to match that domain (e.g. `https://yourdomain.com`) so the app sends as `noreply@yourdomain.com`.  
6. For quick tests without a domain, Resend allows **`onboarding@resend.dev`** in development only — see code in `src/lib/resend-from.ts`.

### Cloudinary — `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

1. Sign up at [cloudinary.com](https://cloudinary.com).  
2. **Dashboard** → copy **Cloud name**, **API Key**, **API Secret**.  
3. Map them to the three env vars above.

### Stripe — `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_ADOPTION_PRICE_CENTS`

1. Sign up at [stripe.com](https://stripe.com).  
2. **Developers** → **API keys** → use **Test mode** locally: copy the **Secret key** into **`STRIPE_SECRET_KEY`**.  
3. **Developers** → **Webhooks** → **Add endpoint** → URL must match a route in this repo, e.g. `https://your-domain.com/api/stripe/webhook` or `https://your-domain.com/api/webhooks/stripe` (both exist; pick one and stay consistent).  
4. Select events your app needs (e.g. `checkout.session.completed`).  
5. After creating the endpoint, open it and reveal **Signing secret** → **`STRIPE_WEBHOOK_SECRET`**.  
6. For production, repeat with **Live mode** keys and a live webhook.  
7. **`STRIPE_ADOPTION_PRICE_CENTS`** — integer cents (e.g. `999` = $9.99); optional, default in code if unset.

### Google Gemini — `GEMINI_API_KEY`, `GEMINI_MODEL`

1. Open [Google AI Studio](https://aistudio.google.com/) (or Google Cloud Vertex if you use that).  
2. **Get API key** → copy into **`GEMINI_API_KEY`**.  
3. **`GEMINI_MODEL`** — optional; default in code is `gemini-2.0-flash`.

### Redis — `REDIS_HOST`, `REDIS_PORT`

- **Local:** Install Redis (e.g. Docker: `docker run -p 6379:6379 redis`) → `REDIS_HOST=127.0.0.1`, `REDIS_PORT=6379`.  
- **Cloud:** Use your provider’s host/port (e.g. Upstash, Redis Cloud) from their dashboard.

### Bootstrap admin — `ADMIN_EMAIL`, `ADMIN_PASSWORD`

- Used by seed/auth bootstrap logic in `src/lib/auth.ts` when creating the initial super-admin.  
- Set strong values in production; do not use defaults from source in public deployments.

---

## Environment variables (quick reference)

| Variable | Purpose |
| -------- | ------- |
| `MONGODB_URI` | MongoDB connection string (**required**) |
| `NEXTAUTH_SECRET` | JWT signing for admin (and site if `SITE_JWT_SECRET` unset) |
| `SITE_JWT_SECRET` | Optional site-member JWT secret |
| `NEXT_PUBLIC_APP_URL` | Public origin (`http://localhost:3000` local, `https://…` prod) |
| `NEXT_PUBLIC_BASE_URL` | Fallback public URL |
| `SITE_PUBLIC_URL` | Optional canonical URL for server-generated email links in production |
| `RESEND_API_KEY` | Transactional email |
| `COOKIE_SECURE` | `true` for HTTPS production |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Seed/bootstrap admin |
| `CLOUDINARY_*` | Image uploads |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Payments |
| `STRIPE_ADOPTION_PRICE_CENTS` | Adoption price in cents |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | AI in admin |
| `REDIS_HOST` / `REDIS_PORT` | Worker queue |

---

## Quick start

```bash
npm install
# Create and fill .env.local (see above)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Seed data (optional):**

```bash
npm run seed
```

---

## npm scripts

| Script | Description |
| ------ | ----------- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Run production build |
| `npm run lint` | ESLint |
| `npm run seed` | Database seed |
| `npm run import-medals` | Medal inventory import script |
| `npm run worker` | Redis/BullMQ worker |
| `npm run clean` | Remove `.next` |

## Project layout (high level)

- `src/app/(public)/` — Public site (rankings, medals, member login/register, verify email, my heroes)  
- `src/app/admin/` — Staff console (heroes, medals, scoring, users, site members, etc.)  
- `src/app/api/` — API routes (auth, site auth, Stripe, admin, etc.)  
- `src/lib/` — DB models, auth, email, public URL helpers, session hints, etc.

## License / content

Private project; adjust this section if you open-source or add a license file.
