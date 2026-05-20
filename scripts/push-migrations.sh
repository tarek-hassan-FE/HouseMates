#!/usr/bin/env bash
# Push all migrations to linked Supabase project.
# Prerequisites (pick one):
#   A) Run: npx supabase login
#   B) Add SUPABASE_ACCESS_TOKEN to .env.local
#
# Optional: SUPABASE_PROJECT_REF=qhoghccgavamexpjuvvz (default below)

set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT_REF="${SUPABASE_PROJECT_REF:-qhoghccgavamexpjuvvz}"

if [ -f .env.local ]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  if [ -f "$HOME/.supabase/access-token" ]; then
    export SUPABASE_ACCESS_TOKEN
    SUPABASE_ACCESS_TOKEN="$(cat "$HOME/.supabase/access-token")"
  fi
fi

if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  echo "Error: Not logged in. Run: npx supabase login"
  echo "Or set SUPABASE_ACCESS_TOKEN in .env.local"
  exit 1
fi

export SUPABASE_ACCESS_TOKEN

echo "Linking project ${PROJECT_REF}..."
npx supabase link --project-ref "$PROJECT_REF" --yes

echo "Pushing migrations..."
npx supabase db push

echo "Done. Migrations applied to remote database."
