-- Link debts to expenses for cascade delete; atomic equal-split expense creation.

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
