-- Optional proof images for expenses and chore completions

alter table public.expenses
  add column if not exists receipt_url text;

alter table public.chore_completions
  add column if not exists proof_image_url text;

alter table public.chores
  add column if not exists last_proof_image_url text;

-- house-media storage bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'house-media',
  'house-media',
  true,
  1048576,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "house_media_select_house"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'house-media'
    and (storage.foldername(name))[1] = public.user_house_id()::text
  );

create policy "house_media_insert_house"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'house-media'
    and (storage.foldername(name))[1] = public.user_house_id()::text
  );

create policy "house_media_update_house"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'house-media'
    and (storage.foldername(name))[1] = public.user_house_id()::text
  )
  with check (
    bucket_id = 'house-media'
    and (storage.foldername(name))[1] = public.user_house_id()::text
  );

create policy "house_media_delete_house"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'house-media'
    and (storage.foldername(name))[1] = public.user_house_id()::text
  );

-- attach_expense_receipt
create or replace function public.attach_expense_receipt(
  p_expense_id uuid,
  p_url text
)
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

  if p_url is null or trim(p_url) = '' then
    raise exception 'URL required';
  end if;

  if position(p_expense_id::text in p_url) = 0 then
    raise exception 'URL does not match expense';
  end if;

  select house_id into v_house_id
  from public.expenses
  where id = p_expense_id;

  if v_house_id is null then
    raise exception 'Expense not found';
  end if;

  if v_house_id <> public.user_house_id() then
    raise exception 'Expense not in your house';
  end if;

  update public.expenses
  set receipt_url = trim(p_url)
  where id = p_expense_id;
end;
$$;

-- attach_chore_completion_proof
create or replace function public.attach_chore_completion_proof(
  p_completion_id uuid,
  p_url text
)
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

  if p_url is null or trim(p_url) = '' then
    raise exception 'URL required';
  end if;

  if position(p_completion_id::text in p_url) = 0 then
    raise exception 'URL does not match completion';
  end if;

  select house_id into v_house_id
  from public.chore_completions
  where id = p_completion_id;

  if v_house_id is null then
    raise exception 'Completion not found';
  end if;

  if v_house_id <> public.user_house_id() then
    raise exception 'Completion not in your house';
  end if;

  update public.chore_completions
  set proof_image_url = trim(p_url)
  where id = p_completion_id;
end;
$$;

-- attach_chore_instant_proof (admin instant complete)
create or replace function public.attach_chore_instant_proof(
  p_chore_id uuid,
  p_url text
)
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

  if p_url is null or trim(p_url) = '' then
    raise exception 'URL required';
  end if;

  if position(p_chore_id::text in p_url) = 0 then
    raise exception 'URL does not match chore';
  end if;

  select house_id into v_house_id
  from public.chores
  where id = p_chore_id;

  if v_house_id is null then
    raise exception 'Chore not found';
  end if;

  if v_house_id <> public.user_house_id() then
    raise exception 'Chore not in your house';
  end if;

  update public.chores
  set last_proof_image_url = trim(p_url)
  where id = p_chore_id;
end;
$$;

-- reopen_chore: clear instant proof image
create or replace function public.reopen_chore(p_chore_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_house_id uuid;
  v_xp integer;
  v_completed_by uuid;
  v_completed_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_house_admin() then
    raise exception 'Only house admins can reopen chores';
  end if;

  select house_id, xp_reward, last_completed_by, last_completed_at
  into v_house_id, v_xp, v_completed_by, v_completed_at
  from public.chores
  where id = p_chore_id;

  if v_house_id is null then
    raise exception 'Chore not found';
  end if;

  if v_house_id <> public.user_house_id() then
    raise exception 'Chore not in your house';
  end if;

  if v_completed_at is null then
    raise exception 'Chore is not completed';
  end if;

  if v_completed_by is not null then
    update public.profiles
    set total_xp = greatest(0, total_xp - v_xp)
    where id = v_completed_by;
  end if;

  delete from public.chore_completions
  where chore_id = p_chore_id and status = 'pending';

  update public.chores
  set
    last_completed_at = null,
    last_completed_by = null,
    last_proof_image_url = null
  where id = p_chore_id;
end;
$$;

revoke all on function public.attach_expense_receipt(uuid, text) from public;
revoke all on function public.attach_chore_completion_proof(uuid, text) from public;
revoke all on function public.attach_chore_instant_proof(uuid, text) from public;

grant execute on function public.attach_expense_receipt(uuid, text) to authenticated;
grant execute on function public.attach_chore_completion_proof(uuid, text) to authenticated;
grant execute on function public.attach_chore_instant_proof(uuid, text) to authenticated;
