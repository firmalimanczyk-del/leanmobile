// /api/push/subscribe — zapis/odczyt subskrypcji Web Push
// Proste przechowywanie w pamięci (restart serwera = reset).
// W przyszłości można użyć Vercel KV / Redis.

import { NextRequest, NextResponse } from 'next/server';

interface PushSub {
    endpoint: string;
    keys: { p256dh: string; auth: string };
}

interface UserSub {
    userId: string;
    subscription: PushSub;
    createdAt: string;
}

// In-memory store (per-instance, resets on cold start)
const subscriptions: Map<string, UserSub> = new Map();

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userId, subscription } = body;

        if (!userId || !subscription?.endpoint || !subscription?.keys) {
            return NextResponse.json({ error: 'Missing userId or subscription' }, { status: 400 });
        }

        subscriptions.set(userId, {
            userId,
            subscription,
            createdAt: new Date().toISOString(),
        });

        console.log(`[push] Subscribed user ${userId}, total: ${subscriptions.size}`);
        return NextResponse.json({ ok: true, total: subscriptions.size });
    } catch (e) {
        console.error('[push] subscribe error:', e);
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const body = await req.json();
        const { userId } = body;

        if (!userId) {
            return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        }

        subscriptions.delete(userId);
        console.log(`[push] Unsubscribed user ${userId}, total: ${subscriptions.size}`);
        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error('[push] unsubscribe error:', e);
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}

// GET — diagnostic: how many subs
export async function GET() {
    return NextResponse.json({
        total: subscriptions.size,
        users: Array.from(subscriptions.keys()),
    });
}
