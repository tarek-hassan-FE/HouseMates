import {
  removePushSubscriptionAction,
  savePushSubscriptionAction,
} from "@/app/[locale]/(app)/profile/actions";

export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export { isRunningAsInstalledPwa as isStandalonePwa } from "@/lib/pwa-client";

export function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as Window & { MSStream?: unknown }).MSStream
  );
}

export function getVapidPublicKey(): string | undefined {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  return registration;
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
  const vapidPublicKey = getVapidPublicKey();
  if (!vapidPublicKey) {
    throw new Error("Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY");
  }

  const registration = await registerServiceWorker();
  if (!registration) return null;

  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    return existing;
  }

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await removePushSubscriptionAction(endpoint);
}

export async function syncPushSubscription(
  subscription: PushSubscription,
): Promise<void> {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("Invalid push subscription");
  }

  const result = await savePushSubscriptionAction({
    endpoint: json.endpoint,
    keys: {
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
  });

  if (!result.success) {
    throw new Error(result.error);
  }
}

export async function enablePushNotifications(): Promise<"granted" | "denied" | "unsupported"> {
  if (!isPushSupported()) return "unsupported";

  if (!getVapidPublicKey()) {
    throw new Error("Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY");
  }

  const permission =
    Notification.permission === "default"
      ? await Notification.requestPermission()
      : Notification.permission;

  if (permission !== "granted") return "denied";

  const subscription = await subscribeToPush();
  if (!subscription) return "unsupported";

  await syncPushSubscription(subscription);
  return "granted";
}

export async function disablePushNotifications(): Promise<void> {
  await unsubscribeFromPush();
}

export function isPushActiveInBrowser(): boolean {
  return isPushSupported() && Notification.permission === "granted";
}
