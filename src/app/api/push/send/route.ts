// /api/push/send — wyślij powiadomienie push do użytkowników
// Używa web-push do wysłania powiadomienia

import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@limanczyk.pl';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

export async function POST(req: NextRequest) {
    try {
        if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
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
