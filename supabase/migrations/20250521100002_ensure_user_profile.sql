-- Ensure profiles exist before house RPCs set houses.created_by (FK -> profiles.id)

insert into public.profiles (id, username)
select
  u.id,
  left(
    coalesce(
      nullif(trim(u.raw_user_meta_data ->> 'username'), ''),
      split_part(u.email, '@', 1),
      'user' || left(replace(u.id::text, '-', ''), 6)
    ),
    24
  )
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

create or replace function public.ensure_user_profile()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_username text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if exists (select 1 from public.profiles where id = v_user_id) then
    return;
  end if;

  select left(
    coalesce(
      nullif(trim(raw_user_meta_data ->> 'username'), ''),
      split_part(email, '@', 1),
      'user' || left(replace(id::text, '-', ''), 6)
    ),
    24
  )
  into v_username
  from auth.users
  where id = v_user_id;

  if v_username is null or char_length(v_username) < 2 then
    v_username := 'user' || left(replace(v_user_id::text, '-', ''), 6);
  end if;

  insert into public.profiles (id, username)
  values (v_user_id, v_username);
end;
$$;

revoke all on function public.ensure_user_profile() from public;
grant execute on function public.ensure_user_profile() to authenticated;

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
  set house_id = v_house_id, house_role = 'admin'
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

  perform public.ensure_user_profile();

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
  set house_id = v_house_id, house_role = 'member'
  where id = v_user_id;

  return v_house_id;
end;
$$;
