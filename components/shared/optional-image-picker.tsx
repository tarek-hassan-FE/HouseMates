"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { MaterialIcon } from "@/components/design/material-icon";
import { cn } from "@/lib/utils";

type OptionalImagePickerProps = {
  file: File | null;
  onFileChange: (file: File | null) => void;
  error?: string | null;
  className?: string;
};

export function OptionalImagePicker({
  file,
  onFileChange,
  error,
  className,
}: OptionalImagePickerProps) {
  const t = useTranslations("attachments");
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function handleSelect(selected: File) {
    if (!selected.type.startsWith("image/")) {
      onFileChange(null);
      return;
    }
    onFileChange(selected);
  }

  function handleRemove() {
    onFileChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-label-md text-on-surface-variant font-semibold">
        {t("addPhotoOptional")}
      </p>
      {previewUrl ? (
        <div className="relative inline-block">
          <div className="border-outline-variant/30 relative size-24 overflow-hidden rounded-xl border">
            <Image
              src={previewUrl}
              alt=""
              fill
              className="object-cover"
              unoptimized
            />
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="btn-press bg-surface-container-high text-on-surface-variant absolute -end-2 -top-2 flex size-8 items-center justify-center rounded-full shadow-sm"
            aria-label={t("removePhoto")}
          >
            <MaterialIcon name="close" size={18} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="btn-press border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-low flex w-full items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-6 transition-colors"
        >
          <MaterialIcon name="add_a_photo" size={22} />
          <span className="text-label-md font-semibold">{t("addPhotoOptional")}</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => {
          const selected = e.target.files?.[0];
          if (selected) handleSelect(selected);
          e.target.value = "";
        }}
      />
      {error && (
        <p className="text-body-md text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
