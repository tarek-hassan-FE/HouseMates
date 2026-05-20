"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { QuickActionGrid } from "@/components/dashboard/quick-action-grid";
import { ShoppingAddModal } from "@/components/shopping/shopping-add-modal";
import { createShoppingItemAction } from "@/app/[locale]/(app)/ledger/actions";

export function DashboardQuickActions({
  pendingChoresCount,
  pendingApprovalsCount = 0,
  memberCount,
}: {
  pendingChoresCount: number;
  pendingApprovalsCount?: number;
  memberCount: number;
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const result = await createShoppingItemAction(formData);
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setModalOpen(false);
    e.currentTarget.reset();
    router.refresh();
  }

  return (
    <>
      <QuickActionGrid
        pendingChoresCount={pendingChoresCount}
        pendingApprovalsCount={pendingApprovalsCount}
        onAddShopping={() => setModalOpen(true)}
      />
      <ShoppingAddModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setError(null);
        }}
        onSubmit={handleSubmit}
        loading={loading}
        error={error}
        memberCount={memberCount}
      />
    </>
  );
}
