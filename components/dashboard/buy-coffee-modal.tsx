"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { MaterialIcon } from "@/components/design/material-icon";
import { Button } from "@/components/ui/button";

export const INSTAPAY_COFFEE_URL =
  "https://ipn.eg/S/tarek.hassan38/instapay/838qzp";

const DESKTOP_MEDIA_QUERY = "(min-width: 640px)";

type BuyCoffeeModalProps = {
  open: boolean;
  onClose: () => void;
};

export function BuyCoffeeModal({ open, onClose }: BuyCoffeeModalProps) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!open || !canvasRef.current) return;
    if (!window.matchMedia(DESKTOP_MEDIA_QUERY).matches) return;

    let cancelled = false;

    void import("qrcode").then((QRCode) => {
      if (cancelled || !canvasRef.current) return;
      void QRCode.toCanvas(canvasRef.current, INSTAPAY_COFFEE_URL, {
        width: 240,
        margin: 2,
        color: { dark: "#0b1c30", light: "#ffffff" },
      });
    });

    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="bg-foreground/40 fixed inset-0 z-[60] flex items-end justify-center overscroll-contain p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal
      aria-labelledby="buy-coffee-qr-title"
    >
      <button
        type="button"
        className="absolute inset-0"
        aria-label={tc("closeDialog")}
        onClick={onClose}
      />
      <div className="bg-surface-container-lowest relative w-full max-w-sm rounded-t-[2rem] p-8 shadow-2xl sm:rounded-[2rem]">
        <div className="flex items-center justify-between">
          <h2 id="buy-coffee-qr-title" className="text-headline-md font-bold">
            {t("buyCoffeeQrTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="btn-press text-on-surface-variant flex size-10 items-center justify-center rounded-full"
            aria-label={tc("close")}
          >
            <MaterialIcon name="close" />
          </button>
        </div>
        <div className="bg-primary-container/40 border-primary/15 mt-4 rounded-2xl border px-4 py-3">
          <p className="text-body-md text-on-surface leading-relaxed">
            {t("buyCoffeeQrPitch")}
          </p>
        </div>
        <p className="text-body-md text-on-surface-variant mt-4 sm:hidden">
          {t("buyCoffeeMobileSubtitle")}
        </p>
        <p className="text-body-md text-on-surface-variant mt-4 hidden sm:block">
          {t("buyCoffeeQrSubtitle")}
        </p>

        <div className="mt-6 flex justify-center sm:hidden">
          <a
            href={INSTAPAY_COFFEE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-press bg-primary-container text-on-primary-container inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-label-md font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <MaterialIcon name="open_in_new" size={20} />
            {t("buyCoffeeLinkBadge")}
          </a>
        </div>

        <div className="mt-6 hidden justify-center sm:flex">
          <canvas ref={canvasRef} className="rounded-2xl" aria-hidden />
        </div>

        <p className="text-label-sm text-on-surface-variant mt-4 text-center sm:hidden">
          {t("buyCoffeeMobileHint")}
        </p>
        <p className="text-label-sm text-on-surface-variant mt-4 hidden text-center sm:block">
          {t("buyCoffeeQrHint")}
        </p>

        <Button
          type="button"
          onClick={onClose}
          className="btn-press mt-6 h-12 w-full rounded-xl font-bold"
        >
          {tc("close")}
        </Button>
      </div>
    </div>
  );
}
