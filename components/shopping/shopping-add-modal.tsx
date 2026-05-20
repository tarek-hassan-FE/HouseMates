"use client";

import { useTranslations } from "next-intl";
import { MaterialIcon } from "@/components/design/material-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ShoppingAddModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  loading: boolean;
  error: string | null;
  memberCount: number;
};

export function ShoppingAddModal({
  open,
  onClose,
  onSubmit,
  loading,
  error,
  memberCount,
}: ShoppingAddModalProps) {
  const t = useTranslations("shopping");
  const tc = useTranslations("common");

  if (!open) return null;

  return (
    <div
      className="bg-foreground/40 fixed inset-0 z-[60] flex items-end justify-center overscroll-contain p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal
      aria-labelledby="shopping-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0"
        aria-label={tc("closeDialog")}
        onClick={onClose}
      />
      <div className="bg-surface-container-lowest relative max-h-[min(90dvh,100%)] w-full max-w-lg overflow-y-auto rounded-t-[2rem] shadow-2xl sm:rounded-[2rem]">
        <div className="bg-secondary text-on-secondary p-8">
          <div className="flex items-center justify-between">
            <h2
              id="shopping-modal-title"
              className="text-headline-md font-bold"
            >
              {t("addItem")}
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
          <p className="text-body-md mt-2 opacity-90">
            {memberCount > 1
              ? t("splitAmong", { count: memberCount })
              : t("splitSolo")}
          </p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 p-8">
          <div className="space-y-2">
            <Label htmlFor="shopping-title">{t("itemName")}</Label>
            <Input
              id="shopping-title"
              name="title"
              required
              placeholder={t("itemPlaceholder")}
              className="h-14 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shopping-amount">{t("amountEgp")}</Label>
            <Input
              id="shopping-amount"
              name="amount"
              type="text"
              inputMode="decimal"
              placeholder={t("amountPlaceholder")}
              required
              className="h-14 rounded-xl"
            />
          </div>
          {error && (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          )}
          <Button
            type="submit"
            disabled={loading}
            className="btn-press bg-secondary text-on-secondary h-14 w-full rounded-2xl font-bold"
          >
            {loading ? t("saving") : t("addItemBtn")}
          </Button>
        </form>
      </div>
    </div>
  );
}
