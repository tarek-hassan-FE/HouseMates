-- =============================================================================
-- Run in Supabase Dashboard → SQL Editor
-- Project: HouseMate Harmony (ledger + settlement)
--
-- If your database already has the base app (houses, expenses, debt_ledger, RLS),
-- run ONLY the two blocks below (Step 1 and Step 2).
--
-- If this is a brand-new database, run ALL files in supabase/migrations/ in
-- filename order first, then run Step 1 and Step 2.
-- =============================================================================

-- --- Optional: check what you already have ---
select proname as function_name
from pg_proc
where proname in (
  'user_house_id',
  'create_expense_with_equal_split',
  'settle_expense_debts',
  'settle_all_house_debts'
)
order by 1;

select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'debt_ledger'
  and column_name in ('expense_id', 'settled_at')
order by column_name;

-- =============================================================================
-- STEP 1 — Equal split + expense-linked debts
-- File: supabase/migrations/20250522100000_expense_equal_split.sql
-- =============================================================================

alter table public.debt_ledger
  add column if not exists expense_id uuid references public.expenses (id) on delete cascade;

create index if not exists debt_ledger_expense_id_idx on public.debt_ledger (expense_id);

create or replace function public.create_expense_with_equal_split(
  p_title text,
  p_amount_cents integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_house_id uuid;
  v_expense_id uuid;
  v_member_ids uuid[];
  v_debtor_ids uuid[];
  v_n integer;
  v_base_share integer;
  v_remainder integer;
  v_debtor_count integer;
  v_idx integer;
  v_extra integer;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  v_house_id := public.user_house_id();
  if v_house_id is null then
    raise exception 'Join a house first';
  end if;

  p_title := trim(p_title);
  if p_title = '' then
    raise exception 'Title required';
  end if;

  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'Invalid amount';
  end if;

  insert into public.expenses (house_id, payer_id, title, amount_cents, strategy)
  values (v_house_id, v_user_id, p_title, p_amount_cents, 'equal')
  returning id into v_expense_id;

  select coalesce(array_agg(id order by id), '{}')
  into v_member_ids
  from public.profiles
  where house_id = v_house_id;

  v_n := coalesce(array_length(v_member_ids, 1), 0);
  if v_n <= 1 then
    return v_expense_id;
  end if;

  v_base_share := p_amount_cents / v_n;
  v_remainder := p_amount_cents - v_base_share * v_n;

  select coalesce(array_agg(m order by m), '{}')
  into v_debtor_ids
  from unnest(v_member_ids) as m
  where m <> v_user_id;

  v_debtor_count := coalesce(array_length(v_debtor_ids, 1), 0);
  if v_debtor_count = 0 then
    return v_expense_id;
  end if;

  for v_idx in 1..v_debtor_count loop
    v_extra := case when v_idx <= v_remainder then 1 else 0 end;
    insert into public.debt_ledger (
      house_id,
      debtor_id,
      creditor_id,
      amount_cents,
      expense_id
    )
    values (
      v_house_id,
      v_debtor_ids[v_idx],
      v_user_id,
      v_base_share + v_extra,
      v_expense_id
    );
  end loop;

  return v_expense_id;
end;
$$;

revoke all on function public.create_expense_with_equal_split(text, integer) from public;
grant execute on function public.create_expense_with_equal_split(text, integer) to authenticated;

-- =============================================================================
-- STEP 2 — Settlement (pending vs settled balances)
-- File: supabase/migrations/20250523100000_debt_settlement.sql
-- =============================================================================

alter table public.debt_ledger
  add column if not exists settled_at timestamptz;

create index if not exists debt_ledger_unsettled_house_idx
  on public.debt_ledger (house_id)
  where settled_at is null;

create or replace function public.settle_expense_debts(p_expense_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_house_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  v_house_id := public.user_house_id();
  if v_house_id is null then
    raise exception 'Join a house first';
  end if;

  if not exists (
    select 1 from public.expenses e
    where e.id = p_expense_id and e.house_id = v_house_id
  ) then
    raise exception 'Expense not found';
  end if;

  update public.debt_ledger
  set settled_at = now()
  where expense_id = p_expense_id
    and house_id = v_house_id
    and settled_at is null;
end;
$$;

create or replace function public.settle_all_house_debts()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_house_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  v_house_id := public.user_house_id();
  if v_house_id is null then
    raise exception 'Join a house first';
  end if;

  update public.debt_ledger
  set settled_at = now()
  where house_id = v_house_id
    and settled_at is null;
end;
$$;

revoke all on function public.settle_expense_debts(uuid) from public;
grant execute on function public.settle_expense_debts(uuid) to authenticated;

revoke all on function public.settle_all_house_debts() from public;
grant execute on function public.settle_all_house_debts() to authenticated;

-- =============================================================================
-- STEP 3 — Verify (re-run after applying)
-- =============================================================================

select proname as function_name
from pg_proc
where proname in (
  'create_expense_with_equal_split',
  'settle_expense_debts',
  'settle_all_house_debts'
)
order by 1;
-- Expect 3 rows.

select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'debt_ledger'
  and column_name in ('expense_id', 'settled_at')
order by column_name;
-- Expect expense_id (uuid) and settled_at (timestamp with time zone).
