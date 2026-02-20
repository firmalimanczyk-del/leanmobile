// ============================================================
// app/api/jsonrpc/route.ts — Proxy do Leantime JSON-RPC API
// Rozwiązuje problem CORS: przeglądarka → Next.js → Leantime
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

const LEANTIME_URL = process.env.NEXT_PUBLIC_API_URL || '';
const API_KEY = process.env.LEANTIME_API_KEY || '';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Przekaż sesję cookie do Leantime (dla metod wymagających auth)
        const cookieHeader = req.headers.get('cookie') || '';

        const response = await fetch(`${LEANTIME_URL}/api/jsonrpc`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY,
                ...(cookieHeader ? { Cookie: cookieHeader } : {}),
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        // Przeforwarduj Set-Cookie od Leantime do przeglądarki
        const setCookie = response.headers.get('set-cookie');
        const headers = new Headers({ 'Content-Type': 'application/json' });
        if (setCookie) headers.set('set-cookie', setCookie);

        return new NextResponse(JSON.stringify(data), {
            status: response.status,
            headers,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json(
            { error: { code: -32000, message } },
            { status: 500 }
        );
    }
}
