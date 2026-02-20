// ============================================================
// app/api/auth/me/route.ts
// Zwraca dane zalogowanego użytkownika przez sesję Leantime
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

const LEANTIME_URL = (process.env.LEANTIME_URL || '').replace(/\/$/, '');
const API_KEY = process.env.LEANTIME_API_KEY || '';

export async function GET(req: NextRequest) {
    try {
        const cookies = req.headers.get('cookie') || '';
        const ltSessMatch = cookies.match(/lt_sess=([^;]+)/);
        const ltSession = ltSessMatch ? decodeURIComponent(ltSessMatch[1]) : '';

        if (!ltSession) {
            return NextResponse.json({ ok: false, error: 'Brak sesji' }, { status: 401 });
        }

        // Wywołaj JSON-RPC leantime.rpc.users.getUser (aktualny użytkownik)
        const body = {
            jsonrpc: '2.0',
            method: 'leantime.rpc.users.getUser',
            id: 'me',
            params: {},
        };

        const res = await fetch(`${LEANTIME_URL}/api/jsonrpc`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY,
                Cookie: ltSession,
            },
            body: JSON.stringify(body),
        });

        const data = await res.json();

        if (data.result && data.result.id) {
            const u = data.result;
            return NextResponse.json({
                ok: true,
                id: String(u.id),
                firstname: u.firstname || '',
                lastname: u.lastname || '',
                username: u.username || u.email || '',
                email: u.email || u.username || '',
            });
        }

        // Fallback: spróbuj leantime.rpc.auth.currentUser
        const body2 = {
            jsonrpc: '2.0',
            method: 'leantime.rpc.auth.currentUser',
            id: 'me2',
            params: {},
        };
        const res2 = await fetch(`${LEANTIME_URL}/api/jsonrpc`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY,
                Cookie: ltSession,
            },
            body: JSON.stringify(body2),
        });
        const data2 = await res2.json();
        if (data2.result && data2.result.id) {
            const u = data2.result;
            return NextResponse.json({
                ok: true,
                id: String(u.id),
                firstname: u.firstname || '',
                lastname: u.lastname || '',
                username: u.username || u.email || '',
                email: u.email || u.username || '',
            });
        }

        return NextResponse.json({ ok: false, error: 'Nie udało się pobrać użytkownika', raw: data }, { status: 200 });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Błąd serwera';
        return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
}
