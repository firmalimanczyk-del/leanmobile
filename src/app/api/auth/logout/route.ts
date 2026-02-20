// ============================================================
// app/api/auth/logout/route.ts — Proxy wylogowania z Leantime
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

const LEANTIME_URL = (process.env.LEANTIME_URL || '').replace(/\/$/, '');


export async function GET(req: NextRequest) {
    try {
        const cookieHeader = req.headers.get('cookie') || '';
        await fetch(`${LEANTIME_URL}/auth/logout`, {
            credentials: 'include',
            headers: cookieHeader ? { Cookie: cookieHeader } : {},
        });
    } catch { /* ignore */ }

    // Usuń sesję po stronie klienta przez wygaśnięcie cookie
    return new NextResponse(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
}
