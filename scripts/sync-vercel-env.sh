#!/usr/bin/env bash
# Push NEXT_PUBLIC_* vars from .env.local to the linked Vercel project.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${1:-$ROOT/.env.local}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE" >&2
  exit 1
fi

cd "$ROOT"

while IFS= read -r line || [[ -n "$line" ]]; do
  [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
  if [[ "$line" =~ ^(NEXT_PUBLIC_[A-Za-z0-9_]+)=(.*)$ ]]; then
    key="${BASH_REMATCH[1]}"
    value="${BASH_REMATCH[2]}"
    value="${value%\"}"
    value="${value#\"}"
    value="${value%\'}"
    value="${value#\'}"

    npx vercel@latest env add "$key" production \
      --value "$value" --yes --no-sensitive --force

    # Preview: omit git branch to apply to all preview deployments
    npx vercel@latest env add "$key" preview \
      --value "$value" --yes --no-sensitive --force

    npx vercel@latest env add "$key" development \
      --value "$value" --yes --no-sensitive --force

    echo "Synced $key to production, preview, development"
  fi
done < "$ENV_FILE"

echo "Done. Run: npx vercel env list"
