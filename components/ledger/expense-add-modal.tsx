"use client";

import { useTranslations } from "next-intl";
import { MaterialIcon } from "@/components/design/material-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ExpenseStrategy } from "@/lib/database.types";

type ExpenseAddModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  loading: boolean;
  error: string | null;
};

export function ExpenseAddModal({
  open,
  onClose,
  onSubmit,
  loading,
  error,
}: ExpenseAddModalProps) {
  const t = useTranslations("ledger");
  const tc = useTranslations("common");

  if (!open) return null;

  return (
    <div
      className="bg-foreground/40 fixed inset-0 z-[60] flex items-end justify-center overscroll-contain p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal
      aria-labelledby="expense-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0"
        aria-label={tc("closeDialog")}
        onClick={onClose}
      />
      <div className="bg-surface-container-lowest relative max-h-[min(90dvh,100%)] w-full max-w-lg overflow-y-auto rounded-t-[2rem] shadow-2xl sm:rounded-[2rem]">
        <div className="bg-primary text-primary-foreground p-8">
          <div className="flex items-center justify-between">
            <h2 id="expense-modal-title" className="text-headline-md font-bold">
              {t("logExpense")}
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
          <p className="text-body-md mt-2 opacity-90">{t("splitFairly")}</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 p-8">
          <div className="space-y-2">
            <Label htmlFor="title">{tc("title")}</Label>
            <Input
              id="title"
              name="title"
              required
              className="h-14 rounded-xl"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amount">{t("amountEgp")}</Label>
              <Input
                id="amount"
                name="amount"
                type="text"
                inputMode="decimal"
                placeholder={t("amountPlaceholder")}
                required
                className="h-14 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="strategy">{t("split")}</Label>
              <select
                id="strategy"
                name="strategy"
                className="border-input h-14 w-full rounded-xl border bg-transparent px-3 text-sm"
                defaultValue="equal"
              >
                {(["equal", "exact"] as ExpenseStrategy[]).map((s) => (
                  <option key={s} value={s}>
                    {s === "equal" ? t("splitEqual") : t("splitExact")}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {error && (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          )}
          <Button
            type="submit"
            disabled={loading}
            className="btn-press bg-primary h-14 w-full rounded-2xl font-bold"
          >
            {loading ? t("saving") : t("addExpenseBtn")}
          </Button>
        </form>
      </div>
    </div>
  );
}
