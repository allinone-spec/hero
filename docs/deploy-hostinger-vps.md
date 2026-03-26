# Deploy Heroes Archive on Hostinger VPS

This app is **Next.js 15** (Node, `next build` + `next start`). On a VPS you typically run Node behind **Nginx** (TLS + reverse proxy) and keep the process alive with **PM2**.

**MongoDB:** Use **[MongoDB Atlas](https://www.mongodb.com/cloud/atlas)** (recommended) or install MongoDB on the same VPS. Atlas is simpler: add your VPS **public IPv4** under **Network Access → IP Access List** (or a temporary `0.0.0.0/0` only while testing, then tighten).

---

## 1. Point DNS at the VPS

In Hostinger (or your DNS host), create an **A record**:

- **Name:** `@` (or `www` if you use a subdomain)
- **Value:** your VPS **public IP** from Hostinger hPanel

Wait for propagation before enabling HTTPS.

---

## 2. SSH into the server

```bash
ssh root@YOUR_SERVER_IP
# or a sudo user Hostinger created for you
```

Update packages (Ubuntu/Debian example):

```bash
apt update && apt upgrade -y
```

---

## 3. Install Node.js (LTS)

Using **nvm** avoids distro Node being too old:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22
node -v
```

---

## 4. Install Nginx and Certbot

```bash
apt install -y nginx certbot python3-certbot-nginx
```

---

## 5. Deploy the app

```bash
cd /var/www   # or /home/youruser/apps
git clone YOUR_REPO_URL heroes-archive
cd heroes-archive
npm ci
```

Create **`/var/www/heroes-archive/.env`** (or symlink) with **production** variables — same names as the root [README.md](../README.md) “Production checklist” (at minimum `MONGODB_URI`, `NEXTAUTH_SECRET`, `NEXT_PUBLIC_APP_URL=https://yourdomain.com`, plus Stripe/Resend/Cloudinary/Gemini as needed).

```bash
npm run build
```

Smoke test (then stop with Ctrl+C):

```bash
npm run start
```

---

## 6. Run with PM2

```bash
npm install -g pm2
cd /var/www/heroes-archive
pm2 start npm --name "heroes-archive" -- start
pm2 save
pm2 startup
# run the command PM2 prints so it restarts on reboot
```

**Optional worker** (imports / BullMQ): install Redis on the VPS or use a managed Redis, set `REDIS_*` in `.env`, then:

```bash
pm2 start npm --name "heroes-worker" -- run worker
pm2 save
```

---

## 7. Nginx reverse proxy

Replace `yourdomain.com` with your real host.

`/etc/nginx/sites-available/heroes-archive`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and reload:

```bash
ln -s /etc/nginx/sites-available/heroes-archive /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

---

## 8. HTTPS (Let’s Encrypt)

```bash
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Certbot will adjust Nginx for TLS. Renewals are usually automatic via a timer.

Set in `.env` (if not already):

- `NEXT_PUBLIC_APP_URL=https://yourdomain.com`
- `COOKIE_SECURE=true` (HTTPS)

Then rebuild/restart if you changed `NEXT_PUBLIC_*`:

```bash
cd /var/www/heroes-archive
npm run build
pm2 restart heroes-archive
```

---

## 9. Firewall

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
ufw status
```

---

## 10. Stripe webhooks

In Stripe Dashboard, webhook URL must hit your public origin, e.g.:

`https://yourdomain.com/api/webhooks/stripe`

(use the path your app actually implements; keep one endpoint consistent).

### Adoption checkout redirects to `localhost`?

Stripe **success/cancel** URLs are built from **`getPublicSiteUrl`** (same idea as email links). If you still see `https://localhost:3000/...` after payment:

1. Set **`NEXT_PUBLIC_APP_URL=https://yourdomain.com`** (and optionally **`SITE_PUBLIC_URL`**) in the server `.env` **before** `npm run build` (Next inlines `NEXT_PUBLIC_*` at build time for client bundles; the API also reads them at runtime).
2. Ensure Nginx passes **`Host`**, **`X-Forwarded-Proto`**, and **`X-Forwarded-Host`** (see the `location /` block above).
3. Redeploy: **`npm run build`** and **`pm2 restart`** after fixing env.

This repo ignores loopback `NEXT_PUBLIC_*` values in **production** so the public **Host** header from the browser can be used when env was wrong.

---

## 11. Updates after `git pull`

```bash
cd /var/www/heroes-archive
git pull
npm ci
npm run build
pm2 restart heroes-archive
pm2 restart heroes-worker   # if you run the worker
```

---

## PM2: check state on the VPS

SSH in, then:

| Command | Purpose |
| -------- | -------- |
| `pm2 status` or `pm2 list` | Running / stopped / errored, restarts, uptime, CPU, memory |
| `pm2 logs` | Stream logs for all apps; add a name to scope, e.g. `pm2 logs heroes-archive` |
| `pm2 logs heroes-archive --lines 200` | Last 200 lines only |
| `pm2 show heroes-archive` | Details for one process |
| `pm2 monit` | Simple TUI (CPU/mem); quit with **q** |

After changing the process list: `pm2 save`. For boot persistence, run the command `pm2 startup` prints once, then `pm2 save`.

---

## Troubleshooting

| Issue | What to check |
| ----- | ---------------- |
| 502 Bad Gateway | `pm2 status`, `pm2 logs heroes-archive`, is `next start` bound to `3000`? |
| MongoDB errors | Atlas IP allowlist, correct `MONGODB_URI`, TLS on connection string |
| Cookies / login on HTTPS | `COOKIE_SECURE`, `NEXT_PUBLIC_APP_URL` match live URL |
| Email links wrong | `SITE_PUBLIC_URL` / `NEXT_PUBLIC_APP_URL` and Resend domain verification |

Hostinger-specific: confirm the VPS **public IP** in hPanel matches your DNS A record; some panels also show a separate “internal” IP — use the **public** one for DNS and Atlas.
