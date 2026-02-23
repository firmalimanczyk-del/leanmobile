import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
    interface WorkerGlobalScope extends SerwistGlobalConfig {
        __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
    }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
    precacheEntries: self.__SW_MANIFEST,
    skipWaiting: true,
    clientsClaim: true,
    navigationPreload: true,
    runtimeCaching: defaultCache,
});

serwist.addEventListeners();

// ── Push Notifications ──────────────────────────────────────

self.addEventListener("push", (event) => {
    if (!event.data) return;

    try {
        const data = event.data.json();
        const title = data.title || "LeanMobile";
        const options: NotificationOptions = {
            body: data.body || "",
            icon: data.icon || "/icons/icon-192x192.png",
            badge: data.badge || "/icons/icon-192x192.png",
            data: { url: data.url || "/" },
            tag: "leanmobile-" + Date.now(),
        };

        event.waitUntil(self.registration.showNotification(title, options));
    } catch {
        // Fallback for plain text
        const text = event.data.text();
        event.waitUntil(
            self.registration.showNotification("LeanMobile", { body: text })
        );
    }
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    const url = event.notification.data?.url || "/";

    event.waitUntil(
        self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
            // Focus existing window if open
            for (const client of clients) {
                if (client.url.includes(self.location.origin) && "focus" in client) {
                    client.focus();
                    if (url !== "/") client.navigate(url);
                    return;
                }
            }
            // Open new window
            self.clients.openWindow(url);
        })
    );
});
