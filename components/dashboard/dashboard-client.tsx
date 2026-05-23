"use client";

import { QuickActionGrid } from "@/components/dashboard/quick-action-grid";
import { useAppQuickAdd } from "@/components/app/app-quick-add";

export function DashboardQuickActions({
  pendingChoresCount,
  pendingApprovalsCount = 0,
}: {
  pendingChoresCount: number;
  pendingApprovalsCount?: number;
}) {
  const { openShopping } = useAppQuickAdd();

  return (
    <QuickActionGrid
      pendingChoresCount={pendingChoresCount}
      pendingApprovalsCount={pendingApprovalsCount}
      onAddShopping={openShopping}
    />
  );
}
