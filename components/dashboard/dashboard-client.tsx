"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "@/i18n/navigation";
import { QuickActionGrid } from "@/components/dashboard/quick-action-grid";
import { DashboardMobileFab } from "@/components/dashboard/dashboard-mobile-fab";
import { ShoppingAddModal } from "@/components/shopping/shopping-add-modal";
import { createShoppingItemAction } from "@/app/[locale]/(app)/shopping/actions";
import type { Profile, ShoppingListItem } from "@/lib/database.types";

type DashboardModalContextValue = {
  openShopping: () => void;
};

const DashboardModalContext = createContext<DashboardModalContextValue | null>(
  null,
);

function useDashboardModals() {
  const ctx = useContext(DashboardModalContext);
  if (!ctx) {
    throw new Error("useDashboardModals must be used within DashboardProvider");
  }
  return ctx;
}

type DashboardProviderProps = {
  children: ReactNode;
  memberCount: number;
  shoppingListItems: ShoppingListItem[];
};

export function DashboardProvider({
  children,
  memberCount,
  shoppingListItems,
}: DashboardProviderProps) {
  const router = useRouter();
  const [shoppingOpen, setShoppingOpen] = useState(false);
  const [shoppingLoading, setShoppingLoading] = useState(false);
  const [shoppingError, setShoppingError] = useState<string | null>(null);

  const openShopping = useCallback(() => setShoppingOpen(true), []);

  async function handleCreateShopping(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setShoppingLoading(true);
    setShoppingError(null);
    const result = await createShoppingItemAction(new FormData(e.currentTarget));
    setShoppingLoading(false);
    if (!result.success) {
      setShoppingError(result.error);
      return;
    }
    setShoppingOpen(false);
    e.currentTarget.reset();
    router.refresh();
  }

  function closeShopping() {
    setShoppingOpen(false);
    setShoppingError(null);
  }

  return (
    <DashboardModalContext.Provider value={{ openShopping }}>
      {children}
      <ShoppingAddModal
        open={shoppingOpen}
        onClose={closeShopping}
        onSubmit={handleCreateShopping}
        loading={shoppingLoading}
        error={shoppingError}
        memberCount={memberCount}
        listItems={shoppingListItems}
      />
    </DashboardModalContext.Provider>
  );
}

export function DashboardQuickActions({
  pendingChoresCount,
  pendingApprovalsCount = 0,
}: {
  pendingChoresCount: number;
  pendingApprovalsCount?: number;
}) {
  const { openShopping } = useDashboardModals();

  return (
    <QuickActionGrid
      pendingChoresCount={pendingChoresCount}
      pendingApprovalsCount={pendingApprovalsCount}
      onAddShopping={openShopping}
    />
  );
}

export function DashboardFab({
  isAdmin,
  isSoloHouse,
  memberCount,
  members,
  shoppingListItems,
}: {
  isAdmin: boolean;
  isSoloHouse: boolean;
  memberCount: number;
  members: Profile[];
  shoppingListItems: ShoppingListItem[];
}) {
  const { openShopping } = useDashboardModals();

  return (
    <DashboardMobileFab
      isAdmin={isAdmin}
      isSoloHouse={isSoloHouse}
      memberCount={memberCount}
      members={members}
      shoppingListItems={shoppingListItems}
      onOpenShopping={openShopping}
    />
  );
}

export function DashboardClient({
  pendingChoresCount,
  pendingApprovalsCount = 0,
  memberCount,
  isAdmin,
  isSoloHouse,
  members,
  shoppingListItems,
}: {
  pendingChoresCount: number;
  pendingApprovalsCount?: number;
  memberCount: number;
  isAdmin: boolean;
  isSoloHouse: boolean;
  members: Profile[];
  shoppingListItems: ShoppingListItem[];
}) {
  return (
    <DashboardProvider
      memberCount={memberCount}
      shoppingListItems={shoppingListItems}
    >
      <DashboardQuickActions
        pendingChoresCount={pendingChoresCount}
        pendingApprovalsCount={pendingApprovalsCount}
      />
      <DashboardFab
        isAdmin={isAdmin}
        isSoloHouse={isSoloHouse}
        memberCount={memberCount}
        members={members}
        shoppingListItems={shoppingListItems}
      />
    </DashboardProvider>
  );
}
