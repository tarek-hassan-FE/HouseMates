"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { MaterialIcon } from "@/components/design/material-icon";
import { Button } from "@/components/ui/button";

const PWA_INSTALLED_KEY = "roomies-pwa-installed";

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

function isAppInstalled() {
  if (isStandaloneDisplay()) return true;
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(PWA_INSTALLED_KEY) === "1";
}

function markAppInstalled() {
  localStorage.setItem(PWA_INSTALLED_KEY, "1");
}

export function InstallAppPrompt() {
  const t = useTranslations("dashboard");
  const [shouldHide, setShouldHide] = useState<boolean | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    setShouldHide(isAppInstalled());
    setIsIos(isIosDevice());

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      markAppInstalled();
      setShouldHide(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  if (shouldHide === null || shouldHide) {
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
      const { outcome } = await installEvent.userChoice;
      setInstallEvent(null);
      if (outcome === "accepted") {
        markAppInstalled();
        setShouldHide(true);
      }
    } finally {
      setInstalling(false);
    }
  }

  return (
    <section className="bg-surface-container-lowest shadow-card border-outline-variant/20 mb-8 rounded-3xl border p-6">
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
