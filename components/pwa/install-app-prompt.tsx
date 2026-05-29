"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { MaterialIcon } from "@/components/design/material-icon";
import { Button } from "@/components/ui/button";
import {
  type BeforeInstallPromptEvent,
  clearDeferredInstallPrompt,
  clearStaleInstallFlag,
  getDeferredInstallPrompt,
  isAndroidDevice,
  isIosDevice,
  isMobileDevice,
  registerPwaServiceWorker,
  shouldHideInstallPrompt,
  stashDeferredInstallPrompt,
} from "@/lib/pwa-client";

const ANDROID_FALLBACK_DELAY_MS = 500;

export function InstallAppPrompt() {
  const t = useTranslations("dashboard");
  const [shouldHide, setShouldHide] = useState<boolean | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showAndroidFallback, setShowAndroidFallback] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;

    clearStaleInstallFlag();
    setIsIos(isIosDevice());
    setIsAndroid(isAndroidDevice());

    const deferred = getDeferredInstallPrompt();
    if (deferred) {
      setInstallEvent(deferred);
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      stashDeferredInstallPrompt(promptEvent);
      setInstallEvent(promptEvent);
      setShowAndroidFallback(false);
    };

    const onAppInstalled = () => {
      clearDeferredInstallPrompt();
      setInstallEvent(null);
      setShouldHide(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onAppInstalled);

    void (async () => {
      await registerPwaServiceWorker();

      if (cancelled) return;

      const hide = await shouldHideInstallPrompt();
      if (cancelled) return;
      setShouldHide(hide);

      if (!hide && isAndroidDevice() && !deferred) {
        fallbackTimer = setTimeout(() => {
          if (cancelled) return;
          if (!getDeferredInstallPrompt()) {
            setShowAndroidFallback(true);
          }
        }, ANDROID_FALLBACK_DELAY_MS);
      }
    })();

    return () => {
      cancelled = true;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  if (shouldHide === null || shouldHide) {
    return null;
  }

  const showAndroidInstall = installEvent !== null;
  const showIosSteps = isIos && !showAndroidInstall;
  const showAndroidSteps =
    isAndroid && !showAndroidInstall && showAndroidFallback;
  const showDesktopHint =
    !isIos && !isAndroid && !showAndroidInstall && !isMobileDevice();

  async function handleInstall() {
    if (!installEvent) return;
    setInstalling(true);
    try {
      await installEvent.prompt();
      const { outcome } = await installEvent.userChoice;
      clearDeferredInstallPrompt();
      setInstallEvent(null);
      if (outcome === "accepted") {
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

          {showAndroidSteps && (
            <p className="text-body-md text-on-surface-variant mt-4">
              {t("installAppAndroidSteps")}
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
