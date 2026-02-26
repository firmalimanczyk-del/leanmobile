// ============================================================
// app/api/auth/login/route.ts
// Po udanym logowaniu ustawiamy cookie z osobistym apiKey użytkownika.
// Klucze są predefiniowane w zmiennej środowiskowej USER_API_KEYS
// (format: "email1:key1,email2:key2,...")
// Dzięki temu każde żądanie API jest podpisane kluczem DANEGO użytkownika
// → prawidłowa atrybucja (kto dodał komentarz, ticket itp.)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

const LEANTIME_URL = (process.env.LEANTIME_URL || process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');

function extractSessionCookie(setCookieHeader: string): string {
    if (!setCookieHeader) return '';
    const parts = setCookieHeader.split(',');
    const sessions = parts
        .map(p => p.trim().split(';')[0].trim())
        .filter(p => p.includes('=') && !p.startsWith('path') && !p.startsWith('expires'));
    return sessions.join('; ');
}

// Odczytuje apiKey użytkownika ze statycznej mapy w zmiennej USER_API_KEYS
// Format zmiennej: "email1:apiKey1,email2:apiKey2,..."
function lookupUserApiKey(email: string): string {
    const raw = process.env.USER_API_KEYS || '';
    for (const pair of raw.split(',')) {
        const colonIdx = pair.indexOf(':');
        if (colonIdx === -1) continue;
        const e = pair.slice(0, colonIdx).trim();
        const k = pair.slice(colonIdx + 1).trim();
        if (e.toLowerCase() === email.toLowerCase()) return k;
    }
    return '';
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

        const hiddenFields: Record<string, string> = {};
        const re = /<input[^>]*type\s*=\s*["']hidden["'][^>]*>/gi;
        let m;
        while ((m = re.exec(html)) !== null) {
            const nm = m[0].match(/name\s*=\s*["']([^"']+)["']/);
            const vm = m[0].match(/value\s*=\s*["']([^"']*?)["']/);
            if (nm) hiddenFields[nm[1]] = vm ? vm[1] : '';
        }

        // ── Krok 2: POST z danymi logowania ────────────────────────────
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
            ok = true; debugReason = 'redirect_to_dashboard';
        } else if ((postStatus === 302 || postStatus === 301) && location && !location.includes('/auth/')) {
            ok = true; debugReason = 'redirect_not_auth';
        } else if (postStatus === 200) {
            const bodyText = await postRes.text();
            if (!bodyText.includes('name="password"') && !bodyText.includes('notification-error') && !bodyText.includes('loginForm')) {
                ok = true; debugReason = 'no_login_form_or_error';
            } else {
                debugReason = 'still_on_login_page';
            }
        } else {
            debugReason = `unexpected_status_${postStatus}`;
        }

        const headers = new Headers({ 'Content-Type': 'application/json' });

        if (ok) {
            // ── Krok 3: Odczytaj osobisty apiKey z mapy USER_API_KEYS ──
            const personalApiKey = lookupUserApiKey(email);
            console.log(`[auth/login] User: ${email} | hasApiKey: ${!!personalApiKey}`);

            // Ustaw cookie z osobistym kluczem API (HttpOnly - niewidoczny dla JS)
            // Max-Age=604800 = 7 dni (zamiast 24h — zapobiega fallback na globalny klucz)
            const isProduction = process.env.NODE_ENV === 'production';
            const cookieParts = [
                `lt_user_api_key=${encodeURIComponent(personalApiKey)}`,
                'Path=/',
                'HttpOnly',
                'SameSite=Lax',
                'Max-Age=604800',
                ...(isProduction ? ['Secure'] : []),
            ];
            headers.append('set-cookie', cookieParts.join('; '));

            // Zachowaj też starą sesję Leantime (dla kompatybilności z /auth/logout)
            const sessionToStore = sessionFromPost || sessionFromGet;
            if (sessionToStore) {
                const sessParts = [
                    `lt_sess=${encodeURIComponent(sessionToStore)}`,
                    'Path=/',
                    'HttpOnly',
                    'SameSite=Lax',
                    'Max-Age=604800',
                    ...(isProduction ? ['Secure'] : []),
                ];
                headers.append('set-cookie', sessParts.join('; '));
            }

            const isDev = process.env.NODE_ENV !== 'production';
            const responseData = {
                ok: true,
                user: {
                    email,
                    hasPersonalKey: !!personalApiKey,
                },
                ...(isDev ? { debug: { postStatus, location, debugReason, sessionFromGet: !!sessionFromGet, sessionFromPost: !!sessionFromPost } } : {}),
            };
            return new NextResponse(JSON.stringify(responseData), { status: 200, headers });
        }

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
