// ============================================================
// app/api/jsonrpc/route.ts — Proxy do Leantime JSON-RPC API
// Hybryda: x-api-key (przepustka) + sesja użytkownika (atrybucja)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

const LEANTIME_URL = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
const API_KEY = process.env.LEANTIME_API_KEY || '';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Odczytaj sesję użytkownika zapisaną przy logowaniu
        const cookies = req.headers.get('cookie') || '';
        const ltSessMatch = cookies.match(/lt_sess=([^;]+)/);
        const ltSession = ltSessMatch ? decodeURIComponent(ltSessMatch[1]) : '';

        const response = await fetch(`${LEANTIME_URL}/api/jsonrpc`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // x-api-key: przepustka do endpointu JSON-RPC
                'x-api-key': API_KEY,
                // Cookie sesji: określa KOGO dotyczą działania (atrybucja użytkownika)
                ...(ltSession ? { Cookie: ltSession } : {}),
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('[jsonrpc] Error:', message);
        return NextResponse.json(
            { jsonrpc: '2.0', error: { code: -32000, message }, id: null },
            { status: 500 }
        );
    }
}
