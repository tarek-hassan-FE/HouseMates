import {
  AppBottomNav,
  AppSidebar,
  AppTopBar,
} from "@/components/app/app-nav";
import { HouseProvider } from "@/components/providers/house-context";
import { requireHouseSession } from "@/lib/auth/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireHouseSession();

  return (
    <HouseProvider
      value={{
        profile: session.profile,
        house: session.house,
        isAdmin: session.isAdmin,
      }}
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
    </HouseProvider>
  );
}
