-- House Vault: flexible house info (wifi, codes, contacts, rules) + first-visit intro flag

alter table public.houses
  add column if not exists vault_data jsonb not null default '{}'::jsonb;

alter table public.profiles
  add column if not exists vault_intro_seen boolean not null default false;

-- create_house: reset vault intro so admin lands on Vault once
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

-- join_house: reset vault intro so new member sees Vault once
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
  set
    house_id = v_house_id,
    house_role = 'member',
    vault_intro_seen = false
  where id = v_user_id;

  return v_house_id;
end;
$$;
