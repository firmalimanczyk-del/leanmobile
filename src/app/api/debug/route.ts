// app/api/debug/route.ts — Diagnostyka sesji i połączenia z Leantime
// UWAGA: usuń ten plik przed wdrożeniem produkcyjnym!

import { NextRequest, NextResponse } from 'next/server';

const LEANTIME_URL = (process.env.LEANTIME_URL || process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
const API_KEY = process.env.LEANTIME_API_KEY || '';

// Nagłówki przeglądarkowe — Cloudflare blokuje "gołe" requesty z datacenter IP (Vercel)
const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
};

export async function GET(req: NextRequest) {
    const cookies = req.headers.get('cookie') || '';
    const ltSessMatch = cookies.match(/lt_sess=([^;]+)/);
    const ltSession = ltSessMatch ? decodeURIComponent(ltSessMatch[1]) : null;

    // Test połączenia z Leantime
    let leantimeReachable = false;
    let loginPageStatus = 0;

    try {
        const r = await fetch(`${LEANTIME_URL}/auth/login`, { headers: { ...BROWSER_HEADERS, 'Accept': 'text/html' } });
        leantimeReachable = true;
        loginPageStatus = r.status;
    } catch { /* ignore */ }

    // Test JSON-RPC z globalnym kluczem API
    let rpcWithGlobalKey: unknown = null;
    try {
        const r = await fetch(`${LEANTIME_URL}/api/jsonrpc`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY, 'Accept': 'application/json, text/plain, */*', ...BROWSER_HEADERS },
            body: JSON.stringify({ jsonrpc: '2.0', method: 'leantime.rpc.projects.getAll', id: 1, params: {} }),
        });
        const raw = await r.text();
        const isHtml = raw.trimStart().startsWith('<');
        rpcWithGlobalKey = { status: r.status, isHtml, preview: raw.substring(0, 200) };
        if (!isHtml) {
            try {
                const d = JSON.parse(raw);
                rpcWithGlobalKey = { status: r.status, isHtml: false, hasResult: !!d?.result, resultCount: Array.isArray(d?.result) ? d.result.length : null, hasError: !!d?.error, errMsg: d?.error?.message };
            } catch { /* keep raw preview */ }
        }
    } catch (e) { rpcWithGlobalKey = { error: String(e) }; }

    // Test JSON-RPC z PIERWSZYM osobistym kluczem z USER_API_KEYS
    let rpcWithPersonalKey: unknown = null;
    const userApiKeysRaw = process.env.USER_API_KEYS || '';
    const firstPair = userApiKeysRaw.split(',')[0] || '';
    const colonIdx = firstPair.indexOf(':');
    const firstEmail = colonIdx > -1 ? firstPair.slice(0, colonIdx).trim() : '';
    const firstKey = colonIdx > -1 ? firstPair.slice(colonIdx + 1).trim() : '';

    if (firstKey) {
        try {
            const r = await fetch(`${LEANTIME_URL}/api/jsonrpc`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': firstKey, 'Accept': 'application/json, text/plain, */*', ...BROWSER_HEADERS },
                body: JSON.stringify({ jsonrpc: '2.0', method: 'leantime.rpc.projects.getAll', id: 2, params: {} }),
            });
            const raw = await r.text();
            const isHtml = raw.trimStart().startsWith('<');
            rpcWithPersonalKey = { status: r.status, isHtml, email: firstEmail, keyPrefix: firstKey.substring(0, 10) + '...', preview: raw.substring(0, 200) };
            if (!isHtml) {
                try {
                    const d = JSON.parse(raw);
                    rpcWithPersonalKey = { status: r.status, isHtml: false, email: firstEmail, keyPrefix: firstKey.substring(0, 10) + '...', hasResult: !!d?.result, resultCount: Array.isArray(d?.result) ? d.result.length : null, hasError: !!d?.error };
                } catch { /* keep raw preview */ }
            }
        } catch (e) { rpcWithPersonalKey = { error: String(e), email: firstEmail }; }
    } else {
        rpcWithPersonalKey = { error: 'USER_API_KEYS empty or not set', raw: userApiKeysRaw.substring(0, 50) };
    }

    // Test z cookie lt_user_api_key (jeśli jest w request)
    const personalKeyMatch = cookies.match(/lt_user_api_key=([^;]+)/);
    const cookieApiKey = personalKeyMatch ? decodeURIComponent(personalKeyMatch[1]) : '';
    let rpcWithCookieKey: unknown = null;
    if (cookieApiKey) {
        try {
            const r = await fetch(`${LEANTIME_URL}/api/jsonrpc`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': cookieApiKey, 'Accept': 'application/json, text/plain, */*', ...BROWSER_HEADERS },
                body: JSON.stringify({ jsonrpc: '2.0', method: 'leantime.rpc.projects.getAll', id: 3, params: {} }),
            });
            const raw = await r.text();
            const isHtml = raw.trimStart().startsWith('<');
            rpcWithCookieKey = { status: r.status, isHtml, keyPrefix: cookieApiKey.substring(0, 10) + '...', preview: raw.substring(0, 200) };
            if (!isHtml) {
                try {
                    const d = JSON.parse(raw);
                    rpcWithCookieKey = { status: r.status, isHtml: false, keyPrefix: cookieApiKey.substring(0, 10) + '...', hasResult: !!d?.result, resultCount: Array.isArray(d?.result) ? d.result.length : null };
                } catch { /* keep raw preview */ }
            }
        } catch (e) { rpcWithCookieKey = { error: String(e) }; }
    }

    return NextResponse.json({
        config: {
            leantimeUrl: LEANTIME_URL,
            globalApiKeyPresent: !!API_KEY,
            globalApiKeyLength: API_KEY.length,
            globalApiKeyPrefix: API_KEY.substring(0, 10) + '...',
            userApiKeysConfigured: userApiKeysRaw.split(',').filter(Boolean).length,
        },
        cookies: {
            ltSessCookiePresent: !!ltSession,
            ltUserApiKeyCookiePresent: !!cookieApiKey,
            cookieKeyPrefix: cookieApiKey ? cookieApiKey.substring(0, 10) + '...' : null,
        },
        connectivity: {
            leantimeReachable,
            loginPageStatus,
        },
        rpcTests: {
            withGlobalKey: rpcWithGlobalKey,
            withPersonalKey: rpcWithPersonalKey,
            withCookieKey: rpcWithCookieKey,
        },
    });
}
