"use client";

import Image from "next/image";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useMutation } from "@tanstack/react-query";
import { MaterialIcon } from "@/components/design/material-icon";
import { Button } from "@/components/ui/button";
import {
  REWARDS_CATALOG,
  type RewardCatalogEntry,
  type RewardKey,
} from "@/lib/rewards-catalog";
import { redeemRewardAction } from "@/app/[locale]/(app)/rewards/actions";
import { cn } from "@/lib/utils";

type RewardsShopProps = {
  totalXp: number;
  onRedeemed: (xpSpent: number) => void;
};

export function RewardsShop({ totalXp, onRedeemed }: RewardsShopProps) {
  const t = useTranslations("rewards");
  const tc = useTranslations("common");
  const router = useRouter();
  const [confirmReward, setConfirmReward] = useState<RewardCatalogEntry | null>(
    null,
  );
  const [celebratingKey, setCelebratingKey] = useState<RewardKey | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const redeemMutation = useMutation({
    mutationFn: async (key: RewardKey) => {
      const result = await redeemRewardAction(key);
      if (!result.success) {
        throw new Error(result.error);
      }
    },
    onSuccess: (_data, key) => {
      const entry = REWARDS_CATALOG.find((r) => r.key === key);
      setConfirmReward(null);
      setCelebratingKey(key);
      setErrorCode(null);
      if (entry) onRedeemed(entry.xp);
      router.refresh();
      window.setTimeout(() => setCelebratingKey(null), 2200);
    },
    onError: (err: Error) => {
      setErrorCode(err.message);
    },
  });

  return (
    <>
      {errorCode && errorCode !== "insufficientXp" && (
        <p className="text-destructive text-sm px-2 mb-2" role="alert">
          {errorCode === "invalidReward"
            ? t("invalidReward")
            : t("redeemFailed")}
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {REWARDS_CATALOG.map((reward) => {
          const canAfford = totalXp >= reward.xp;
          const isCelebrating = celebratingKey === reward.key;

          return (
            <div
              key={reward.key}
              className={cn(
                "border-outline-variant/10 bg-surface-container-lowest group relative flex flex-col gap-4 rounded-[1.5rem] border p-4 shadow-sm",
                isCelebrating && "border-tertiary-fixed-dim",
              )}
            >
              {isCelebrating && (
                <div className="bg-tertiary-container text-on-tertiary-container celebrate-pop absolute inset-0 z-10 flex items-center justify-center rounded-[1.5rem] px-4 font-bold">
                  <MaterialIcon
                    name="celebration"
                    className="me-2"
                    size={28}
                  />
                  {t("redeemSuccess")}
                </div>
              )}
              <div
                className={`relative h-32 overflow-hidden rounded-xl bg-gradient-to-br ${reward.gradient}`}
              >
                {reward.image ? (
                  <Image
                    src={reward.image}
                    alt={t(reward.titleKey)}
                    fill
                    className="object-cover opacity-80 transition-transform duration-700 group-hover:scale-110"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <MaterialIcon
                      name={reward.icon}
                      size={56}
                      className="text-on-primary opacity-90"
                    />
                  </div>
                )}
                <div className="bg-secondary-container text-on-secondary-container absolute top-2 end-2 rounded-full px-3 py-1 text-label-md font-bold shadow-sm">
                  {t("costXp", { cost: reward.xp })}
                </div>
              </div>
              <div>
                <h5 className="text-body-lg font-bold">{t(reward.titleKey)}</h5>
                <p className="text-label-md text-on-surface-variant">
                  {t(reward.descKey)}
                </p>
              </div>
              <button
                type="button"
                disabled={!canAfford || redeemMutation.isPending}
                onClick={() => setConfirmReward(reward)}
                className={cn(
                  "btn-press w-full rounded-xl py-3 font-bold transition-all",
                  canAfford
                    ? "bg-primary text-primary-foreground hover:bg-primary-container"
                    : "bg-surface-container-highest text-on-surface-variant cursor-not-allowed opacity-70",
                )}
                title={!canAfford ? t("insufficientXp") : undefined}
              >
                {t("redeem")}
              </button>
            </div>
          );
        })}
      </div>

      {confirmReward && (
        <div
          className="bg-foreground/40 fixed inset-0 z-[60] flex items-end justify-center overscroll-contain p-4 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal
          aria-labelledby="redeem-modal-title"
        >
          <button
            type="button"
            className="absolute inset-0"
            aria-label={tc("closeDialog")}
            onClick={() => setConfirmReward(null)}
          />
          <div className="bg-surface-container-lowest relative z-10 w-full max-w-md rounded-[1.5rem] p-6 shadow-xl">
            <h3
              id="redeem-modal-title"
              className="text-headline-md text-on-surface mb-2"
            >
              {t("confirmTitle")}
            </h3>
            <p className="text-body-md text-on-surface-variant mb-6">
              {t("confirmBody", {
                cost: confirmReward.xp,
                reward: t(confirmReward.titleKey),
              })}
            </p>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setConfirmReward(null)}
              >
                {t("cancel")}
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={redeemMutation.isPending}
                onClick={() =>
                  redeemMutation.mutate(confirmReward.key as RewardKey)
                }
              >
                {redeemMutation.isPending ? t("redeeming") : t("confirmRedeem")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
