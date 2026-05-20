# HouseMate Harmony

Gamified chore tracking and shared expense ledger for roommates.

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS v4
- **shadcn/ui** components styled from [`.stitch/DESIGN.md`](.stitch/DESIGN.md)
- **Supabase** (Auth, PostgreSQL, RLS)
- **TanStack Query** (provider wired for Phase 2)

## Design system

Stitch project `13361756046321720259` — tokens and screen references live under [`.stitch/`](.stitch/).

## Local development

### Prerequisites

- Node.js 20+
- [Docker Desktop](https://docs.docker.com/desktop/) (for local Supabase)

### 1. Install dependencies

```bash
npm install
```

### 2. Start Supabase

```bash
npx supabase start
npx supabase status   # copy API URL and keys into .env.local
```

Copy [`.env.local.example`](.env.local.example) to `.env.local` (or `.env`) and set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (from Supabase **Project Settings → API**)

For local Supabase via Docker, use the URL and publishable key from `npx supabase status`.

### 3. Apply migrations

```bash
npx supabase db reset
```

Migrations:

- `supabase/migrations/20250520190000_schema.sql` — tables, enums, profile trigger
- `supabase/migrations/20250520190001_rls.sql` — house-scoped RLS + `create_house` / `join_house` RPCs

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Routes

| Route | Description |
|-------|-------------|
| `/signup` | Email + password registration (username in metadata) |
| `/login` | Sign in |
| `/onboarding` | Create a house or join via invite code |
| `/dashboard` | Leaderboard, balances, quick actions |
| `/chores` | Chore list; members complete, admins manage |
| `/ledger` | Log and view shared expenses |
| `/settings` | House settings (admin can edit; members read-only) |

## House roles (Phase 2)

- **Admin:** User who created the house — rename house, regenerate invite, manage members, CRUD chores, delete expenses.
- **Member:** Joined via invite — complete assigned chores, log expenses, view leaderboard.

### Manual SQL (Supabase Dashboard)

Open **SQL Editor** → New query → paste and run the entire file:

**[`supabase/manual_run_all.sql`](supabase/manual_run_all.sql)** (idempotent — safe to re-run)

You should see: `HouseMate Harmony migrations applied successfully`

Apply migrations **in order** on your hosted project (SQL editor or `npx supabase db push`):

1. `supabase/migrations/20250520190000_schema.sql`
2. `supabase/migrations/20250520190001_rls.sql` (creates `user_house_id()`)
3. `supabase/migrations/20250521100000_house_roles.sql`
4. `supabase/migrations/20250521100002_ensure_user_profile.sql`

If Phase 2 failed with `user_house_id() does not exist`, run `supabase/migrations/20250521100001_fix_user_house_id.sql` instead of re-running the full Phase 2 file.

If create house fails with `houses_created_by_fkey`, run **[`supabase/fix_houses_created_by_fkey.sql`](supabase/fix_houses_created_by_fkey.sql)** in the SQL Editor (backfills missing profiles and updates `create_house` / `join_house`).

### Remote migrations via psql

Passwords with `@` must be **URL-encoded** in `SUPABASE_DB_URL` (`@` → `%40`), or use split vars (recommended):

```env
SUPABASE_DB_HOST=aws-0-us-east-1.pooler.supabase.com   # exact value from Dashboard → Connect
SUPABASE_DB_USER=postgres.qhoghccgavamexpjuvvz
SUPABASE_DB_PASSWORD=your-password
SUPABASE_DB_PORT=5432
```

```bash
bash scripts/db-test-connection.sh   # verify first
npm run db:psql                      # apply migrations
```

## Internationalization (Egypt market)

- **Languages:** English (`en`, default) and Arabic (`ar`)
- **Locale storage:** `NEXT_LOCALE` cookie — URLs stay the same (e.g. `/dashboard`, no `/ar/` prefix)
- **RTL:** Arabic sets `dir="rtl"` on `<html>` and uses logical CSS (`start`/`end`, `ms`/`me`)
- **Currency:** All amounts display in **EGP** via `Intl` (`en-EG` / `ar-EG`); stored as integer cents in the database
- **Language switcher:** Top app bar and Settings → Language section

Message files: [`messages/en.json`](messages/en.json), [`messages/ar.json`](messages/ar.json). Config: [`i18n/routing.ts`](i18n/routing.ts), [`i18n/request.ts`](i18n/request.ts).

## Auth flow

1. Sign up → `handle_new_user` trigger creates a `profiles` row (`house_id` null).
2. Middleware redirects users without a house to `/onboarding`.
3. `create_house` or `join_house` RPC sets `profiles.house_id`.
4. All data access is scoped by RLS to the user's house.

## Scripts

```bash
npm run dev      # Next.js dev server
npm run build    # Production build
npm run lint     # ESLint
```
