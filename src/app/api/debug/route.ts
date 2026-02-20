// app/api/debug/route.ts — Diagnostyka sesji i połączenia z Leantime
// UWAGA: usuń ten plik przed wdrożeniem produkcyjnym!

import { NextRequest, NextResponse } from 'next/server';

const LEANTIME_URL = (process.env.LEANTIME_URL || process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
const API_KEY = process.env.LEANTIME_API_KEY || '';

export async function GET(req: NextRequest) {
    const cookies = req.headers.get('cookie') || '';
    const ltSessMatch = cookies.match(/lt_sess=([^;]+)/);
    const ltSession = ltSessMatch ? decodeURIComponent(ltSessMatch[1]) : null;

    // Test połączenia z Leantime
    let leantimeReachable = false;
    let loginPageStatus = 0;

    try {
        const r = await fetch(`${LEANTIME_URL}/auth/login`, { headers: { 'User-Agent': 'LeanMobile/1.0' } });
        leantimeReachable = true;
        loginPageStatus = r.status;
    } catch { /* ignore */ }

    // Test JSON-RPC z kluczem API (bez sesji)
    let rpcWithKeyOnly: unknown = null;
    try {
        const r = await fetch(`${LEANTIME_URL}/api/jsonrpc`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
            body: JSON.stringify({ jsonrpc: '2.0', method: 'leantime.rpc.projects.getAll', id: 1, params: {} }),
        });
        const d = await r.json();
        rpcWithKeyOnly = { status: r.status, hasResult: !!d?.result, hasError: !!d?.error, errMsg: d?.error?.message };
    } catch (e) { rpcWithKeyOnly = { error: String(e) }; }

    // Test JSON-RPC z sesją (jeśli istnieje)
    let rpcWithSession: unknown = null;
    if (ltSession) {
        try {
            const r = await fetch(`${LEANTIME_URL}/api/jsonrpc`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY, Cookie: ltSession },
                body: JSON.stringify({ jsonrpc: '2.0', method: 'leantime.rpc.projects.getAll', id: 2, params: {} }),
            });
            const d = await r.json();
            rpcWithSession = { status: r.status, hasResult: !!d?.result, hasError: !!d?.error, errMsg: d?.error?.message };
        } catch (e) { rpcWithSession = { error: String(e) }; }
    }

    return NextResponse.json({
        config: {
            leantimeUrl: LEANTIME_URL,
            apiKeyPresent: !!API_KEY,
            apiKeyLength: API_KEY.length,
        },
        session: {
            ltSessCookiePresent: !!ltSession,
            ltSessValue: ltSession ? ltSession.substring(0, 20) + '...' : null,
        },
        connectivity: {
            leantimeReachable,
            loginPageStatus,
        },
        rpcTests: {
            withKeyOnly: rpcWithKeyOnly,
            withSession: rpcWithSession,
        },
    });
}

// Test logowania — POST z emailem i hasłem
export async function POST(req: NextRequest) {
    try {
        const { email, password } = await req.json();

        // Pobierz stronę logowania
        const getRes = await fetch(`${LEANTIME_URL}/auth/login`, { headers: { 'User-Agent': 'LeanMobile/1.0' } });
        const html = await getRes.text();
        const setCookieGet = getRes.headers.get('set-cookie') || '';
        const ltCookieFromGet = setCookieGet.split(';')[0];

        // Wyodrębnij ukryte pola
        const hiddenFields: Record<string, string> = {};
        const re = /<input[^>]*type\s*=\s*["']hidden["'][^>]*>/gi;
        let match;
        while ((match = re.exec(html)) !== null) {
            const nameMatch = match[0].match(/name\s*=\s*["']([^"']+)["']/);
            const valMatch = match[0].match(/value\s*=\s*["']([^"']*?)["']/);
            if (nameMatch) hiddenFields[nameMatch[1]] = valMatch ? valMatch[1] : '';
        }

        // POST
        let formBody = `username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
        for (const [k, v] of Object.entries(hiddenFields)) {
            formBody += `&${encodeURIComponent(k)}=${encodeURIComponent(v)}`;
        }

        const postRes = await fetch(`${LEANTIME_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'LeanMobile/1.0',
                ...(ltCookieFromGet ? { Cookie: ltCookieFromGet } : {}),
            },
            body: formBody,
            redirect: 'manual',
        });

        const status = postRes.status;
        const location = postRes.headers.get('location') || '';
        const setCookiePost = postRes.headers.get('set-cookie') || '';
        const bodySnippet = status < 400 ? (await postRes.text()).substring(0, 500) : '[skipped for 4xx]';

        return NextResponse.json({
            GET: { status: getRes.status, setCookie: setCookieGet.substring(0, 100), hiddenFields },
            POST: { status, location, setCookie: setCookiePost.substring(0, 200), bodySnippet },
        });
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
