-- Atomic exact-split expense creation with per-member share amounts.

create or replace function public.create_expense_with_exact_split(
  p_title text,
  p_amount_cents integer,
  p_shares jsonb
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
  v_member_count integer;
  v_share_sum integer := 0;
  v_share record;
  v_member_id uuid;
  v_share_cents integer;
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

  if p_shares is null or jsonb_typeof(p_shares) <> 'array' then
    raise exception 'Shares required';
  end if;

  select count(*)::integer
  into v_member_count
  from public.profiles
  where house_id = v_house_id;

  if v_member_count <= 1 then
    insert into public.expenses (house_id, payer_id, title, amount_cents, strategy)
    values (v_house_id, v_user_id, p_title, p_amount_cents, 'exact')
    returning id into v_expense_id;
    return v_expense_id;
  end if;

  if jsonb_array_length(p_shares) <> v_member_count then
    raise exception 'Share count must match house members';
  end if;

  for v_share in
    select *
    from jsonb_to_recordset(p_shares) as x(member_id uuid, amount_cents integer)
  loop
    v_member_id := v_share.member_id;
    v_share_cents := v_share.amount_cents;

    if v_member_id is null then
      raise exception 'Invalid member in shares';
    end if;

    if v_share_cents is null or v_share_cents < 0 then
      raise exception 'Invalid share amount';
    end if;

    if not exists (
      select 1
      from public.profiles
      where id = v_member_id and house_id = v_house_id
    ) then
      raise exception 'Member not in house';
    end if;

    v_share_sum := v_share_sum + v_share_cents;
  end loop;

  if v_share_sum <> p_amount_cents then
    raise exception 'Shares must equal total amount';
  end if;

  insert into public.expenses (house_id, payer_id, title, amount_cents, strategy)
  values (v_house_id, v_user_id, p_title, p_amount_cents, 'exact')
  returning id into v_expense_id;

  for v_share in
    select *
    from jsonb_to_recordset(p_shares) as x(member_id uuid, amount_cents integer)
  loop
    v_member_id := v_share.member_id;
    v_share_cents := v_share.amount_cents;

    if v_member_id <> v_user_id and v_share_cents > 0 then
      insert into public.debt_ledger (
        house_id,
        debtor_id,
        creditor_id,
        amount_cents,
        expense_id
      )
      values (
        v_house_id,
        v_member_id,
        v_user_id,
        v_share_cents,
        v_expense_id
      );
    end if;
  end loop;

  return v_expense_id;
end;
$$;

revoke all on function public.create_expense_with_exact_split(text, integer, jsonb) from public;
grant execute on function public.create_expense_with_exact_split(text, integer, jsonb) to authenticated;
