-- Remove legacy 2-arg overload left after adding p_source; it makes 2-arg RPC calls ambiguous.

drop function if exists public.create_expense_with_equal_split(text, integer);

revoke all on function public.create_expense_with_equal_split(text, integer, public.expense_source) from public;
grant execute on function public.create_expense_with_equal_split(text, integer, public.expense_source) to authenticated;
