import {
  AppBottomNav,
  AppSidebar,
  AppTopBar,
} from "@/components/app/app-nav";
import { AppQuickAddProvider } from "@/components/app/app-quick-add";
import { HouseProvider } from "@/components/providers/house-context";
import { NotificationsProvider } from "@/components/providers/notifications-provider";
import { PushRegistration } from "@/components/pwa/push-registration";
import { requireHouseSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  fetchNotificationsForUser,
  fetchUnreadNotificationCount,
} from "@/lib/notifications-data";
import type { Profile, ShoppingListItem } from "@/lib/database.types";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireHouseSession();
  const supabase = await createClient();

  const [
    notifications,
    unreadCount,
    { data: houseMembers },
    { data: shoppingListRows },
    { count: memberCount },
  ] = await Promise.all([
    fetchNotificationsForUser(supabase, session.userId, session.house.id),
    fetchUnreadNotificationCount(supabase, session.userId, session.house.id),
    supabase
      .from("profiles")
      .select(
        "id, username, house_role, total_xp, current_level, house_id, avatar_url, created_at",
      )
      .eq("house_id", session.house.id),
    supabase
      .from("shopping_list_items")
      .select("id, house_id, title, created_by, created_at")
      .eq("house_id", session.house.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("house_id", session.house.id),
  ]);

  const members: Profile[] = (houseMembers ?? []) as Profile[];
  const shoppingListItems: ShoppingListItem[] = (shoppingListRows ?? []).map(
    (row) => ({
      id: row.id,
      house_id: row.house_id,
      title: row.title,
      created_by: row.created_by,
      created_at: row.created_at,
    }),
  );
  const resolvedMemberCount = memberCount ?? 1;

  return (
    <HouseProvider
      value={{
        profile: session.profile,
        house: session.house,
        isAdmin: session.isAdmin,
      }}
    >
      <NotificationsProvider
        initialNotifications={notifications}
        initialUnreadCount={unreadCount}
      >
        <PushRegistration
          pushEnabled={session.profile.push_notifications_enabled ?? false}
        />
        <AppQuickAddProvider
          isAdmin={session.isAdmin}
          isSoloHouse={resolvedMemberCount <= 1}
          memberCount={resolvedMemberCount}
          members={members}
          payerId={session.userId}
          shoppingListItems={shoppingListItems}
        >
          <div className="flex min-h-dvh flex-col">
            <AppTopBar />
            <div className="flex min-h-0 flex-1 pt-16">
              <AppSidebar houseName={session.house.name} />
              <main className="min-w-0 flex-1 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-16">
                <div className="max-w-container-max mx-auto px-margin-mobile py-8 md:px-10 md:py-10">
                  {children}
                </div>
              </main>
            </div>
            <AppBottomNav />
          </div>
        </AppQuickAddProvider>
      </NotificationsProvider>
    </HouseProvider>
  );
}
