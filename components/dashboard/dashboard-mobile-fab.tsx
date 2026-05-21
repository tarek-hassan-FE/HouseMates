"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { MaterialIcon } from "@/components/design/material-icon";
import { ChoreFormModal } from "@/components/chores/chore-add-modal";
import { ShoppingAddModal } from "@/components/shopping/shopping-add-modal";
import { ExpenseAddModal } from "@/components/ledger/expense-add-modal";
import { createChoreAction } from "@/app/[locale]/(app)/chores/actions";
import { createShoppingItemAction } from "@/app/[locale]/(app)/shopping/actions";
import { createExpenseAction } from "@/app/[locale]/(app)/ledger/actions";
import { cn } from "@/lib/utils";
import type { Profile, ShoppingListItem } from "@/lib/database.types";

type ActiveModal = "chore" | "shopping" | "expense" | null;

type DashboardMobileFabProps = {
  isAdmin: boolean;
  isSoloHouse: boolean;
  memberCount: number;
  members: Profile[];
  payerId: string;
  shoppingListItems: ShoppingListItem[];
  onOpenShopping?: () => void;
};

export function DashboardMobileFab({
  isAdmin,
  isSoloHouse,
  memberCount,
  members,
  payerId,
  shoppingListItems,
  onOpenShopping,
}: DashboardMobileFabProps) {
  const router = useRouter();
  const t = useTranslations("dashboard");

  const [menuOpen, setMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [shoppingLoading, setShoppingLoading] = useState(false);
  const [expenseLoading, setExpenseLoading] = useState(false);
  const [choreError, setChoreError] = useState<string | null>(null);
  const [shoppingError, setShoppingError] = useState<string | null>(null);
  const [expenseError, setExpenseError] = useState<string | null>(null);

  function openModal(modal: ActiveModal) {
    setMenuOpen(false);
    if (modal === "shopping" && onOpenShopping) {
      onOpenShopping();
      return;
    }
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
    router.refresh();
  }

  async function handleCreateShopping(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setShoppingLoading(true);
    setShoppingError(null);
    const formData = new FormData(e.currentTarget);
    const result = await createShoppingItemAction(formData);
    setShoppingLoading(false);
    if (!result.success) {
      setShoppingError(result.error);
      return;
    }
    closeModal();
    e.currentTarget.reset();
    router.refresh();
  }

  async function handleCreateExpense(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setExpenseLoading(true);
    setExpenseError(null);
    const result = await createExpenseAction(new FormData(e.currentTarget));
    setExpenseLoading(false);
    if (!result.success) {
      setExpenseError(result.error);
      return;
    }
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

  const useExternalShopping = Boolean(onOpenShopping);

  return (
    <>
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
                onClick={() => openModal(item.id)}
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

      {!useExternalShopping && (
        <ShoppingAddModal
          open={activeModal === "shopping"}
          onClose={closeModal}
          onSubmit={handleCreateShopping}
          loading={shoppingLoading}
          error={shoppingError}
          memberCount={memberCount}
          listItems={shoppingListItems}
        />
      )}

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
    </>
  );
}
