"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { MaterialIcon } from "@/components/design/material-icon";
import { ChoreFormModal } from "@/components/chores/chore-add-modal";
import { ShoppingAddModal } from "@/components/shopping/shopping-add-modal";
import { ExpenseAddModal } from "@/components/ledger/expense-add-modal";
import { createChoreAction } from "@/app/[locale]/(app)/chores/actions";
import { createShoppingItemAction } from "@/app/[locale]/(app)/shopping/actions";
import { createExpenseAction } from "@/app/[locale]/(app)/ledger/actions";
import { useHouse } from "@/components/providers/house-context";
import { attachExpenseReceiptFromFile } from "@/lib/attach-expense-receipt";
import { queryKeys } from "@/lib/queries/keys";
import { cn } from "@/lib/utils";
import type { Profile, ShoppingListItem } from "@/lib/database.types";

type ActiveModal = "chore" | "shopping" | "expense" | null;

type AppQuickAddContextValue = {
  openShopping: () => void;
  openChore: () => void;
  openExpense: () => void;
};

const AppQuickAddContext = createContext<AppQuickAddContextValue | null>(null);

export function useAppQuickAdd() {
  const ctx = useContext(AppQuickAddContext);
  if (!ctx) {
    throw new Error("useAppQuickAdd must be used within AppQuickAddProvider");
  }
  return ctx;
};

type AppQuickAddProviderProps = {
  children: ReactNode;
  isAdmin: boolean;
  isSoloHouse: boolean;
  memberCount: number;
  members: Profile[];
  payerId: string;
  shoppingListItems: ShoppingListItem[];
};

export function AppQuickAddProvider({
  children,
  isAdmin,
  isSoloHouse,
  memberCount,
  members,
  payerId,
  shoppingListItems,
}: AppQuickAddProviderProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { house } = useHouse();
  const t = useTranslations("dashboard");
  const ta = useTranslations("attachments");

  const [menuOpen, setMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [shoppingLoading, setShoppingLoading] = useState(false);
  const [expenseLoading, setExpenseLoading] = useState(false);
  const [choreError, setChoreError] = useState<string | null>(null);
  const [shoppingError, setShoppingError] = useState<string | null>(null);
  const [expenseError, setExpenseError] = useState<string | null>(null);

  const openChore = useCallback(() => {
    setMenuOpen(false);
    setActiveModal("chore");
  }, []);

  const openShopping = useCallback(() => {
    setMenuOpen(false);
    setActiveModal("shopping");
  }, []);

  const openExpense = useCallback(() => {
    setMenuOpen(false);
    setActiveModal("expense");
  }, []);

  function openModalFromMenu(modal: ActiveModal) {
    setMenuOpen(false);
    setActiveModal(modal);
  }

  function closeModal() {
    setActiveModal(null);
    setChoreError(null);
    setShoppingError(null);
    setExpenseError(null);
  }

  async function handleCreateChore(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setChoreError(null);
    const result = await createChoreAction(new FormData(e.currentTarget));
    if (!result.success) {
      setChoreError(result.error);
      return;
    }
    closeModal();
    await queryClient.invalidateQueries({
      queryKey: queryKeys.chores(house.id),
    });
    router.refresh();
  }

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
    closeModal();
    e.currentTarget.reset();
    router.refresh();
  }

  async function handleCreateExpense(
    e: React.FormEvent<HTMLFormElement>,
    imageFile: File | null,
  ) {
    e.preventDefault();
    setExpenseLoading(true);
    setExpenseError(null);
    const result = await createExpenseAction(new FormData(e.currentTarget));
    if (!result.success) {
      setExpenseLoading(false);
      setExpenseError(result.error);
      return;
    }
    if (imageFile && result.expenseId) {
      const attach = await attachExpenseReceiptFromFile(
        house.id,
        result.expenseId,
        imageFile,
      );
      if (!attach.ok) {
        setExpenseError(attach.error ?? ta("uploadFailed"));
      }
    }
    setExpenseLoading(false);
    (e.target as HTMLFormElement).reset();
    closeModal();
    router.refresh();
  }

  const menuItems: {
    id: ActiveModal;
    label: string;
    icon: string;
    adminOnly?: boolean;
  }[] = [
    { id: "chore", label: t("fabChore"), icon: "task_alt", adminOnly: true },
    {
      id: "shopping",
      label: t("fabPurchasedItem"),
      icon: "shopping_cart",
    },
    { id: "expense", label: t("fabBill"), icon: "receipt_long" },
  ];

  const visibleMenuItems = menuItems.filter(
    (item) => !item.adminOnly || isAdmin,
  );

  return (
    <AppQuickAddContext.Provider
      value={{ openShopping, openChore, openExpense }}
    >
      {children}

      <div className="md:hidden">
        {menuOpen && (
          <button
            type="button"
            className="fixed inset-0 z-30"
            aria-label={t("quickAdd")}
            onClick={() => setMenuOpen(false)}
          />
        )}

        <div className="fixed end-6 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-40 flex flex-col items-end gap-3">
          {menuOpen &&
            visibleMenuItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openModalFromMenu(item.id)}
                className="btn-press bg-surface-container-lowest text-on-surface border-outline-variant/30 flex items-center gap-2 rounded-full border py-2 ps-3 pe-4 shadow-lg"
              >
                <span className="bg-surface-container-high flex size-9 items-center justify-center rounded-full">
                  <MaterialIcon name={item.icon} size={20} />
                </span>
                <span className="text-label-md font-semibold whitespace-nowrap">
                  {item.label}
                </span>
              </button>
            ))}

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className={cn(
              "btn-press bg-primary text-primary-foreground flex size-16 items-center justify-center rounded-full shadow-2xl transition-transform",
              menuOpen && "rotate-45",
            )}
            aria-label={t("quickAdd")}
            aria-expanded={menuOpen}
          >
            <MaterialIcon name="add" size={32} />
          </button>
        </div>
      </div>

      {isAdmin && (
        <ChoreFormModal
          open={activeModal === "chore"}
          mode="create"
          onClose={closeModal}
          members={members}
          onSubmit={handleCreateChore}
          error={choreError}
        />
      )}

      <ShoppingAddModal
        open={activeModal === "shopping"}
        onClose={closeModal}
        onSubmit={handleCreateShopping}
        loading={shoppingLoading}
        error={shoppingError}
        memberCount={memberCount}
        listItems={shoppingListItems}
      />

      <ExpenseAddModal
        open={activeModal === "expense"}
        onClose={closeModal}
        onSubmit={handleCreateExpense}
        loading={expenseLoading}
        error={expenseError}
        isSoloHouse={isSoloHouse}
        members={members.map((m) => ({
          id: m.id,
          username: m.username,
        }))}
        payerId={payerId}
      />
    </AppQuickAddContext.Provider>
  );
}
