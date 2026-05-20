-- House shopping list + purchase flow (expense + remove list item)

create table public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses (id) on delete cascade,
  title text not null check (char_length(trim(title)) >= 1),
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index shopping_list_items_house_created_idx
  on public.shopping_list_items (house_id, created_at desc);

alter table public.shopping_list_items enable row level security;

create policy "shopping_list_items_select_housemates"
  on public.shopping_list_items for select
  to authenticated
  using (house_id = public.user_house_id());

create policy "shopping_list_items_insert_housemates"
  on public.shopping_list_items for insert
  to authenticated
  with check (
    house_id = public.user_house_id()
    and created_by = auth.uid()
  );

create policy "shopping_list_items_delete_housemates"
  on public.shopping_list_items for delete
  to authenticated
  using (house_id = public.user_house_id());

-- Purchase: optional list item (deleted) or custom title + equal-split expense
create or replace function public.purchase_shopping_item(
  p_list_item_id uuid,
  p_title text,
  p_amount_cents integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_house_id uuid;
  v_title text;
  v_item_house_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  v_house_id := public.user_house_id();
  if v_house_id is null then
    raise exception 'Join a house first';
  end if;

  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'Invalid amount';
  end if;

  if p_list_item_id is not null then
    select house_id, trim(title)
    into v_item_house_id, v_title
    from public.shopping_list_items
    where id = p_list_item_id;

    if v_title is null then
      raise exception 'Shopping list item not found';
    end if;

    if v_item_house_id <> v_house_id then
      raise exception 'Shopping list item not found';
    end if;

    delete from public.shopping_list_items where id = p_list_item_id;
  else
    v_title := trim(p_title);
    if v_title = '' then
      raise exception 'Title required';
    end if;
  end if;

  return public.create_expense_with_equal_split(v_title, p_amount_cents);
end;
$$;

revoke all on function public.purchase_shopping_item(uuid, text, integer) from public;
grant execute on function public.purchase_shopping_item(uuid, text, integer) to authenticated;
