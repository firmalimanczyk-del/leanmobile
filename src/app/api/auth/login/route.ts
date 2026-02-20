// ============================================================
// app/api/auth/login/route.ts — Proxy logowania do Leantime
// Serwer wykonuje pełny flow GET+POST, rozwiązując problem CORS/cookies
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

const LEANTIME_URL = process.env.NEXT_PUBLIC_API_URL || '';

export async function POST(req: NextRequest) {
    try {
        const { email, password } = await req.json();
        if (!email || !password) {
            return NextResponse.json({ ok: false, error: 'Brak danych logowania' }, { status: 400 });
        }

        // Krok 1: GET strony logowania — pobierz PHPSESSID i ukryte pola formularza
        const getRes = await fetch(`${LEANTIME_URL}/auth/login`, {
            headers: { 'User-Agent': 'LeanMobile/1.0' },
        });
        const html = await getRes.text();
        const ltCookieRaw = getRes.headers.get('set-cookie') || '';

        // Wyciągnij wartość ciasteczka sesji (np. "PHPSESSID=abc123")
        const ltSessionCookie = ltCookieRaw.split(';')[0];

        // Sparsuj ukryte pola HTML (CSRF tokeny itp.)
        const hiddenFields: Record<string, string> = {};
        const re = /<input[^>]*type\s*=\s*["']hidden["'][^>]*>/gi;
        let match;
        while ((match = re.exec(html)) !== null) {
            const nameMatch = match[0].match(/name\s*=\s*["']([^"']+)["']/);
            const valMatch = match[0].match(/value\s*=\s*["']([^"']*?)["']/);
            if (nameMatch) hiddenFields[nameMatch[1]] = valMatch ? valMatch[1] : '';
        }

        // Zbuduj body formularza
        let formBody = `username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
        for (const [k, v] of Object.entries(hiddenFields)) {
            formBody += `&${encodeURIComponent(k)}=${encodeURIComponent(v)}`;
        }

        // Krok 2: POST do Leantime z sesją z kroku 1
        const postRes = await fetch(`${LEANTIME_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'LeanMobile/1.0',
                ...(ltSessionCookie ? { Cookie: ltSessionCookie } : {}),
            },
            body: formBody,
            redirect: 'manual', // nie podążaj za redirectem — analizuj sami
        });

        const location = postRes.headers.get('location') || '';
        const postSetCookie = postRes.headers.get('set-cookie') || '';
        const status = postRes.status;

        // Sprawdź czy logowanie się udało (Leantime robi redirect 302 do /dashboard)
        let ok = false;
        if (location.includes('/dashboard') || location.includes('/tickets')) ok = true;
        else if ((status === 302 || status === 301) && location && !location.includes('/auth/')) ok = true;
        else if (postRes.ok) {
            const body = await postRes.text().catch(() => '');
            if (!body.includes('loginForm') && !body.includes('name="password"') && !body.includes('notification-error')) {
                ok = true;
            }
        }

        const headers = new Headers({ 'Content-Type': 'application/json' });

        if (ok) {
            // Zapisz sesję Leantime w naszym własnym ciasteczku na domenie Railway
            // (bo ciasteczka projekty.limanczyk.pl nie działają na railway.app)
            const sessionValue = (postSetCookie || ltSessionCookie).split(';')[0];
            headers.set(
                'set-cookie',
                `lt_sess=${encodeURIComponent(sessionValue)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`
            );
        }

        return new NextResponse(JSON.stringify({ ok }), { status: 200, headers });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Błąd serwera';
        return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
}
