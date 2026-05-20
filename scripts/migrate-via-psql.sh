#!/usr/bin/env bash
# Apply migrations via direct Postgres connection.
#
# Prefer split vars (avoids @ and other special chars breaking the URI):
#   SUPABASE_DB_HOST=aws-0-us-east-1.pooler.supabase.com   # exact host from Dashboard → Connect
#   SUPABASE_DB_USER=postgres.qhoghccgavamexpjuvvz
#   SUPABASE_DB_PASSWORD=your-password
#   SUPABASE_DB_PORT=5432
#   SUPABASE_DB_NAME=postgres
#
# Or a single URI (encode @ in password as %40):
#   SUPABASE_DB_URL=postgresql://postgres.xxx:pass%40word@host:5432/postgres

set -euo pipefail
cd "$(dirname "$0")/.."

if [ -f .env.local ]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "Error: psql not installed."
  exit 1
fi

if [ -n "${SUPABASE_DB_HOST:-}" ]; then
  export PGHOST="${SUPABASE_DB_HOST}"
  export PGPORT="${SUPABASE_DB_PORT:-5432}"
  export PGUSER="${SUPABASE_DB_USER:-postgres}"
  export PGPASSWORD="${SUPABASE_DB_PASSWORD:?Set SUPABASE_DB_PASSWORD in .env.local}"
  export PGDATABASE="${SUPABASE_DB_NAME:-postgres}"
  PSQL_ARGS=()
  echo "Connecting to ${PGUSER}@${PGHOST}:${PGPORT}/${PGDATABASE}"
elif [ -n "${SUPABASE_DB_URL:-}" ]; then
  PSQL_ARGS=("$SUPABASE_DB_URL")
  echo "Connecting via SUPABASE_DB_URL"
else
  echo "Error: Set SUPABASE_DB_HOST + SUPABASE_DB_PASSWORD (recommended)"
  echo "   or SUPABASE_DB_URL in .env.local"
  echo "Copy from: Supabase Dashboard → Project Settings → Database → Connect → Session mode → URI"
  exit 1
fi

for f in supabase/migrations/*.sql; do
  echo "Applying $(basename "$f")..."
  if [ "${#PSQL_ARGS[@]}" -gt 0 ]; then
    psql "${PSQL_ARGS[@]}" -v ON_ERROR_STOP=1 -f "$f"
  else
    psql -v ON_ERROR_STOP=1 -f "$f"
  fi
done

echo "All migrations applied."
