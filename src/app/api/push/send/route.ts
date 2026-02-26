// /api/push/send — wyślij powiadomienie push do użytkowników
// Używa web-push do wysłania powiadomienia

import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';

// Lazy init — NIE wywołujemy setVapidDetails() na poziomie modułu!
// Vercel podczas "Collecting page data" importuje moduł bez env vars → build error.
let vapidReady = false;

function ensureVapid(): boolean {
    if (vapidReady) return true;
    const pub = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const priv = (process.env.VAPID_PRIVATE_KEY || '').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const subject = process.env.VAPID_SUBJECT || 'mailto:projekty@limanczyk.pl';
    if (!pub || !priv) return false;
    try {
        webpush.setVapidDetails(subject, pub, priv);
        vapidReady = true;
        return true;
    } catch (err) {
        console.error('[push] Failed to set VAPID details:', err);
        return false;
    }
}

export async function POST(req: NextRequest) {
    try {
        if (!ensureVapid()) {
            return NextResponse.json({ error: 'VAPID keys not configured' }, { status: 500 });
        }

        const body = await req.json();
        const { subscription, title, body: msgBody, url } = body;

        if (!subscription?.endpoint) {
            return NextResponse.json({ error: 'Missing subscription' }, { status: 400 });
        }

        const payload = JSON.stringify({
            title: title || 'LeanMobile',
            body: msgBody || 'Nowe powiadomienie',
            url: url || '/',
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-192x192.png',
        });

        await webpush.sendNotification(subscription, payload);
        return NextResponse.json({ ok: true });
    } catch (e: unknown) {
        const err = e as { statusCode?: number; message?: string };
        console.error('[push] send error:', err.statusCode, err.message);
        return NextResponse.json(
            { error: err.message || 'Push failed', statusCode: err.statusCode },
            { status: err.statusCode || 500 }
        );
    }
}
