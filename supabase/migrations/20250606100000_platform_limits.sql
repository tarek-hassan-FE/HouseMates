-- Beta platform limits: 50 users, 10 houses (enforced in triggers/RPCs).

create or replace function public.platform_max_users()
returns integer
language sql
immutable
as $$
  select 50;
$$;

create or replace function public.platform_max_houses()
returns integer
language sql
immutable
as $$
  select 10;
$$;

create or replace function public.platform_user_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from public.profiles;
$$;

create or replace function public.platform_house_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from public.houses;
$$;

create or replace function public.platform_assert_user_capacity()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.platform_user_count() >= public.platform_max_users() then
    raise exception 'Beta is full: maximum 50 users';
  end if;
end;
$$;

create or replace function public.platform_assert_house_capacity()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_system_admin() then
    return;
  end if;

  if public.platform_house_count() >= public.platform_max_houses() then
    raise exception 'Beta is full: maximum 10 houses';
  end if;
end;
$$;

-- Public capacity check for signup/onboarding UI (anon + authenticated).
create or replace function public.get_platform_capacity()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_max_users int := public.platform_max_users();
  v_max_houses int := public.platform_max_houses();
  v_user_count int := public.platform_user_count();
  v_house_count int := public.platform_house_count();
begin
  return jsonb_build_object(
    'max_users', v_max_users,
    'max_houses', v_max_houses,
    'user_count', v_user_count,
    'house_count', v_house_count,
    'signup_open', v_user_count < v_max_users,
    'onboarding_open', v_house_count < v_max_houses
  );
end;
$$;

revoke all on function public.get_platform_capacity() from public;
grant execute on function public.get_platform_capacity() to anon, authenticated;

-- Enforce user cap on new profiles.
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
  perform public.platform_assert_user_capacity();

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

-- create_house: house cap + ensure_user_profile
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

  update public.profiles
  set
    house_id = v_house_id,
    house_role = 'admin',
    vault_intro_seen = false
  where id = v_user_id;

  return query select v_house_id, v_invite_code;
end;
$$;

-- join_house: house cap + ensure_user_profile
create or replace function public.join_house(p_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_house_id uuid;
  v_code text := upper(trim(p_invite_code));
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  perform public.ensure_user_profile();
  perform public.platform_assert_house_capacity();

  if exists (select 1 from public.profiles where id = v_user_id and house_id is not null) then
    raise exception 'Already in a house';
  end if;

  if v_code is null or char_length(v_code) < 4 then
    raise exception 'Invalid invite code';
  end if;

  select id into v_house_id
  from public.houses
  where invite_code = v_code;

  if v_house_id is null then
    raise exception 'House not found';
  end if;

  update public.profiles
  set
    house_id = v_house_id,
    house_role = 'member',
    vault_intro_seen = false
  where id = v_user_id;

  return v_house_id;
end;
$$;

-- Extend system stats with beta limits.
create or replace function public.get_system_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_stats jsonb;
  v_max_users int := public.platform_max_users();
  v_max_houses int := public.platform_max_houses();
  v_user_count int := public.platform_user_count();
  v_house_count int := public.platform_house_count();
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_system_admin() then
    raise exception 'Forbidden';
  end if;

  select jsonb_build_object(
    'generated_at', now(),
    'limits', jsonb_build_object(
      'max_users', v_max_users,
      'max_houses', v_max_houses,
      'user_count', v_user_count,
      'house_count', v_house_count,
      'signup_open', v_user_count < v_max_users,
      'onboarding_open', v_house_count < v_max_houses,
      'users_used_pct', case
        when v_max_users > 0 then round((v_user_count::numeric / v_max_users) * 100, 1)
        else 0
      end,
      'houses_used_pct', case
        when v_max_houses > 0 then round((v_house_count::numeric / v_max_houses) * 100, 1)
        else 0
      end
    ),
    'users', jsonb_build_object(
      'total', v_user_count,
      'with_house', (select count(*)::int from public.profiles where house_id is not null),
      'without_house', (select count(*)::int from public.profiles where house_id is null),
      'created_last_7d', (
        select count(*)::int from public.profiles
        where created_at >= now() - interval '7 days'
      ),
      'created_last_30d', (
        select count(*)::int from public.profiles
        where created_at >= now() - interval '30 days'
      )
    ),
    'houses', jsonb_build_object(
      'total', v_house_count,
      'created_last_7d', (
        select count(*)::int from public.houses
        where created_at >= now() - interval '7 days'
      ),
      'created_last_30d', (
        select count(*)::int from public.houses
        where created_at >= now() - interval '30 days'
      ),
      'avg_members', coalesce((
        select round(avg(member_count)::numeric, 1)
        from (
          select count(*)::numeric as member_count
          from public.profiles
          where house_id is not null
          group by house_id
        ) m
      ), 0)
    ),
    'chores', jsonb_build_object(
      'total', (select count(*)::int from public.chores),
      'completions_pending', (
        select count(*)::int from public.chore_completions where status = 'pending'
      ),
      'completions_approved', (
        select count(*)::int from public.chore_completions where status = 'approved'
      ),
      'completions_last_7d', (
        select count(*)::int from public.chore_completions
        where submitted_at >= now() - interval '7 days'
      )
    ),
    'expenses', jsonb_build_object(
      'total', (select count(*)::int from public.expenses),
      'total_amount_cents', coalesce((select sum(amount_cents)::bigint from public.expenses), 0),
      'ledger_count', (
        select count(*)::int from public.expenses where source = 'ledger'
      ),
      'shopping_count', (
        select count(*)::int from public.expenses where source = 'shopping'
      ),
      'last_7d_count', (
        select count(*)::int from public.expenses
        where created_at >= now() - interval '7 days'
      ),
      'last_7d_amount_cents', coalesce((
        select sum(amount_cents)::bigint from public.expenses
        where created_at >= now() - interval '7 days'
      ), 0),
      'last_30d_count', (
        select count(*)::int from public.expenses
        where created_at >= now() - interval '30 days'
      )
    ),
    'debts', jsonb_build_object(
      'total_entries', (select count(*)::int from public.debt_ledger),
      'unsettled_count', (
        select count(*)::int from public.debt_ledger where settled_at is null
      ),
      'unsettled_amount_cents', coalesce((
        select sum(amount_cents)::bigint from public.debt_ledger where settled_at is null
      ), 0)
    ),
    'notifications', jsonb_build_object(
      'total', (select count(*)::int from public.notifications),
      'unread', (select count(*)::int from public.notifications where read_at is null)
    ),
    'shopping', jsonb_build_object(
      'items_total', (select count(*)::int from public.shopping_list_items)
    ),
    'rewards', jsonb_build_object(
      'redemptions_total', (select count(*)::int from public.reward_redemptions),
      'xp_spent_total', coalesce((select sum(xp_spent)::bigint from public.reward_redemptions), 0)
    ),
    'top_houses', coalesce((
      select jsonb_agg(row order by row -> 'expense_count' desc)
      from (
        select jsonb_build_object(
          'id', h.id,
          'name', h.name,
          'member_count', (
            select count(*)::int from public.profiles p where p.house_id = h.id
          ),
          'expense_count', (
            select count(*)::int from public.expenses e where e.house_id = h.id
          ),
          'created_at', h.created_at
        ) as row
        from public.houses h
        order by (
          select count(*) from public.expenses e where e.house_id = h.id
        ) desc
        limit 10
      ) t
    ), '[]'::jsonb)
  )
  into v_stats;

  return v_stats;
end;
$$;
