# Deploying Elite Forex Hub

The web app is a Next.js (standalone) container backed by a SQLite database on a
persistent volume. Everything builds from the repo root.

## Prerequisites

- Docker with Compose v2 (`docker compose ...`)
- A strong `JWT_SECRET` (auth **fails closed** in production without one)

## Quick start

```bash
# 1. Provide required secrets (a .env file next to docker-compose.yml works too)
export JWT_SECRET="$(openssl rand -base64 32)"

# 2. Build and run
docker compose up -d --build

# 3. Open the app
open http://localhost:3000
```

The first boot copies a **migrated + seeded** database onto the `elite-data`
volume. Subsequent boots reuse that volume, so your data persists across
redeploys. Rebuilding the image never overwrites an existing volume.

## Default seeded accounts

The baked database ships with two demo accounts — **change these before going
live** (rotate the admin password, or start from a clean volume and sign up):

| Role  | Email                  | Password   |
| ----- | ---------------------- | ---------- |
| Admin | `admin@nextlevel.com`  | `admin123` |
| User  | `test@nextlevel.com`   | `user123`  |

To start with an empty database instead, remove the volume before first run
(`docker volume rm elite_elite-data`) and comment out the `db:seed` step
in the `Dockerfile` builder stage.

## Environment variables

| Variable                       | Required | Notes                                              |
| ------------------------------ | -------- | -------------------------------------------------- |
| `JWT_SECRET`                   | **Yes**  | ≥16 chars. Auth throws in production if unset.     |
| `DATABASE_URL`                 | preset   | `file:/data/prod.db` (on the volume). Leave as-is. |
| `PUSHER_*` / `NEXT_PUBLIC_PUSHER_*` | No  | Real-time notifications. Unset = feature disabled. |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_SECURE` | No | Outbound email (password reset, welcome, deposit approved/rejected, admin-created accounts). Unset `SMTP_HOST` = emails are printed to the container log instead. Any SMTP provider works (Brevo, Resend SMTP, Gmail app password, Mailgun…). |
| `MAIL_FROM`                    | No       | Sender, e.g. `Elite Forex Hub <no-reply@elitequest.net>`. Defaults to `no-reply@$DOMAIN`. |
| `APP_URL`                      | No       | Public origin used in emailed links. Defaults to `https://$DOMAIN`. |
| `ADMIN_EMAIL`                  | No       | Receives a notice for every new deposit request. |
| `DEPOSIT_USDT_TRC20_ADDRESS`   | No       | USDT (TRC20) receiving wallet. Unset = that network is hidden on the deposit form. |
| `DEPOSIT_BTC_ADDRESS`          | No       | Bitcoin receiving wallet (native SegWit, `bc1…`). Unset = hidden. |

### Ultahost email (Open-Xchange)

Ultahost's mailboxes are hosted on Open-Xchange Cloud (`*.cloudeu.xion.oxcs.net`),
**not** on the VPS. Use the OX SMTP relay with the full mailbox address as the user:

```
SMTP_HOST=smtp.cloudeu.xion.oxcs.net
SMTP_PORT=465
SMTP_SECURE=true            # or SMTP_PORT=587 + SMTP_SECURE=false (STARTTLS)
SMTP_USER=no-reply@elitequest.net   # the full mailbox address
SMTP_PASS=...                         # that mailbox's password
MAIL_FROM="Elite Forex Hub <no-reply@elitequest.net>"   # must be the same mailbox (OX rejects other senders)
```

The DNS zone must point mail at OX, otherwise connections go to the web VPS and
fail with `ECONNREFUSED`:

| Type | Host | Value |
|------|------|-------|
| MX   | `@`  | `10 mx001.cloudeu.xion.oxcs.net` … `mx004.cloudeu.xion.oxcs.net` (replace any MX pointing at the VPS) |
| TXT  | `@`  | `v=spf1 include:spf.cloudeu.xion.oxcs.net ~all` |
| CNAME| `smtp`, `imap` | `smtp.cloudeu.xion.oxcs.net`, `imap.cloudeu.xion.oxcs.net` (optional, for mail clients) |

Leave `A @` / `www` on the VPS for the website. Remove or repoint `A mail` if it
targets the VPS. DKIM: copy the selector record from the Ultahost/OX control
panel if one is offered — it's the biggest factor in staying out of spam.

### Verifying email

- **Admin panel → Communications** shows whether SMTP is configured, live-checks the connection, sends you a test email, and lets you message all investors / admins / one address with the branded template.
- **From a shell** (uses `apps/web/.env`): `cd apps/web && npx tsx scripts/send-test-email.ts you@example.com`
- **No credentials yet?** `npx tsx scripts/send-test-email.ts --ethereal` sends every template to a throwaway [Ethereal](https://ethereal.email) inbox and prints preview links, so you can check rendering before wiring a real provider.

## Updating / redeploying

```bash
git pull
docker compose up -d --build   # data on the volume is preserved
```

## Building the image directly (without Compose)

```bash
docker build -t elite-web .
docker run -d -p 3000:3000 \
  -e JWT_SECRET="$(openssl rand -base64 32)" \
  -v elite-data:/data \
  elite-web
```

## Deploy to a VPS + connect a domain

This uses the bundled **Caddy** reverse proxy for automatic HTTPS (Let's Encrypt).

### 1. Point DNS at the server

In your domain registrar / DNS provider, create an **A record**:

| Type | Name           | Value            |
| ---- | -------------- | ---------------- |
| A    | `app` (or `@`) | `<your-vps-ip>`  |

Wait for it to propagate (`dig +short app.example.com` should return the VPS IP).

### 2. Provision the VPS (Ubuntu 22.04/24.04)

SSH in as root (or a sudo user) and install Docker:

```bash
curl -fsSL https://get.docker.com | sh
# optional: run docker as your non-root user
sudo usermod -aG docker $USER && newgrp docker
```

Open the firewall for web + SSH:

```bash
sudo ufw allow OpenSSH && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw enable
```

### 3. Get the code and set secrets

```bash
git clone https://github.com/habert-kungu/elite.git
cd elite

# Create a .env next to docker-compose.yml
cat > .env <<EOF
DOMAIN=app.example.com
JWT_SECRET=$(openssl rand -base64 32)
# Email (recommended — enables "forgot password" and notifications):
# SMTP_HOST=smtp-relay.brevo.com
# SMTP_PORT=587
# SMTP_USER=...
# SMTP_PASS=...
# MAIL_FROM="Elite Forex Hub <no-reply@elitequest.net>"
# ADMIN_EMAIL=you@example.com
# Optional Pusher real-time notifications:
# PUSHER_APP_ID=...
# PUSHER_KEY=...
# PUSHER_SECRET=...
# NEXT_PUBLIC_PUSHER_KEY=...
EOF
```

`docker compose` reads that `.env` automatically for `${DOMAIN}` and `${JWT_SECRET}`.

### 4. Launch with the proxy

```bash
docker compose --profile proxy up -d --build
```

This builds the app image, starts the app (bound to localhost), and starts Caddy
on ports 80/443. Caddy obtains a TLS certificate for `DOMAIN` on first request.

Visit **https://app.example.com** — done. Log in with the seeded admin account
and change its password.

### 5. Operate

```bash
docker compose --profile proxy ps          # status
docker compose --profile proxy logs -f web  # app logs
docker compose --profile proxy logs -f caddy # TLS / proxy logs

# Update after pushing new code:
git pull && docker compose --profile proxy up -d --build   # data volume preserved

# Stop / start:
docker compose --profile proxy down
docker compose --profile proxy up -d
```

> **Backups**: the database lives in the `elite-data` Docker volume.
> Back it up with:
> `docker run --rm -v elite-data:/data -v "$PWD":/backup alpine tar czf /backup/db-backup.tgz -C /data prod.db`

### Without the proxy (IP only, no HTTPS)

`docker compose up -d --build` runs just the app on `127.0.0.1:3000`. To expose it
directly, change the web `ports` mapping to `3000:3000` — but prefer the proxy so
traffic is encrypted.

## Notes

- **Database choice**: SQLite is simple and fine for a single-instance
  deployment. For horizontal scaling, migrate `apps/web/prisma/schema.prisma` to
  PostgreSQL and point `DATABASE_URL` at a managed database (the Prisma models
  are portable; only the datasource `provider` and `DATABASE_URL` change).
- **Schema changes**: edit `apps/web/prisma/schema.prisma` and rebuild — the
  builder runs `prisma db push` to sync the baked DB to the schema. (This repo
  tracks schema via `db push`, not a migration history.)
- **Health check**: Compose probes `/login`; the container is marked healthy
  once the server responds.
