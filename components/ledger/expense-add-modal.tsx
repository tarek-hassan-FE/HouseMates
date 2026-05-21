"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { MaterialIcon } from "@/components/design/material-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { centsToDisplay, parseAmountToCents } from "@/lib/money";
import { OptionalImagePicker } from "@/components/shared/optional-image-picker";
import {
  equalShareStringsFromCents,
  equalSharesAmongMembers,
  SHARE_FIELD_PREFIX,
  validateExactShares,
} from "@/lib/split-exact";
type Member = {
  id: string;
  username: string;
};

type SplitMode = "equal" | "exact";

type ExpenseAddModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (
    e: React.FormEvent<HTMLFormElement>,
    imageFile: File | null,
  ) => void;
  loading: boolean;
  error: string | null;
  isSoloHouse: boolean;
  members: Member[];
  payerId: string;
};

export function ExpenseAddModal({
  open,
  onClose,
  onSubmit,
  loading,
  error,
  isSoloHouse,
  members,
  payerId,
}: ExpenseAddModalProps) {
  const t = useTranslations("ledger");
  const te = useTranslations("errors");
  const tc = useTranslations("common");
  const locale = useLocale();

  const [splitMode, setSplitMode] = useState<SplitMode>("equal");
  const [amount, setAmount] = useState("");
  const [shares, setShares] = useState<Record<string, string>>({});
  const [clientError, setClientError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const memberIds = useMemo(
    () => [...members].sort((a, b) => a.id.localeCompare(b.id)).map((m) => m.id),
    [members],
  );

  const amountCents = parseAmountToCents(amount);

  const allocatedCents = useMemo(() => {
    if (splitMode !== "exact" || amountCents === null) return null;
    let sum = 0;
    for (const id of memberIds) {
      const cents = parseAmountToCents(shares[id] ?? "");
      if (cents === null) return null;
      sum += cents;
    }
    return sum;
  }, [splitMode, amountCents, shares, memberIds]);

  const allocationMismatch =
    splitMode === "exact" &&
    amountCents !== null &&
    allocatedCents !== null &&
    allocatedCents !== amountCents;

  useEffect(() => {
    if (!open) {
      setSplitMode("equal");
      setAmount("");
      setShares({});
      setClientError(null);
      setImageFile(null);
    }
  }, [open]);

  function applyEqualShares() {
    if (amountCents === null || amountCents <= 0) return;
    const centsMap = equalSharesAmongMembers(amountCents, memberIds, payerId);
    setShares(equalShareStringsFromCents(centsMap));
  }

  function handleSplitModeChange(mode: SplitMode) {
    setSplitMode(mode);
    setClientError(null);
    if (mode === "exact" && amountCents !== null && amountCents > 0) {
      applyEqualShares();
    }
  }

  function handleAmountChange(value: string) {
    setAmount(value);
    setClientError(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    setClientError(null);
    if (splitMode === "exact" && !isSoloHouse) {
      const total = parseAmountToCents(amount);
      if (total === null || total <= 0) {
        setClientError(te("invalidAmount"));
        e.preventDefault();
        return;
      }
      const validation = validateExactShares(shares, memberIds, total, payerId);
      if (!validation.ok) {
        setClientError(te(validation.error));
        e.preventDefault();
        return;
      }
    }
    onSubmit(e, imageFile);
  }

  const displayError = clientError ?? error;

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
          <p className="text-body-md mt-2 opacity-90">
            {isSoloHouse ? t("soloHouseAddHint") : t("splitFairly")}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-8">
          <input
            type="hidden"
            name="strategy"
            value={splitMode === "exact" && !isSoloHouse ? "exact" : "equal"}
          />
          <div className="space-y-2">
            <Label htmlFor="title">{tc("title")}</Label>
            <Input
              id="title"
              name="title"
              required
              className="h-14 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">{t("amountEgp")}</Label>
            <Input
              id="amount"
              name="amount"
              type="text"
              inputMode="decimal"
              placeholder={t("amountPlaceholder")}
              required
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="h-14 rounded-xl"
            />
          </div>

          {!isSoloHouse && members.length > 1 && (
            <div className="space-y-3">
              <p className="text-label-md text-on-surface-variant font-semibold">
                {t("split")}
              </p>
              <div className="bg-surface-container-low flex gap-1 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => handleSplitModeChange("equal")}
                  className={`text-label-md btn-press flex-1 rounded-lg px-3 py-2.5 font-semibold transition-colors ${
                    splitMode === "equal"
                      ? "bg-primary text-primary-foreground"
                      : "text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  {t("splitEqual")}
                </button>
                <button
                  type="button"
                  onClick={() => handleSplitModeChange("exact")}
                  className={`text-label-md btn-press flex-1 rounded-lg px-3 py-2.5 font-semibold transition-colors ${
                    splitMode === "exact"
                      ? "bg-primary text-primary-foreground"
                      : "text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  {t("splitExact")}
                </button>
              </div>

              {splitMode === "exact" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-label-sm text-on-surface-variant">
                      {t("splitExact")}
                    </p>
                    <button
                      type="button"
                      onClick={applyEqualShares}
                      disabled={amountCents === null || amountCents <= 0}
                      className="text-label-sm text-primary font-bold hover:underline disabled:opacity-50"
                    >
                      {t("applyEqualSplit")}
                    </button>
                  </div>
                  <ul className="space-y-2">
                    {members.map((member) => (
                      <li key={member.id} className="space-y-1">
                        <Label htmlFor={`share-${member.id}`}>
                          {member.id === payerId
                            ? t("yourShare")
                            : t("memberShare", { name: member.username })}
                        </Label>
                        <Input
                          id={`share-${member.id}`}
                          name={`${SHARE_FIELD_PREFIX}${member.id}`}
                          type="text"
                          inputMode="decimal"
                          required
                          value={shares[member.id] ?? ""}
                          onChange={(e) =>
                            setShares((prev) => ({
                              ...prev,
                              [member.id]: e.target.value,
                            }))
                          }
                          className="h-12 rounded-xl"
                        />
                      </li>
                    ))}
                  </ul>
                  {amountCents !== null && amountCents > 0 && (
                    <p
                      className={`text-label-sm rounded-xl p-3 ${
                        allocationMismatch
                          ? "bg-error-container text-on-error-container"
                          : "bg-surface-container-low text-on-surface-variant"
                      }`}
                      role={allocationMismatch ? "alert" : undefined}
                    >
                      {t("allocatedTotal", {
                        allocated:
                          allocatedCents !== null
                            ? centsToDisplay(allocatedCents, { locale })
                            : tc("dash"),
                        total: centsToDisplay(amountCents, { locale }),
                      })}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {isSoloHouse && (
            <p className="text-label-sm text-on-surface-variant rounded-xl bg-surface-container-low p-3">
              {t("soloHouseAddHint")}
            </p>
          )}

          <OptionalImagePicker file={imageFile} onFileChange={setImageFile} />

          {displayError && (
            <p className="text-destructive text-sm" role="alert">
              {displayError}
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
