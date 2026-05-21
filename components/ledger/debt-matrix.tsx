"use client";

import { useLocale, useTranslations } from "next-intl";
import { AvatarRing } from "@/components/design/avatar-ring";
import { centsToDisplay } from "@/lib/money";

export type DebtRow = {
  otherUserId: string;
  otherUsername: string;
  avatar_url?: string | null;
  amountCents: number;
  direction: "you_owe" | "owes_you";
};

export function DebtMatrix({
  rows,
  isSoloHouse,
  hasUnsettledDebts,
  onSettleAll,
  onSettleMember,
  settling,
  settlingMemberId,
  canRemindMembers,
  remindDisabled,
  remindCooldownHint,
  onRemindMembers,
  reminding,
}: {
  rows: DebtRow[];
  isSoloHouse: boolean;
  hasUnsettledDebts: boolean;
  onSettleAll: () => void;
  onSettleMember: (otherUserId: string) => void;
  settling: boolean;
  settlingMemberId: string | null;
  canRemindMembers: boolean;
  remindDisabled: boolean;
  remindCooldownHint?: string | null;
  onRemindMembers: () => void;
  reminding: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations("ledger");

  return (
    <div className="border-outline-variant/20 bg-surface-container-lowest flex flex-col gap-3 rounded-3xl border p-4 shadow-sm">
      <h3 className="text-label-md text-on-surface px-1">{t("whoOwesWho")}</h3>
      <div className="max-h-40 space-y-2 overflow-y-auto pe-1">
        {isSoloHouse && (
          <p className="text-label-sm text-on-surface-variant px-2 py-4">
            {t("soloHouseMatrixHint")}
          </p>
        )}
        {!isSoloHouse && rows.length === 0 && (
          <p className="text-label-sm text-on-surface-variant px-2 py-4">
            {t("allClear")}
          </p>
        )}
        {rows.map((row) => (
          <div
            key={row.otherUserId}
            className="bg-surface-container-low/50 hover:bg-surface-container flex flex-col gap-1 rounded-2xl p-3 transition-colors sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-center gap-3">
              <AvatarRing
                src={row.avatar_url}
                name={row.otherUsername}
                size="sm"
              />
              <span className="text-label-md text-on-surface truncate font-medium">
                {row.otherUsername}
              </span>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
              <span
                className={
                  row.direction === "you_owe"
                    ? "text-label-md text-error"
                    : "text-label-md text-tertiary-container"
                }
              >
                {row.direction === "you_owe"
                  ? t("youOweAmount", {
                      amount: centsToDisplay(row.amountCents, { locale }),
                    })
                  : t("owesYouAmount", {
                      amount: centsToDisplay(row.amountCents, { locale }),
                    })}
              </span>
              <button
                type="button"
                disabled={
                  settling || settlingMemberId === row.otherUserId || reminding
                }
                onClick={() => onSettleMember(row.otherUserId)}
                className="text-label-sm text-primary font-bold hover:underline disabled:opacity-50"
              >
                {t("settleMember")}
              </button>
            </div>
          </div>
        ))}
      </div>
      {!isSoloHouse && hasUnsettledDebts && (
        <button
          type="button"
          disabled={settling}
          onClick={onSettleAll}
          className="text-label-sm text-primary w-full py-2 text-center font-bold hover:underline disabled:opacity-50"
        >
          {t("settleAll")}
        </button>
      )}
      {!isSoloHouse && canRemindMembers && (
        <div className="flex flex-col gap-1">
          <button
            type="button"
            disabled={remindDisabled || reminding || settling}
            onClick={onRemindMembers}
            className="text-label-sm text-secondary w-full py-2 text-center font-bold hover:underline disabled:opacity-50"
          >
            {t("remindMembers")}
          </button>
          {remindCooldownHint && (
            <p className="text-label-sm text-on-surface-variant px-1 text-center">
              {remindCooldownHint}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
