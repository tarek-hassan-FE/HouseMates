-- Settle all unsettled debts between the current user and one other house member.

create or replace function public.settle_bilateral_debts(p_other_user_id uuid)
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
    and (
      (debtor_id = auth.uid() and creditor_id = p_other_user_id)
      or (debtor_id = p_other_user_id and creditor_id = auth.uid())
    );
end;
$$;

revoke all on function public.settle_bilateral_debts(uuid) from public;
grant execute on function public.settle_bilateral_debts(uuid) to authenticated;
