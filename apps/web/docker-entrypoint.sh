#!/bin/sh
set -e

# Resolve the SQLite file path from DATABASE_URL (strip the "file:" prefix).
DB_PATH="${DATABASE_URL#file:}"

if [ -n "$DB_PATH" ]; then
  mkdir -p "$(dirname "$DB_PATH")"
  # On first boot the volume is empty — seed it from the baked, migrated DB.
  if [ ! -f "$DB_PATH" ]; then
    echo "→ Initializing database at $DB_PATH"
    cp /app/seed/prod.db "$DB_PATH"
  else
    echo "→ Using existing database at $DB_PATH"
    # Apply additive schema changes to a DB created by an older image.
    node apps/web/scripts/db-sync.mjs
  fi
fi

echo "→ Starting AlphaReserve on ${HOSTNAME:-0.0.0.0}:${PORT:-3000}"
exec node apps/web/server.js
