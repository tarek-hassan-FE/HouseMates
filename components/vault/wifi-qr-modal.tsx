"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { MaterialIcon } from "@/components/design/material-icon";
import { Button } from "@/components/ui/button";

type WifiQrModalProps = {
  open: boolean;
  onClose: () => void;
  ssid: string;
  password: string;
};

function wifiQrPayload(ssid: string, password: string) {
  const escape = (s: string) =>
    s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/:/g, "\\:");
  return `WIFI:T:WPA;S:${escape(ssid)};P:${escape(password)};;`;
}

export function WifiQrModal({ open, onClose, ssid, password }: WifiQrModalProps) {
  const t = useTranslations("vault");
  const tc = useTranslations("common");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!open || !canvasRef.current) return;

    let cancelled = false;

    void import("qrcode").then((QRCode) => {
      if (cancelled || !canvasRef.current) return;
      void QRCode.toCanvas(canvasRef.current, wifiQrPayload(ssid, password), {
        width: 240,
        margin: 2,
        color: { dark: "#0b1c30", light: "#ffffff" },
      });
    });

    return () => {
      cancelled = true;
    };
  }, [open, ssid, password]);

  if (!open) return null;

  return (
    <div
      className="bg-foreground/40 fixed inset-0 z-[60] flex items-end justify-center overscroll-contain p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal
      aria-labelledby="wifi-qr-title"
    >
      <button
        type="button"
        className="absolute inset-0"
        aria-label={tc("closeDialog")}
        onClick={onClose}
      />
      <div className="bg-surface-container-lowest relative w-full max-w-sm rounded-t-[2rem] p-8 shadow-2xl sm:rounded-[2rem]">
        <div className="flex items-center justify-between">
          <h2 id="wifi-qr-title" className="text-headline-md font-bold">
            {t("wifiQrTitle")}
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
        <p className="text-body-md text-on-surface-variant mt-2">{ssid}</p>
        <div className="mt-6 flex justify-center">
          <canvas ref={canvasRef} className="rounded-2xl" aria-hidden />
        </div>
        <p className="text-label-sm text-on-surface-variant mt-4 text-center">
          {t("wifiQrHint")}
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
