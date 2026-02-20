// ============================================================
// app/api/auth/login/route.ts
// Serwer wykonuje pełny GET+POST do Leantime, naprawiając CORS i cross-domain cookies
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

const LEANTIME_URL = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');

function extractSessionCookie(setCookieHeader: string): string {
    // set-cookie może wyglądać np.:
    //   "PHPSESSID=abc123; path=/; HttpOnly"
    //   "leantime_session=xyz; path=/; SameSite=Strict; Secure"
    // Chcemy tylko "NAZWACIAST=WARTOŚĆ" bez atrybutów
    if (!setCookieHeader) return '';
    const parts = setCookieHeader.split(','); // wiele ciasteczek oddzielonych przecinkiem
    const sessions = parts
        .map(p => p.trim().split(';')[0].trim())    // weź tylko name=value
        .filter(p => p.includes('=') && !p.startsWith('path') && !p.startsWith('expires'));
    return sessions.join('; ');
}

export async function POST(req: NextRequest) {
    try {
        const { email, password } = await req.json();
        if (!email || !password) {
            return NextResponse.json({ ok: false, error: 'Brak danych' }, { status: 400 });
        }

        // ── Krok 1: GET strony logowania → sesja + ukryte pola ─────────
        const getRes = await fetch(`${LEANTIME_URL}/auth/login`, {
            headers: { 'User-Agent': 'LeanMobile/1.0', Accept: 'text/html' },
        });

        const html = await getRes.text();
        const sessionFromGet = extractSessionCookie(getRes.headers.get('set-cookie') || '');

        // Sparsuj ukryte pola formularza (CSRF, tokeny itp.)
        const hiddenFields: Record<string, string> = {};
        const re = /<input[^>]*type\s*=\s*["']hidden["'][^>]*>/gi;
        let m;
        while ((m = re.exec(html)) !== null) {
            const nm = m[0].match(/name\s*=\s*["']([^"']+)["']/);
            const vm = m[0].match(/value\s*=\s*["']([^"']*?)["']/);
            if (nm) hiddenFields[nm[1]] = vm ? vm[1] : '';
        }

        // ── Krok 2: POST do Leantime z sesjąi powodem ──────────────────
        let formBody = `username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
        for (const [k, v] of Object.entries(hiddenFields)) {
            formBody += `&${encodeURIComponent(k)}=${encodeURIComponent(v)}`;
        }

        const postRes = await fetch(`${LEANTIME_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'LeanMobile/1.0',
                Accept: 'text/html,application/xhtml+xml',
                ...(sessionFromGet ? { Cookie: sessionFromGet } : {}),
            },
            body: formBody,
            redirect: 'manual',
        });

        const postStatus = postRes.status;
        const location = postRes.headers.get('location') || '';
        const sessionFromPost = extractSessionCookie(postRes.headers.get('set-cookie') || '');

        // ── Określ czy logowanie się udało ─────────────────────────────
        let ok = false;
        let debugReason = '';

        if (location.includes('/dashboard') || location.includes('/tickets') || location.includes('/projects')) {
            ok = true;
            debugReason = 'redirect_to_dashboard';
        } else if ((postStatus === 302 || postStatus === 301) && location && !location.includes('/auth/')) {
            ok = true;
            debugReason = 'redirect_not_auth';
        } else if (postStatus === 200) {
            const body = await postRes.text();
            if (!body.includes('name="password"') && !body.includes('notification-error') && !body.includes('loginForm')) {
                ok = true;
                debugReason = 'no_login_form_or_error';
            } else {
                debugReason = 'still_on_login_page';
            }
        } else {
            debugReason = `unexpected_status_${postStatus}`;
        }

        const headers = new Headers({ 'Content-Type': 'application/json' });

        if (ok) {
            // Użyj sesji z POST (jeśli dostępna, Leantime może wydać nowy PHPSESSID po zalogowaniu)
            const sessionToStore = sessionFromPost || sessionFromGet;
            if (sessionToStore) {
                headers.set(
                    'set-cookie',
                    `lt_sess=${encodeURIComponent(sessionToStore)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`
                );
            }
        }

        // W trybie dev, dodaj debug info
        const isDev = process.env.NODE_ENV !== 'production';
        const responseData = isDev
            ? { ok, debug: { postStatus, location, sessionFromGet: !!sessionFromGet, sessionFromPost: !!sessionFromPost, hiddenFieldKeys: Object.keys(hiddenFields), debugReason } }
            : { ok };

        return new NextResponse(JSON.stringify(responseData), { status: 200, headers });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Błąd serwera';
        console.error('[auth/login] Error:', message);
        return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
}
