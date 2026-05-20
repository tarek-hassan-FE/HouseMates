-- Run this if Phase 2 failed with "function public.user_house_id() does not exist"
-- Safe to re-run: creates the helper and re-applies Phase 2 policies only.

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

-- Re-apply policies that depend on user_house_id() (idempotent)
drop policy if exists "houses_select_own" on public.houses;
drop policy if exists "houses_update_admin" on public.houses;
drop policy if exists "chores_insert_admin" on public.chores;
drop policy if exists "chores_update_admin" on public.chores;
drop policy if exists "chores_update_member_complete" on public.chores;
drop policy if exists "chores_delete_admin" on public.chores;
drop policy if exists "expenses_delete_admin" on public.expenses;

create policy "houses_select_own"
  on public.houses for select
  to authenticated
  using (id = public.user_house_id());

create policy "houses_update_admin"
  on public.houses for update
  to authenticated
  using (id = public.user_house_id() and public.is_house_admin())
  with check (id = public.user_house_id() and public.is_house_admin());

create policy "chores_insert_admin"
  on public.chores for insert
  to authenticated
  with check (house_id = public.user_house_id() and public.is_house_admin());

create policy "chores_update_admin"
  on public.chores for update
  to authenticated
  using (house_id = public.user_house_id() and public.is_house_admin())
  with check (house_id = public.user_house_id() and public.is_house_admin());

create policy "chores_update_member_complete"
  on public.chores for update
  to authenticated
  using (
    house_id = public.user_house_id()
    and assigned_to = auth.uid()
    and not public.is_house_admin()
  )
  with check (
    house_id = public.user_house_id()
    and assigned_to = auth.uid()
  );

create policy "chores_delete_admin"
  on public.chores for delete
  to authenticated
  using (house_id = public.user_house_id() and public.is_house_admin());

create policy "expenses_delete_admin"
  on public.expenses for delete
  to authenticated
  using (house_id = public.user_house_id() and public.is_house_admin());
