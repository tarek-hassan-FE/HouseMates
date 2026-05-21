"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { MaterialIcon } from "@/components/design/material-icon";
import { OptionalImagePicker } from "@/components/shared/optional-image-picker";
import { Button } from "@/components/ui/button";
import type { Chore } from "@/lib/database.types";

type ChoreCompleteModalProps = {
  open: boolean;
  chore: Chore | null;
  mode: "submit" | "admin_complete";
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (imageFile: File | null) => void;
};

export function ChoreCompleteModal({
  open,
  chore,
  mode,
  loading,
  error,
  onClose,
  onConfirm,
}: ChoreCompleteModalProps) {
  const t = useTranslations("chores");
  const ta = useTranslations("attachments");
  const tc = useTranslations("common");
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    if (!open) setImageFile(null);
  }, [open]);

  if (!open || !chore) return null;

  return (
    <div
      className="bg-foreground/40 fixed inset-0 z-[60] flex items-end justify-center overscroll-contain p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal
      aria-labelledby="chore-complete-modal-title"
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
            <h2
              id="chore-complete-modal-title"
              className="text-headline-md font-bold"
            >
              {ta("markDone")}
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
          <p className="text-body-md mt-2 opacity-90">{chore.title}</p>
          {mode === "submit" && (
            <p className="text-label-sm mt-1 opacity-80">{t("awaitingApproval")}</p>
          )}
        </div>
        <div className="space-y-4 p-8">
          <OptionalImagePicker file={imageFile} onFileChange={setImageFile} />
          {error && (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="btn-press h-14 flex-1 rounded-2xl font-bold"
            >
              {tc("cancel")}
            </Button>
            <Button
              type="button"
              disabled={loading}
              onClick={() => onConfirm(imageFile)}
              className="btn-press bg-primary h-14 flex-1 rounded-2xl font-bold"
            >
              {loading ? tc("loading") : ta("confirmDone")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
