'use client';

// push-utils.ts — funkcje do rejestracji powiadomień push

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export async function isPushSupported(): Promise<boolean> {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function getPushPermission(): Promise<NotificationPermission> {
    return Notification.permission;
}

export async function subscribeToPush(userId: string): Promise<boolean> {
    try {
        if (!VAPID_PUBLIC_KEY) {
            console.warn('[push] VAPID public key not set');
            return false;
        }

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('[push] Permission denied');
            return false;
        }

        const registration = await navigator.serviceWorker.ready;

        // Check if already subscribed
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
            });
        }

        // Send subscription to our backend
        const res = await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId,
                subscription: subscription.toJSON(),
            }),
        });

        const data = await res.json();
        console.log('[push] Subscribed:', data);
        return data.ok === true;
    } catch (e) {
        console.error('[push] Subscribe error:', e);
        return false;
    }
}

export async function unsubscribeFromPush(userId: string): Promise<boolean> {
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            await subscription.unsubscribe();
        }

        await fetch('/api/push/subscribe', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
        });

        return true;
    } catch (e) {
        console.error('[push] Unsubscribe error:', e);
        return false;
    }
}

export async function sendTestPush(userId: string): Promise<boolean> {
    try {
        // First get the subscription from our backend
        const subRes = await fetch('/api/push/subscribe');
        const subData = await subRes.json();

        if (!subData.users?.includes(userId)) {
            console.warn('[push] User not subscribed');
            return false;
        }

        // Get current subscription from browser
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (!subscription) return false;

        const res = await fetch('/api/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                subscription: subscription.toJSON(),
                title: '🔔 LeanMobile',
                body: 'Powiadomienia push działają! ⚡',
                url: '/',
            }),
        });

        const data = await res.json();
        return data.ok === true;
    } catch (e) {
        console.error('[push] Test push error:', e);
        return false;
    }
}
