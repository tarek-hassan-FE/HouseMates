import {
  AppBottomNav,
  AppSidebar,
  AppTopBar,
} from "@/components/app/app-nav";
import { HouseProvider } from "@/components/providers/house-context";
import { NotificationsProvider } from "@/components/providers/notifications-provider";
import { requireHouseSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  fetchNotificationsForUser,
  fetchUnreadNotificationCount,
} from "@/lib/notifications-data";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireHouseSession();
  const supabase = await createClient();

  const [notifications, unreadCount] = await Promise.all([
    fetchNotificationsForUser(supabase, session.userId, session.house.id),
    fetchUnreadNotificationCount(supabase, session.userId, session.house.id),
  ]);

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
      </NotificationsProvider>
    </HouseProvider>
  );
}
