// ============================================================
// app/api/jsonrpc/route.ts — Proxy do Leantime JSON-RPC API
// Czyta ciasteczko lt_sess i odtwarza sesję Leantime po stronie serwera
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

const LEANTIME_URL = process.env.NEXT_PUBLIC_API_URL || '';
const API_KEY = process.env.LEANTIME_API_KEY || '';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Odczytaj naszą sesję lt_sess (zapisaną przy logowaniu)
        const cookies = req.headers.get('cookie') || '';
        const ltSessMatch = cookies.match(/lt_sess=([^;]+)/);
        const ltSession = ltSessMatch ? decodeURIComponent(ltSessMatch[1]) : '';

        const response = await fetch(`${LEANTIME_URL}/api/jsonrpc`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY,
                // Przekaż sesję Leantime do serwera (server-to-server, brak CORS)
                ...(ltSession ? { Cookie: ltSession } : {}),
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        return NextResponse.json(data, { status: response.status });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json(
            { error: { code: -32000, message } },
            { status: 500 }
        );
    }
}
