-- Profile avatars storage + leave_house RPC

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  524288,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "avatars_select_public"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

create policy "avatars_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create or replace function public.leave_house()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_house_id uuid := public.user_house_id();
  v_admin_count integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if v_house_id is null then
    raise exception 'Not in a house';
  end if;

  if public.is_house_admin() then
    select count(*) into v_admin_count
    from public.profiles
    where house_id = v_house_id and house_role = 'admin';

    if v_admin_count <= 1 then
      raise exception 'Transfer admin role before leaving as the only admin';
    end if;
  end if;

  update public.profiles
  set house_id = null, house_role = 'member'
  where id = auth.uid() and house_id = v_house_id;

  if not found then
    raise exception 'Could not leave house';
  end if;
end;
$$;

revoke all on function public.leave_house() from public;
grant execute on function public.leave_house() to authenticated;
