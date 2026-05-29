const PWA_INSTALLED_KEY = "roomies-pwa-installed";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    __roomiesDeferredInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

export function isRunningAsInstalledPwa(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function clearStaleInstallFlag(): void {
  if (typeof localStorage === "undefined") return;
  if (!isRunningAsInstalledPwa()) {
    localStorage.removeItem(PWA_INSTALLED_KEY);
  }
}

export async function isInstalledRelatedApp(): Promise<boolean> {
  if (typeof navigator === "undefined") return false;
  if (!("getInstalledRelatedApps" in navigator)) return false;

  try {
    const related = await (
      navigator as Navigator & {
        getInstalledRelatedApps: () => Promise<{ platform: string }[]>;
      }
    ).getInstalledRelatedApps();
    return related.length > 0;
  } catch {
    return false;
  }
}

export async function shouldHideInstallPrompt(): Promise<boolean> {
  if (isRunningAsInstalledPwa()) return true;
  return isInstalledRelatedApp();
}

export async function registerPwaServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    return registration;
  } catch {
    return null;
  }
}

export function getDeferredInstallPrompt(): BeforeInstallPromptEvent | null {
  if (typeof window === "undefined") return null;
  return window.__roomiesDeferredInstallPrompt ?? null;
}

export function stashDeferredInstallPrompt(event: BeforeInstallPromptEvent): void {
  if (typeof window === "undefined") return;
  window.__roomiesDeferredInstallPrompt = event;
}

export function clearDeferredInstallPrompt(): void {
  if (typeof window === "undefined") return;
  window.__roomiesDeferredInstallPrompt = null;
}

export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as Window & { MSStream?: unknown }).MSStream
  );
}

export function isAndroidDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}
