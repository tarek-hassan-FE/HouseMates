-- HouseMate Harmony: RLS + onboarding RPCs

-- Helper: current user's house_id
create or replace function public.user_house_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select house_id from public.profiles where id = auth.uid();
$$;

revoke all on function public.user_house_id() from public;
grant execute on function public.user_house_id() to authenticated;

-- Enable RLS
alter table public.houses enable row level security;
alter table public.profiles enable row level security;
alter table public.chores enable row level security;
alter table public.expenses enable row level security;
alter table public.debt_ledger enable row level security;

-- HOUSES
create policy "houses_select_own"
  on public.houses for select
  to authenticated
  using (id = public.user_house_id());

-- PROFILES
create policy "profiles_select_housemates"
  on public.profiles for select
  to authenticated
  using (house_id = public.user_house_id());

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- CHORES
create policy "chores_select"
  on public.chores for select
  to authenticated
  using (house_id = public.user_house_id());

create policy "chores_insert"
  on public.chores for insert
  to authenticated
  with check (house_id = public.user_house_id());

create policy "chores_update"
  on public.chores for update
  to authenticated
  using (house_id = public.user_house_id())
  with check (house_id = public.user_house_id());

create policy "chores_delete"
  on public.chores for delete
  to authenticated
  using (house_id = public.user_house_id());

-- EXPENSES
create policy "expenses_select"
  on public.expenses for select
  to authenticated
  using (house_id = public.user_house_id());

create policy "expenses_insert"
  on public.expenses for insert
  to authenticated
  with check (
    house_id = public.user_house_id()
    and payer_id = auth.uid()
  );

create policy "expenses_update"
  on public.expenses for update
  to authenticated
  using (house_id = public.user_house_id())
  with check (house_id = public.user_house_id());

create policy "expenses_delete"
  on public.expenses for delete
  to authenticated
  using (house_id = public.user_house_id());

-- DEBT LEDGER
create policy "debt_ledger_select"
  on public.debt_ledger for select
  to authenticated
  using (house_id = public.user_house_id());

create policy "debt_ledger_insert"
  on public.debt_ledger for insert
  to authenticated
  with check (house_id = public.user_house_id());

create policy "debt_ledger_update"
  on public.debt_ledger for update
  to authenticated
  using (house_id = public.user_house_id())
  with check (house_id = public.user_house_id());

create policy "debt_ledger_delete"
  on public.debt_ledger for delete
  to authenticated
  using (house_id = public.user_house_id());

-- Allow users to read their own profile before joining a house
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

-- ONBOARDING RPCs (security definer)

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
      insert into public.houses (name, invite_code)
      values (v_name, v_invite_code)
      returning id into v_house_id;
      exit;
    exception when unique_violation then
      if attempts >= 10 then
        raise exception 'Could not generate invite code';
      end if;
    end;
  end loop;

  update public.profiles
  set house_id = v_house_id
  where id = v_user_id;

  return query select v_house_id, v_invite_code;
end;
$$;

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
  set house_id = v_house_id
  where id = v_user_id;

  return v_house_id;
end;
$$;

revoke all on function public.create_house(text) from public;
revoke all on function public.join_house(text) from public;
grant execute on function public.create_house(text) to authenticated;
grant execute on function public.join_house(text) to authenticated;
