-- Per-house rewards catalog + redeem by house_reward id

create table public.house_rewards (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses (id) on delete cascade,
  preset_key text,
  title text not null check (char_length(trim(title)) >= 1),
  description text,
  xp_cost integer not null check (xp_cost > 0),
  icon text not null default 'redeem',
  gradient text,
  image_url text,
  is_enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint house_rewards_preset_key_unique unique (house_id, preset_key)
);

create index house_rewards_house_enabled_idx
  on public.house_rewards (house_id, is_enabled, sort_order, created_at);

alter table public.house_rewards enable row level security;

create policy "house_rewards_select_housemates"
  on public.house_rewards for select
  to authenticated
  using (house_id = public.user_house_id());

create policy "house_rewards_insert_admin"
  on public.house_rewards for insert
  to authenticated
  with check (house_id = public.user_house_id() and public.is_house_admin());

create policy "house_rewards_update_admin"
  on public.house_rewards for update
  to authenticated
  using (house_id = public.user_house_id() and public.is_house_admin())
  with check (house_id = public.user_house_id() and public.is_house_admin());

create policy "house_rewards_delete_admin"
  on public.house_rewards for delete
  to authenticated
  using (house_id = public.user_house_id() and public.is_house_admin());

-- Link redemptions to catalog rows
alter table public.reward_redemptions
  add column if not exists house_reward_id uuid references public.house_rewards (id) on delete set null;

create index reward_redemptions_house_reward_idx
  on public.reward_redemptions (house_reward_id)
  where house_reward_id is not null;

-- Seed default presets (titles match messages/en.json defaults)
create or replace function public.seed_house_rewards(p_house_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.house_rewards (
    house_id,
    preset_key,
    title,
    description,
    xp_cost,
    icon,
    gradient,
    image_url,
    sort_order
  )
  values
    (
      p_house_id,
      'dj_cleanup',
      'DJ for cleanup',
      'You pick the playlist for the next group cleanup session.',
      75,
      'queue_music',
      'from-primary-fixed-dim to-primary',
      null,
      0
    ),
    (
      p_house_id,
      'pick_friday_movie',
      'Pick Friday Movie',
      'Total control over the popcorn and the film choice.',
      100,
      'movie',
      'from-primary-container to-primary',
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAqaB-YUpRarDIxzDAsc4DqFCQjU7oejZmddlmFbwVIPlg-JbbYYlvI72kqlAFMfcMb_c6U3wBph0kxbIfCGH75P5jQcKNu-_ThO_4NYXpps7guC4ZecrBCDSri_z1deEqFaBI5d9D4qg2w1YpwjQW8pZVkKIn_VzlaP5WTBufZ5Wd64J3ZuKc1qrJnkGaDVz5wGRSYB3nudZPPbxixGJP-y4QbHoWMsMHqxal1u-BpLPMwjhu-n7qTkVdmR9q8Kzzb5_Y4VG-2wkLU',
      1
    ),
    (
      p_house_id,
      'comfy_couch_weekend',
      'Comfy couch weekend',
      'Claim the best couch spot for the whole weekend.',
      150,
      'weekend',
      'from-secondary-fixed-dim to-secondary',
      null,
      2
    ),
    (
      p_house_id,
      'delivery_pick',
      'Delivery pick',
      'When the house orders in, everyone eats from your restaurant choice.',
      180,
      'delivery_dining',
      'from-tertiary-fixed-dim to-tertiary',
      null,
      3
    ),
    (
      p_house_id,
      'veto_chore_assignment',
      'Veto one chore',
      'Pass a single assigned chore to another roommate.',
      200,
      'block',
      'from-primary-fixed to-primary-container',
      null,
      4
    ),
    (
      p_house_id,
      'skip_dish_duty',
      'Skip one dish duty',
      'Pass your turn at the sink to another roommate.',
      250,
      'countertops',
      'from-tertiary-container to-tertiary',
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAEv9Wj41GprcqQkoOifdFkuXVahT5O-c87lL7NZ-3ANmtDv3mqmK8_i66SvMGC7AOKkkksogghgQqBLpraAuxq1bjJYMb1TGyz-rfVoN6Nzuo273oGfCOCTrZ5gQv9WyEi7n3OGR-4iAHQ-qPD1WAjExCCY8kVZFXzqY10zZyAul-sw7hc5b-I48X8DVzVOXWtCzss_cIGr1pvwhXyJ7jdm16oeCfqtpSbnktEmkT2EBNilHdm2WBzCIiPoB3ZxWGP1AqKBGn-Thhn',
      5
    ),
    (
      p_house_id,
      'trash_immunity_week',
      'Trash immunity week',
      'Skip trash duty for one full week.',
      400,
      'delete',
      'from-error-container to-error',
      null,
      6
    )
  on conflict (house_id, preset_key) do nothing;
end;
$$;

revoke all on function public.seed_house_rewards(uuid) from public;
grant execute on function public.seed_house_rewards(uuid) to authenticated;

-- Backfill existing houses
do $$
declare
  h record;
begin
  for h in select id from public.houses loop
    perform public.seed_house_rewards(h.id);
  end loop;
end;
$$;

-- Redeem by house_reward id (single source of truth for XP cost)
drop function if exists public.redeem_reward(text);

create or replace function public.redeem_reward(p_house_reward_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_house_id uuid;
  v_reward public.house_rewards%rowtype;
  v_total_xp integer;
  v_reward_key text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  v_house_id := public.user_house_id();
  if v_house_id is null then
    raise exception 'Join a house first';
  end if;

  select * into v_reward
  from public.house_rewards
  where id = p_house_reward_id
    and house_id = v_house_id
    and is_enabled = true;

  if not found then
    raise exception 'Invalid reward';
  end if;

  select total_xp into v_total_xp
  from public.profiles
  where id = v_user_id
  for update;

  if v_total_xp is null then
    raise exception 'Profile not found';
  end if;

  if v_total_xp < v_reward.xp_cost then
    raise exception 'Insufficient XP';
  end if;

  update public.profiles
  set total_xp = total_xp - v_reward.xp_cost
  where id = v_user_id;

  v_reward_key := coalesce(v_reward.preset_key, v_reward.id::text);

  insert into public.reward_redemptions (
    house_id,
    profile_id,
    reward_key,
    xp_spent,
    house_reward_id
  )
  values (
    v_house_id,
    v_user_id,
    v_reward_key,
    v_reward.xp_cost,
    v_reward.id
  );
end;
$$;

revoke all on function public.redeem_reward(uuid) from public;
grant execute on function public.redeem_reward(uuid) to authenticated;

-- Auto-seed rewards when a house is created
create or replace function public.create_house(p_name text)
returns table (house_id uuid, invite_code text)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_user_id uuid := auth.uid();
  v_house_id uuid;
  v_invite_code text;
  v_name text := trim(p_name);
  attempts integer := 0;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  perform public.ensure_user_profile();
  perform public.platform_assert_house_capacity();

  if exists (
    select 1 from public.profiles
    where id = v_user_id and public.profiles.house_id is not null
  ) then
    raise exception 'Already in a house';
  end if;

  if v_name is null or char_length(v_name) < 1 then
    raise exception 'House name is required';
  end if;

  loop
    attempts := attempts + 1;
    v_invite_code := public.generate_invite_code();
    begin
      insert into public.houses (name, invite_code, created_by)
      values (v_name, v_invite_code, v_user_id)
      returning id into v_house_id;
      exit;
    exception when unique_violation then
      if attempts >= 10 then
        raise exception 'Could not generate invite code';
      end if;
    end;
  end loop;

  perform public.seed_house_rewards(v_house_id);

  update public.profiles
  set
    house_id = v_house_id,
    house_role = 'admin',
    vault_intro_seen = false
  where id = v_user_id;

  return query select v_house_id, v_invite_code;
end;
$$;
