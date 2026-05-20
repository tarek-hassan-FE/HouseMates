#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f .env.local ] && set -a && source .env.local && set +a

if [ -n "${SUPABASE_DB_HOST:-}" ]; then
  export PGHOST="${SUPABASE_DB_HOST}"
  export PGPORT="${SUPABASE_DB_PORT:-5432}"
  export PGUSER="${SUPABASE_DB_USER:-postgres}"
  export PGPASSWORD="${SUPABASE_DB_PASSWORD:?}"
  export PGDATABASE="${SUPABASE_DB_NAME:-postgres}"
  psql -c "select current_database(), current_user;"
elif [ -n "${SUPABASE_DB_URL:-}" ]; then
  psql "$SUPABASE_DB_URL" -c "select current_database(), current_user;"
else
  echo "Set SUPABASE_DB_HOST or SUPABASE_DB_URL in .env.local"
  exit 1
fi

echo "Connection OK."
