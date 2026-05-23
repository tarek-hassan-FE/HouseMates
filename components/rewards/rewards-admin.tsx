"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { MaterialIcon } from "@/components/design/material-icon";
import { RewardFormModal } from "@/components/rewards/reward-form-modal";
import { useConfirm } from "@/components/providers/confirm-provider";
import {
  createHouseRewardAction,
  deleteHouseRewardAction,
  toggleHouseRewardAction,
  updateHouseRewardAction,
} from "@/app/[locale]/(app)/rewards/actions";
import type { HouseReward } from "@/lib/database.types";
import { cn } from "@/lib/utils";

type RewardsAdminProps = {
  rewards: HouseReward[];
};

export function RewardsAdmin({ rewards }: RewardsAdminProps) {
  const t = useTranslations("rewards");
  const router = useRouter();
  const confirm = useConfirm();
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editingReward, setEditingReward] = useState<HouseReward | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  function closeForm() {
    setFormMode(null);
    setEditingReward(null);
    setFormError(null);
  }

  function openCreate() {
    setEditingReward(null);
    setFormMode("create");
    setFormError(null);
  }

  function openEdit(reward: HouseReward) {
    setEditingReward(reward);
    setFormMode("edit");
    setFormError(null);
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const result = await createHouseRewardAction(new FormData(e.currentTarget));
    if (!result.success) {
      setFormError(result.error);
      return;
    }
    closeForm();
    router.refresh();
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingReward) return;
    setFormError(null);
    const result = await updateHouseRewardAction(
      editingReward.id,
      new FormData(e.currentTarget),
    );
    if (!result.success) {
      setFormError(result.error);
      return;
    }
    closeForm();
    router.refresh();
  }

  async function handleToggle(reward: HouseReward) {
    setActionError(null);
    const result = await toggleHouseRewardAction(
      reward.id,
      !reward.is_enabled,
    );
    if (!result.success) {
      setActionError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleDelete(reward: HouseReward) {
    const isPreset = reward.preset_key != null;
    if (
      !(await confirm({
        title: t("deleteReward"),
        message: isPreset ? t("confirmDisablePreset") : t("confirmDelete"),
        confirmLabel: t("deleteReward"),
        destructive: true,
      }))
    ) {
      return;
    }
    setActionError(null);
    const result = await deleteHouseRewardAction(reward.id);
    if (!result.success) {
      setActionError(result.error);
      return;
    }
    router.refresh();
  }

  const sorted = [...rewards].sort(
    (a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title),
  );

  return (
    <section className="mb-10 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 px-2">
        <h3 className="text-headline-md text-on-surface flex items-center gap-2">
          <MaterialIcon name="tune" className="text-primary" />
          {t("manageRewards")}
        </h3>
        <button
          type="button"
          onClick={openCreate}
          className="btn-press bg-primary text-primary-foreground flex items-center gap-2 rounded-xl px-4 py-2 text-label-lg font-bold"
        >
          <MaterialIcon name="add" size={20} />
          {t("addReward")}
        </button>
      </div>

      {actionError && (
        <p className="text-destructive text-sm px-2" role="alert">
          {actionError}
        </p>
      )}

      <ul className="space-y-2">
        {sorted.map((reward) => (
          <li
            key={reward.id}
            className={cn(
              "bg-surface-container-lowest border-outline-variant/10 flex items-center gap-3 rounded-2xl border p-4",
              !reward.is_enabled && "opacity-60",
            )}
          >
            <div className="bg-secondary-container/30 text-secondary flex size-10 shrink-0 items-center justify-center rounded-xl">
              <MaterialIcon name={reward.icon} size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-body-md text-on-surface font-medium truncate">
                {reward.title}
              </p>
              <p className="text-label-sm text-on-surface-variant">
                {t("costXp", { cost: reward.xp_cost })}
                {reward.preset_key
                  ? ` · ${t("presetBadge")}`
                  : ` · ${t("customReward")}`}
                {!reward.is_enabled && ` · ${t("disabled")}`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => openEdit(reward)}
                className="btn-press text-primary rounded-lg p-2"
                aria-label={t("editReward")}
              >
                <MaterialIcon name="edit" size={20} />
              </button>
              <button
                type="button"
                onClick={() => handleToggle(reward)}
                className="btn-press text-on-surface-variant rounded-lg p-2"
                aria-label={
                  reward.is_enabled ? t("disableReward") : t("enableReward")
                }
              >
                <MaterialIcon
                  name={reward.is_enabled ? "visibility_off" : "visibility"}
                  size={20}
                />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(reward)}
                className="btn-press text-destructive rounded-lg p-2"
                aria-label={t("deleteReward")}
              >
                <MaterialIcon name="delete" size={20} />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <RewardFormModal
        open={formMode !== null}
        mode={formMode === "edit" ? "edit" : "create"}
        reward={editingReward}
        onClose={closeForm}
        onSubmit={formMode === "edit" ? handleUpdate : handleCreate}
        error={formError}
      />
    </section>
  );
}
