"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { MaterialIcon } from "@/components/design/material-icon";

export function QuickActionGrid({
  pendingChoresCount,
  onAddShopping,
}: {
  pendingChoresCount: number;
  onAddShopping?: () => void;
}) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");

  return (
    <div className="flex h-full flex-col gap-gutter">
      <h3 className="text-headline-md text-on-surface">{t("quickActions")}</h3>
      <div className="grid flex-grow grid-cols-1 gap-6 md:grid-cols-2">
        <Link
          href="/ledger"
          className="group border-outline-variant bg-surface-container-lowest btn-press flex flex-col items-start gap-4 rounded-3xl border p-6 text-start transition-all hover:border-primary hover:shadow-xl"
        >
          <div className="bg-primary-fixed text-primary flex size-14 items-center justify-center rounded-2xl transition-transform group-hover:scale-110">
            <MaterialIcon name="receipt_long" size={32} />
          </div>
          <div>
            <h4 className="text-headline-md text-on-surface">{t("logExpense")}</h4>
            <p className="text-body-md text-on-surface-variant">
              {t("logExpenseDesc")}
            </p>
          </div>
          <span className="text-label-md text-primary mt-auto flex items-center gap-1 font-bold">
            {t("startNow")}
            <MaterialIcon
              name="arrow_forward"
              size={16}
              className="rtl:-scale-x-100"
            />
          </span>
        </Link>
        <Link
          href="/chores"
          className="group border-outline-variant bg-surface-container-lowest btn-press flex flex-col items-start gap-4 rounded-3xl border p-6 text-start transition-all hover:border-tertiary hover:shadow-xl"
        >
          <div className="bg-tertiary-fixed-dim/20 text-tertiary flex size-14 items-center justify-center rounded-2xl transition-transform group-hover:scale-110">
            <MaterialIcon name="task_alt" size={32} />
          </div>
          <div>
            <h4 className="text-headline-md text-on-surface">
              {t("completeChore")}
            </h4>
            <p className="text-body-md text-on-surface-variant">
              {pendingChoresCount > 0
                ? t("choresWaiting", { count: pendingChoresCount })
                : t("allCaughtUp")}
            </p>
          </div>
          <span className="text-label-md text-tertiary mt-auto flex items-center gap-1 font-bold">
            {t("viewList")}
            <MaterialIcon
              name="arrow_forward"
              size={16}
              className="rtl:-scale-x-100"
            />
          </span>
        </Link>
        {onAddShopping ? (
          <button
            type="button"
            onClick={onAddShopping}
            className="group border-outline-variant bg-surface-container-lowest btn-press md:col-span-2 flex items-center gap-6 rounded-3xl border p-6 text-start transition-all hover:border-secondary hover:shadow-xl"
          >
            <div className="bg-secondary-fixed text-on-secondary-fixed flex size-14 shrink-0 items-center justify-center rounded-2xl transition-transform group-hover:scale-110">
              <MaterialIcon name="shopping_cart" size={32} />
            </div>
            <div className="min-w-0 flex-grow">
              <h4 className="text-headline-md text-on-surface">
                {t("addShopping")}
              </h4>
              <p className="text-body-md text-on-surface-variant">
                {t("addShoppingDesc")}
              </p>
            </div>
            <MaterialIcon
              name="chevron_right"
              className="text-on-surface-variant shrink-0 rtl:-scale-x-100"
            />
          </button>
        ) : (
          <button
            type="button"
            disabled
            aria-disabled
            title={tc("comingSoon")}
            className="group border-outline-variant bg-surface-container-lowest md:col-span-2 flex cursor-not-allowed items-center gap-6 rounded-3xl border p-6 text-start opacity-80"
          >
            <div className="bg-secondary-fixed text-on-secondary-fixed flex size-14 shrink-0 items-center justify-center rounded-2xl">
              <MaterialIcon name="shopping_cart" size={32} />
            </div>
            <div className="min-w-0 flex-grow">
              <h4 className="text-headline-md text-on-surface">
                {t("addShopping")}
              </h4>
              <p className="text-body-md text-on-surface-variant">
                {t("addShoppingDesc")}
              </p>
            </div>
            <MaterialIcon
              name="chevron_right"
              className="text-on-surface-variant shrink-0 rtl:-scale-x-100"
            />
          </button>
        )}
      </div>
    </div>
  );
}
