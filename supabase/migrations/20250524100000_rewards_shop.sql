-- Rewards shop: redemption ledger + redeem_reward RPC

create table public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  reward_key text not null check (char_length(trim(reward_key)) >= 1),
  xp_spent integer not null check (xp_spent > 0),
  created_at timestamptz not null default now()
);

create index reward_redemptions_house_created_idx
  on public.reward_redemptions (house_id, created_at desc);

alter table public.reward_redemptions enable row level security;

create policy "reward_redemptions_select_housemates"
  on public.reward_redemptions for select
  to authenticated
  using (house_id = public.user_house_id());

-- Redeem reward (security definer) — costs must match lib/rewards-catalog.ts
create or replace function public.redeem_reward(p_reward_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_house_id uuid;
  v_xp_cost integer;
  v_total_xp integer;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  v_house_id := public.user_house_id();
  if v_house_id is null then
    raise exception 'Join a house first';
  end if;

  v_xp_cost := case trim(p_reward_key)
    when 'pick_friday_movie' then 100
    when 'skip_dish_duty' then 250
    when 'dj_cleanup' then 75
    when 'comfy_couch_weekend' then 150
    when 'veto_chore_assignment' then 200
    when 'delivery_pick' then 180
    when 'trash_immunity_week' then 400
    else null
  end;

  if v_xp_cost is null then
    raise exception 'Invalid reward';
  end if;

  select total_xp into v_total_xp
  from public.profiles
  where id = v_user_id
  for update;

  if v_total_xp is null then
    raise exception 'Profile not found';
  end if;

  if v_total_xp < v_xp_cost then
    raise exception 'Insufficient XP';
  end if;

  update public.profiles
  set total_xp = total_xp - v_xp_cost
  where id = v_user_id;

  insert into public.reward_redemptions (house_id, profile_id, reward_key, xp_spent)
  values (v_house_id, v_user_id, trim(p_reward_key), v_xp_cost);
end;
$$;

revoke all on function public.redeem_reward(text) from public;
grant execute on function public.redeem_reward(text) to authenticated;
