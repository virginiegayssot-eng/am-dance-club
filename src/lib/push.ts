function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

export async function getPushSubscriptionStatus(): Promise<boolean> {
  if (!pushSupported()) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return !!sub;
}

export async function enablePush(): Promise<{ ok: boolean; error?: string }> {
  if (!pushSupported()) return { ok: false, error: "Not supported on this browser." };
  if (typeof Notification === "undefined") {
    return { ok: false, error: "Notifications aren't available in this app (Notification API missing)." };
  }
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
    return { ok: false, error: "Server isn't configured for push yet (missing VAPID key)." };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, error: `Notifications permission was ${permission}.` };

  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  let sub;
  try {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
    });
  } catch (err: any) {
    return { ok: false, error: `Subscribe failed: ${err?.message ?? err}` };
  }

  const json = sub.toJSON();
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, error: `Could not save subscription (${res.status}): ${text.slice(0, 200)}` };
  }

  return { ok: true };
}

export async function disablePush(): Promise<void> {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;

  await fetch("/api/push/unsubscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  });
  await sub.unsubscribe();
}

export async function notifyPush(type: "chat" | "video" | "news", title: string, body?: string) {
  try {
    await fetch("/api/push/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, title, body }),
    });
  } catch {
    // Best-effort — never block the actual action on a push failure.
  }
}
