# syntax=docker/dockerfile:1

# ---- Base ---------------------------------------------------------------
# Debian (bookworm) so the Prisma query engine (debian-openssl-3.0.x) runs.
FROM node:20-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---- Dependencies -------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/typescript-config/package.json packages/typescript-config/package.json
# The web package's postinstall runs `prisma generate`, so the schema must be
# present before install.
COPY apps/web/prisma ./apps/web/prisma
RUN npm ci

# ---- Builder ------------------------------------------------------------
FROM base AS builder
# Bring ALL installed node_modules from deps (root + workspace-local, e.g.
# apps/web/node_modules where the prisma binary lives), then overlay the source
# (node_modules is .dockerignored, so the copied modules are preserved).
COPY --from=deps /app ./
COPY . .
# Build the Next.js standalone bundle (the web build script runs `prisma
# generate` first). prisma is a workspace-local binary, so run it from apps/web.
RUN npm run build
# Create + sync + seed an initial SQLite database, baked into the image and used
# to initialize the volume on first boot. `db push` syncs to the current schema
# (this project manages schema via db push, not migration history).
ENV DATABASE_URL=file:/app/apps/web/prisma/seed.db
RUN cd apps/web \
  && npx prisma db push --skip-generate \
  && npm run db:seed

# ---- Runner -------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Absolute path on the mounted volume — unambiguous for the SQLite client.
ENV DATABASE_URL=file:/data/prod.db

# Standalone server + static assets + public files.
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
# Baked initial DB (migrated + seeded) + entrypoint.
COPY --from=builder /app/apps/web/prisma/seed.db /app/seed/prod.db
COPY apps/web/docker-entrypoint.sh /app/docker-entrypoint.sh
# Additive schema sync for volumes created by older images (see scripts/db-sync.mjs).
COPY apps/web/scripts/db-sync.mjs /app/apps/web/scripts/db-sync.mjs

RUN chmod +x /app/docker-entrypoint.sh \
  && useradd --create-home --uid 1001 appuser \
  && mkdir -p /data \
  && chown -R appuser:appuser /data /app

USER appuser
EXPOSE 3000
ENTRYPOINT ["/app/docker-entrypoint.sh"]
