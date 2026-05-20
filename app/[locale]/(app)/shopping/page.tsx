import { ShoppingListPanel } from "@/components/shopping/shopping-list-panel";
import { requireHouseSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { ShoppingListItem } from "@/lib/database.types";

export default async function ShoppingPage() {
  const session = await requireHouseSession();
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("shopping_list_items")
    .select(
      "id, house_id, title, created_by, created_at, creator:profiles(username)",
    )
    .eq("house_id", session.house.id)
    .order("created_at", { ascending: true });

  const items: ShoppingListItem[] = (rows ?? []).map((row) => {
    const creator = row.creator;
    const username =
      creator && typeof creator === "object" && "username" in creator
        ? (creator as { username: string }).username
        : Array.isArray(creator) && creator[0]?.username
          ? creator[0].username
          : undefined;
    return {
      id: row.id,
      house_id: row.house_id,
      title: row.title,
      created_by: row.created_by,
      created_at: row.created_at,
      creator: username ? { username } : null,
    };
  });

  return <ShoppingListPanel items={items} />;
}
