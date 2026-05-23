"use client";

import { useTranslations } from "next-intl";
import { MaterialIcon } from "@/components/design/material-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { HouseReward } from "@/lib/database.types";

const ICON_OPTIONS = [
  "redeem",
  "movie",
  "queue_music",
  "weekend",
  "delivery_dining",
  "block",
  "countertops",
  "delete",
  "celebration",
  "star",
  "favorite",
  "local_pizza",
] as const;

type RewardFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  reward?: HouseReward | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  error: string | null;
};

export function RewardFormModal({
  open,
  mode,
  reward,
  onClose,
  onSubmit,
  error,
}: RewardFormModalProps) {
  const t = useTranslations("rewards");
  const tc = useTranslations("common");

  if (!open) return null;

  const isEdit = mode === "edit" && reward != null;
  const isPreset = isEdit && reward.preset_key != null;

  return (
    <div
      className="bg-foreground/40 fixed inset-0 z-[60] flex items-end justify-center overscroll-contain p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal
      aria-labelledby="reward-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0"
        aria-label={tc("closeDialog")}
        onClick={onClose}
      />
      <div className="bg-surface-container-lowest relative max-h-[min(90dvh,100%)] w-full max-w-lg overflow-y-auto rounded-t-[2rem] shadow-2xl sm:rounded-[2rem]">
        <div className="bg-secondary text-on-secondary flex items-center justify-between p-8">
          <h2 id="reward-modal-title" className="text-headline-md font-bold">
            {isEdit ? t("editReward") : t("addReward")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="btn-press rounded-full p-1"
            aria-label={tc("close")}
          >
            <MaterialIcon name="close" />
          </button>
        </div>
        <form
          key={isEdit ? reward.id : "create"}
          onSubmit={onSubmit}
          className="space-y-4 p-8"
        >
          {isPreset && (
            <p className="text-label-md text-on-surface-variant bg-surface-container-low rounded-xl px-4 py-3">
              {t("presetBadge")}: {reward.preset_key}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="title">{t("rewardTitle")}</Label>
            <Input
              id="title"
              name="title"
              required
              defaultValue={reward?.title ?? ""}
              className="h-14 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t("rewardDescription")}</Label>
            <Input
              id="description"
              name="description"
              defaultValue={reward?.description ?? ""}
              className="h-14 rounded-xl"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="xp_cost">{t("xpCost")}</Label>
              <Input
                id="xp_cost"
                name="xp_cost"
                type="number"
                min={1}
                required
                defaultValue={reward?.xp_cost ?? 50}
                className="h-14 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="icon">{t("rewardIcon")}</Label>
              <select
                id="icon"
                name="icon"
                className="border-input h-14 w-full rounded-xl border bg-transparent px-3 text-sm"
                defaultValue={reward?.icon ?? "redeem"}
              >
                {ICON_OPTIONS.map((icon) => (
                  <option key={icon} value={icon}>
                    {icon}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="gradient">{t("rewardGradient")}</Label>
            <Input
              id="gradient"
              name="gradient"
              placeholder="from-primary to-primary-container"
              defaultValue={reward?.gradient ?? ""}
              className="h-14 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="image_url">{t("rewardImageUrl")}</Label>
            <Input
              id="image_url"
              name="image_url"
              type="url"
              defaultValue={reward?.image_url ?? ""}
              className="h-14 rounded-xl"
            />
          </div>
          {isEdit && (
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                name="is_enabled"
                value="on"
                defaultChecked={reward.is_enabled}
                className="border-input size-4 rounded"
              />
              <span className="text-sm font-medium">{t("rewardEnabled")}</span>
            </label>
          )}
          {!isEdit && (
            <input type="hidden" name="is_enabled" value="on" />
          )}
          <input
            type="hidden"
            name="sort_order"
            value={reward?.sort_order ?? 99}
          />
          {error && (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          )}
          <Button
            type="submit"
            className="btn-press bg-primary h-14 w-full rounded-2xl font-bold"
          >
            {isEdit ? t("saveReward") : t("createReward")}
          </Button>
        </form>
      </div>
    </div>
  );
}
