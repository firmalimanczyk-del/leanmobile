// ============================================================
// app/api/auth/logout/route.ts — Proxy wylogowania z Leantime
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

const LEANTIME_URL = (process.env.LEANTIME_URL || process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');


export async function GET(req: NextRequest) {
    try {
        const cookieHeader = req.headers.get('cookie') || '';
        await fetch(`${LEANTIME_URL}/auth/logout`, {
            credentials: 'include',
            headers: {
                ...(cookieHeader ? { Cookie: cookieHeader } : {}),
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
            },
        });
    } catch { /* ignore */ }

    // Usuń sesję po stronie klienta przez wygaśnięcie cookie
    return new NextResponse(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
}
