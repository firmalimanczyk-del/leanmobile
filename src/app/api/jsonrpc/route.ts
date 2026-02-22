// ============================================================
// app/api/jsonrpc/route.ts — Proxy do Leantime JSON-RPC API
// WAŻNE: Leantime 3.3.2 nie obsługuje x-api-key + sesja jednocześnie.
// Middleware Leantime wybiera JEDEN tryb auth. Wysyłamy TYLKO x-api-key.
// Atrybucja użytkownika odbywa się przez jawne pole userId w params.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

const LEANTIME_URL = (process.env.LEANTIME_URL || '').replace(/\/$/, '');
const GLOBAL_API_KEY = process.env.LEANTIME_API_KEY || '';

export async function POST(req: NextRequest) {
    let method = '?';
    try {
        const body = await req.json();
        method = body?.method || '?';

        // Odczytaj osobisty apiKey użytkownika z cookie (ustawionego przy logowaniu)
        const cookies = req.headers.get('cookie') || '';
        const personalKeyMatch = cookies.match(/lt_user_api_key=([^;]+)/);
        const personalApiKey = personalKeyMatch ? decodeURIComponent(personalKeyMatch[1]) : '';
        // Użyj osobistego klucza jeśli dostępny → akcje przypisane do właściwego użytkownika
        const apiKey = personalApiKey || GLOBAL_API_KEY;
        const userIdMatch = cookies.match(/lt_user_id=([^;]+)/);
        const currentUserId = userIdMatch ? decodeURIComponent(userIdMatch[1]) : 'unknown';
        console.log(`[jsonrpc] → ${method} | userId: ${currentUserId} | personalKey: ${!!personalApiKey}`);

        // UWAGA: NIE wysyłamy lt_sess do Leantime!
        // Leantime 3.3.2 bug: x-api-key + session cookie = konflikt auth → HTML response
        // Zamiast tego userId przekazujemy jawnie w params gdzie możliwe.
        const response = await fetch(`${LEANTIME_URL}/api/jsonrpc`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
            },
            body: JSON.stringify(body),
        });

        // Odczytaj raw text PRZED próbą JSON.parse
        const raw = await response.text();

        // Jeśli Leantime zwrócił HTML (błąd serwera lub przekierowanie)
        if (raw.trimStart().startsWith('<')) {
            const preview = raw.substring(0, 200).replace(/\s+/g, ' ');
            console.error(`[jsonrpc] HTML response for ${method} (HTTP ${response.status}): ${preview}`);
            return NextResponse.json(
                {
                    jsonrpc: '2.0',
                    error: {
                        code: -32000,
                        message: `Błąd serwera dla metody ${method} (HTTP ${response.status}). Szczegóły w logach.`,
                    },
                    id: body?.id ?? null,
                },
                { status: 500 }
            );
        }

        let data: unknown;
        try {
            data = JSON.parse(raw);
        } catch {
            console.error(`[jsonrpc] JSON parse error for ${method}: ${raw.substring(0, 200)}`);
            return NextResponse.json(
                {
                    jsonrpc: '2.0',
                    error: { code: -32700, message: `Nieprawidłowy JSON od Leantime` },
                    id: body?.id ?? null,
                },
                { status: 500 }
            );
        }

        // UWAGA: Leantime ma bug — niektóre metody (np. addComment) zwracają HTTP 500
        // ale faktycznie zapisują dane prawidłowo. Gdy odpowiedź jest valide JSON,
        // traktujemy operację jako sukces (zwracamy 200 do frontendu).
        const returnStatus = response.status >= 500 ? 200 : response.status;
        console.log(`[jsonrpc] ← ${method} HTTP ${response.status} → przekazuję jako ${returnStatus}`);
        return NextResponse.json(data, { status: returnStatus });

    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[jsonrpc] Catch error for ${method}:`, message);
        return NextResponse.json(
            { jsonrpc: '2.0', error: { code: -32000, message }, id: null },
            { status: 500 }
        );
    }
}
