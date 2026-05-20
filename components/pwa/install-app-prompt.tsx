"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { MaterialIcon } from "@/components/design/material-icon";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as Window & { MSStream?: unknown }).MSStream
  );
}

function isMobileDevice() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function InstallAppPrompt() {
  const t = useTranslations("settings");
  const [isStandalone, setIsStandalone] = useState(true);
  const [isIos, setIsIos] = useState(false);
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    setIsStandalone(isStandaloneDisplay());
    setIsIos(isIosDevice());

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, []);

  if (isStandalone) {
    return null;
  }

  const showAndroidInstall = installEvent !== null;
  const showIosSteps = isIos && !showAndroidInstall;
  const showDesktopHint =
    !isIos && !showAndroidInstall && !isMobileDevice();

  async function handleInstall() {
    if (!installEvent) return;
    setInstalling(true);
    try {
      await installEvent.prompt();
      await installEvent.userChoice;
      setInstallEvent(null);
    } finally {
      setInstalling(false);
    }
  }

  return (
    <section className="bg-surface-container-lowest shadow-card border-outline-variant/20 rounded-3xl border p-6">
      <div className="flex items-start gap-3">
        <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
          <MaterialIcon name="install_mobile" size={24} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-headline-md text-on-surface font-semibold">
            {t("installApp")}
          </h2>
          <p className="text-body-md text-on-surface-variant mt-2">
            {t("installAppDescription")}
          </p>

          {showAndroidInstall && (
            <Button
              type="button"
              className="btn-press mt-4 rounded-xl font-bold"
              disabled={installing}
              onClick={handleInstall}
            >
              {t("installAppButton")}
            </Button>
          )}

          {showIosSteps && (
            <p className="text-body-md text-on-surface-variant mt-4">
              {t("installAppIosSteps")}
            </p>
          )}

          {showDesktopHint && (
            <p className="text-body-md text-on-surface-variant mt-4">
              {t("installAppDesktopHint")}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
