-- Creditor-only settlement: only the person owed may mark debts as received.
-- Harden RLS: no direct debt_ledger updates; admin-only expense delete.

create or replace function public.settle_expense_debts(p_expense_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_house_id uuid;
  v_updated integer;
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
    and creditor_id = auth.uid()
    and settled_at is null;

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'Nothing to settle';
  end if;
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
  v_updated integer;
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
    and creditor_id = auth.uid()
    and settled_at is null;

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'Nothing to settle';
  end if;
end;
$$;

create or replace function public.settle_bilateral_debts(p_other_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_house_id uuid;
  v_updated integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_other_user_id = auth.uid() then
    raise exception 'Cannot settle with yourself';
  end if;

  v_house_id := public.user_house_id();
  if v_house_id is null then
    raise exception 'Join a house first';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = p_other_user_id and p.house_id = v_house_id
  ) then
    raise exception 'Member not found in your house';
  end if;

  update public.debt_ledger
  set settled_at = now()
  where house_id = v_house_id
    and settled_at is null
    and debtor_id = p_other_user_id
    and creditor_id = auth.uid();

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'Nothing to settle';
  end if;
end;
$$;

drop policy if exists "debt_ledger_update" on public.debt_ledger;

drop policy if exists "expenses_delete" on public.expenses;

create policy "expenses_delete"
  on public.expenses for delete
  to authenticated
  using (house_id = public.user_house_id() and public.is_house_admin());
