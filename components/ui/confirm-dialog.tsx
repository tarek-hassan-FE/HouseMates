"use client";

import { useEffect, useId } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export type ConfirmDialogProps = {
  open: boolean;
  message: string;
  title?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  message,
  title,
  confirmLabel,
  cancelLabel,
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const tc = useTranslations("common");
  const titleId = useId();
  const resolvedCancelLabel = cancelLabel ?? tc("cancel");

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="bg-foreground/40 fixed inset-0 z-[60] flex items-end justify-center overscroll-contain p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="absolute inset-0"
        aria-label={tc("closeDialog")}
        onClick={onCancel}
      />
      <div className="bg-surface-container-lowest relative z-10 w-full max-w-md rounded-[1.5rem] p-6 shadow-xl">
        {title ? (
          <h3
            id={titleId}
            className="text-headline-md text-on-surface mb-2"
          >
            {title}
          </h3>
        ) : (
          <p id={titleId} className="text-headline-md text-on-surface mb-6">
            {message}
          </p>
        )}
        {title && (
          <p className="text-body-md text-on-surface-variant mb-6">{message}</p>
        )}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={loading}
            onClick={onCancel}
          >
            {resolvedCancelLabel}
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            className="flex-1"
            disabled={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
