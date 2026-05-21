"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { MaterialIcon } from "@/components/design/material-icon";

type ImageViewerDialogProps = {
  open: boolean;
  imageUrl: string | null;
  title?: string;
  onClose: () => void;
};

export function ImageViewerDialog({
  open,
  imageUrl,
  title,
  onClose,
}: ImageViewerDialogProps) {
  const tc = useTranslations("common");
  const t = useTranslations("attachments");

  if (!open || !imageUrl) return null;

  return (
    <div
      className="bg-foreground/40 fixed inset-0 z-[70] flex items-center justify-center p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal
      aria-label={title ?? t("viewPhoto")}
    >
      <button
        type="button"
        className="absolute inset-0"
        aria-label={tc("closeDialog")}
        onClick={onClose}
      />
      <div className="bg-surface-container-lowest relative max-h-[90dvh] w-full max-w-lg overflow-hidden rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between gap-2 border-b border-outline-variant/20 px-4 py-3">
          <p className="text-title-md font-bold">{title ?? t("viewPhoto")}</p>
          <button
            type="button"
            onClick={onClose}
            className="btn-press rounded-full p-1"
            aria-label={tc("close")}
          >
            <MaterialIcon name="close" />
          </button>
        </div>
        <div className="relative aspect-[4/3] w-full bg-black/5">
          <Image
            src={imageUrl}
            alt=""
            fill
            className="object-contain"
            sizes="(max-width: 512px) 100vw, 512px"
          />
        </div>
      </div>
    </div>
  );
}
