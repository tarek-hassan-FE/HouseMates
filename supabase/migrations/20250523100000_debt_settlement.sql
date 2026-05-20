-- Settlement state for debt_ledger; RPCs to mark debts as paid.

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
