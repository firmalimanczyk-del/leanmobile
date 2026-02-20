// ============================================================
// app/api/auth/login/route.ts — Proxy logowania do Leantime
// Obsługuje form-based auth (POST x-www-form-urlencoded)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

const LEANTIME_URL = process.env.NEXT_PUBLIC_API_URL || '';

export async function GET() {
    // Pobierz stronę logowania (dla hidden fields / CSRF tokenów)
    try {
        const response = await fetch(`${LEANTIME_URL}/auth/login`, {
            headers: { 'User-Agent': 'LeanMobile/1.0' },
        });
        const html = await response.text();
        const setCookie = response.headers.get('set-cookie');
        const headers = new Headers({ 'Content-Type': 'text/html' });
        if (setCookie) headers.set('set-cookie', setCookie);
        return new NextResponse(html, { status: response.status, headers });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.text(); // x-www-form-urlencoded
        const cookieHeader = req.headers.get('cookie') || '';

        const response = await fetch(`${LEANTIME_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                ...(cookieHeader ? { Cookie: cookieHeader } : {}),
                'User-Agent': 'LeanMobile/1.0',
            },
            body,
            redirect: 'manual', // nie podążaj za redirectem — informuj klienta
        });

        const setCookie = response.headers.get('set-cookie');
        const location = response.headers.get('location') || '';
        const responseBody = response.status < 400 ? await response.text().catch(() => '') : '';

        const headers = new Headers({ 'Content-Type': 'application/json' });
        if (setCookie) headers.set('set-cookie', setCookie);

        return new NextResponse(
            JSON.stringify({
                status: response.status,
                location,
                body: responseBody,
                ok: response.ok || response.status === 302 || response.status === 301,
            }),
            { status: 200, headers }
        );
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
