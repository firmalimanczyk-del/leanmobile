'use client';

import { useState, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { apiLogin, apiGetUsers, toArr } from '@/lib/leantime-api';
import { showToast } from '@/components/ui/Toast';
import styles from './LoginScreen.module.css';

export default function LoginScreen() {
    const { setUser, navigate, setAllUsers } = useAppStore();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const pwRef = useRef<HTMLInputElement>(null);

    const handleLogin = async () => {
        if (!email || !password) { setError('Podaj email i hasło'); return; }
        setLoading(true);
        setError('');
        try {
            const ok = await apiLogin(email, password);
            if (!ok) { setError('Nieprawidłowy email lub hasło'); setLoading(false); return; }

            // Krok 1: Pobierz dane zalogowanego użytkownika z sesji (/api/auth/me)
            let userId = '';
            let name = '';
            try {
                const meRes = await fetch('/api/auth/me', { credentials: 'same-origin' });
                if (meRes.ok) {
                    const me = await meRes.json();
                    if (me.ok && me.id) {
                        userId = String(me.id);
                        name = `${me.firstname || ''} ${me.lastname || ''}`.trim() || me.username || me.email || email;
                    }
                }
            } catch { /* kontynuuj */ }

            // Krok 2: Jeśli /me nie zadziałało, spróbuj przez listę użytkowników
            if (!userId) {
                let users: import('@/lib/leantime-api').LtUser[] = [];
                try {
                    users = await apiGetUsers();
                    setAllUsers(users);
                } catch { /* kontynuuj nawet bez listy user */ }

                const user = users.find((u: { username?: string; email?: string }) =>
                    (u.username || u.email || '').toLowerCase() === email.toLowerCase()
                );
                userId = user?.id ? String(user.id) : email;
                name = user
                    ? `${user.firstname || ''} ${user.lastname || ''}`.trim() || email
                    : email;

                // Zapisz users do store jeśli nie zapisano jeszcze
                if (users.length) setAllUsers(users);
            } else {
                // Załaduj users do store w tle (nie blokuj)
                apiGetUsers().then(u => setAllUsers(u)).catch(() => { });
            }

            setUser(userId, name, email);
            showToast(`Zalogowano jako ${name} ✓`);
            navigate('todos');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Błąd logowania');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.wrap}>
            <div className={styles.card}>
                <div className={styles.logo}>LeanMobile</div>
                <h1 className={styles.tagline}>Zaloguj się do Leantime</h1>

                <div className={styles.field}>
                    <label htmlFor="login-email">Email</label>
                    <input
                        id="login-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && pwRef.current?.focus()}
                        placeholder="twoj@email.pl"
                        autoComplete="username"
                        autoCapitalize="none"
                        disabled={loading}
                    />
                </div>

                <div className={styles.field}>
                    <label htmlFor="login-password">Hasło</label>
                    <div className={styles.pwWrap}>
                        <input
                            id="login-password"
                            ref={pwRef}
                            type={showPw ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                            placeholder="••••••••"
                            autoComplete="current-password"
                            disabled={loading}
                        />
                        <button
                            type="button"
                            className={styles.pwToggle}
                            onClick={() => setShowPw(!showPw)}
                            aria-label={showPw ? 'Ukryj hasło' : 'Pokaż hasło'}
                        >
                            {showPw ? '🔒' : '👁'}
                        </button>
                    </div>
                </div>

                {error && <div className={styles.error}>{error}</div>}

                <button
                    id="login-submit"
                    className={styles.btn}
                    onClick={handleLogin}
                    disabled={loading}
                >
                    {loading ? (
                        <><span className={styles.spinner} /> Logowanie...</>
                    ) : 'Zaloguj się'}
                </button>
            </div>
        </div>
    );
}
