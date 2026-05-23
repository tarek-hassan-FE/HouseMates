"use client";

import Image from "next/image";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useMutation } from "@tanstack/react-query";
import { MaterialIcon } from "@/components/design/material-icon";
import { useConfirm } from "@/components/providers/confirm-provider";
import { toShopReward, type ShopReward } from "@/lib/house-rewards";
import type { HouseReward } from "@/lib/database.types";
import { redeemRewardAction } from "@/app/[locale]/(app)/rewards/actions";
import { cn } from "@/lib/utils";

type RewardsShopProps = {
  rewards: HouseReward[];
  totalXp: number;
};

export function RewardsShop({ rewards, totalXp }: RewardsShopProps) {
  const t = useTranslations("rewards");
  const router = useRouter();
  const confirm = useConfirm();
  const [celebratingId, setCelebratingId] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const shopRewards = rewards.map(toShopReward);

  const redeemMutation = useMutation({
    mutationFn: async (rewardId: string) => {
      const result = await redeemRewardAction(rewardId);
      if (!result.success) {
        throw new Error(result.error);
      }
    },
    onSuccess: (_data, rewardId) => {
      setCelebratingId(rewardId);
      setErrorCode(null);
      router.refresh();
      window.setTimeout(() => setCelebratingId(null), 2200);
    },
    onError: (err: Error) => {
      setErrorCode(err.message);
    },
  });

  async function handleRedeem(reward: ShopReward) {
    if (
      !(await confirm({
        title: t("confirmTitle"),
        message: t("confirmBody", {
          cost: reward.xpCost,
          reward: reward.title,
        }),
        confirmLabel: t("confirmRedeem"),
      }))
    )
      return;
    redeemMutation.mutate(reward.id);
  }

  if (shopRewards.length === 0) {
    return (
      <p className="text-label-md text-on-surface-variant border-outline-variant rounded-[1.5rem] border border-dashed p-8 text-center">
        {t("noRewardsAvailable")}
      </p>
    );
  }

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
        {shopRewards.map((reward) => {
          const canAfford = totalXp >= reward.xpCost;
          const isCelebrating = celebratingId === reward.id;
          const gradient =
            reward.gradient ?? "from-primary-fixed-dim to-primary";

          return (
            <div
              key={reward.id}
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
                className={`relative h-32 overflow-hidden rounded-xl bg-gradient-to-br ${gradient}`}
              >
                {reward.imageUrl ? (
                  <Image
                    src={reward.imageUrl}
                    alt={reward.title}
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
                  {t("costXp", { cost: reward.xpCost })}
                </div>
              </div>
              <div>
                <h5 className="text-body-lg font-bold">{reward.title}</h5>
                {reward.description && (
                  <p className="text-label-md text-on-surface-variant">
                    {reward.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                disabled={!canAfford || redeemMutation.isPending}
                onClick={() => handleRedeem(reward)}
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
    </>
  );
}
