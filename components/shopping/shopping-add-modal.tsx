"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MaterialIcon } from "@/components/design/material-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ShoppingListItem } from "@/lib/database.types";

const OTHER_VALUE = "__other__";

type ShoppingAddModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  loading: boolean;
  error: string | null;
  memberCount: number;
  listItems: ShoppingListItem[];
};

export function ShoppingAddModal({
  open,
  onClose,
  onSubmit,
  loading,
  error,
  memberCount,
  listItems,
}: ShoppingAddModalProps) {
  const t = useTranslations("shopping");
  const tc = useTranslations("common");
  const hasList = listItems.length > 0;
  const [selection, setSelection] = useState(
    hasList ? listItems[0].id : OTHER_VALUE,
  );

  if (!open) return null;

  const showOtherInput = !hasList || selection === OTHER_VALUE;
  const selectedItem = listItems.find((item) => item.id === selection);

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
        <div className="bg-secondary-fixed text-on-secondary-fixed p-8">
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
          {hasList && (
            <div className="space-y-2">
              <Label htmlFor="shopping-pick">{t("pickFromList")}</Label>
              <select
                id="shopping-pick"
                name="listItemId"
                value={selection}
                onChange={(e) => setSelection(e.target.value)}
                className="border-input bg-background text-foreground h-14 w-full rounded-xl border px-4 text-base"
              >
                {listItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
                <option value={OTHER_VALUE}>{t("otherOption")}</option>
              </select>
            </div>
          )}

          {showOtherInput ? (
            <div className="space-y-2">
              <Label htmlFor="shopping-title">{t("itemName")}</Label>
              <Input
                id="shopping-title"
                name="title"
                required={!hasList || selection === OTHER_VALUE}
                placeholder={t("itemPlaceholder")}
                className="h-14 rounded-xl"
              />
            </div>
          ) : (
            <p className="text-on-surface text-body-md font-semibold">
              {selectedItem?.title}
            </p>
          )}

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
            className="btn-press bg-secondary-fixed text-on-secondary-fixed hover:bg-secondary-fixed-dim h-14 w-full rounded-2xl font-bold"
          >
            {loading ? t("saving") : t("addItemBtn")}
          </Button>
        </form>
      </div>
    </div>
  );
}
