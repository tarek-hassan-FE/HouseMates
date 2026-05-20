-- HouseMate Harmony: core schema

create type public.chore_frequency as enum (
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'once'
);

create type public.expense_strategy as enum ('equal', 'exact');

-- Houses
create table public.houses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) >= 1),
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

create index houses_invite_code_idx on public.houses (invite_code);

-- Profiles (1:1 with auth.users)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  house_id uuid references public.houses (id) on delete set null,
  username text not null check (char_length(trim(username)) >= 2),
  avatar_url text,
  total_xp integer not null default 0 check (total_xp >= 0),
  current_level integer not null default 1 check (current_level >= 1),
  created_at timestamptz not null default now()
);

create index profiles_house_id_idx on public.profiles (house_id);

-- Per-house unique usernames (null house_id excluded)
create unique index profiles_house_username_unique
  on public.profiles (house_id, username)
  where house_id is not null;

-- Chores
create table public.chores (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses (id) on delete cascade,
  title text not null check (char_length(trim(title)) >= 1),
  description text,
  xp_reward integer not null default 10 check (xp_reward >= 0),
  frequency public.chore_frequency not null default 'weekly',
  assigned_to uuid references public.profiles (id) on delete set null,
  last_completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index chores_house_id_idx on public.chores (house_id);

-- Expenses
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses (id) on delete cascade,
  payer_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(trim(title)) >= 1),
  amount_cents integer not null check (amount_cents > 0),
  strategy public.expense_strategy not null default 'equal',
  created_at timestamptz not null default now()
);

create index expenses_house_id_idx on public.expenses (house_id);

-- Debt ledger
create table public.debt_ledger (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses (id) on delete cascade,
  debtor_id uuid not null references public.profiles (id) on delete cascade,
  creditor_id uuid not null references public.profiles (id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  created_at timestamptz not null default now(),
  check (debtor_id <> creditor_id)
);

create index debt_ledger_house_id_idx on public.debt_ledger (house_id);

-- Invite code generator
create or replace function public.generate_invite_code()
returns text
language plpgsql
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
begin
  for i in 1..8 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  end loop;
  return result;
end;
$$;

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  final_username text;
begin
  base_username := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'username'), ''),
    split_part(new.email, '@', 1)
  );
  final_username := left(base_username, 24);
  if char_length(final_username) < 2 then
    final_username := 'user' || left(replace(new.id::text, '-', ''), 6);
  end if;

  insert into public.profiles (id, username)
  values (new.id, final_username);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
