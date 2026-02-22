'use client';

import { useEffect, useRef, useState } from 'react';

// ─── Globalny system toastów ─────────────────────────────────

type ToastFn = (msg: string, type?: 'success' | 'error' | 'info') => void;
let _toast: ToastFn = () => { };
export function showToast(msg: string, type: 'success' | 'error' | 'info' = 'success') {
    _toast(msg, type);
}

interface ToastItem {
    id: number;
    msg: string;
    type: 'success' | 'error' | 'info';
}

export default function Toast() {
    const [items, setItems] = useState<ToastItem[]>([]);
    const counter = useRef(0);

    useEffect(() => {
        _toast = (msg, type = 'success') => {
            const id = ++counter.current;
            setItems((prev) => [...prev, { id, msg, type }]);
            setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 2800);
        };
    }, []);

    return (
        <div style={{
            position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
            zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 8,
            pointerEvents: 'none', width: 'calc(100vw - 32px)', maxWidth: 480,
        }}>
            {items.map((t) => (
                <div key={t.id} style={{
                    background: '#1E1E1E',
                    color: '#fff',
                    padding: '10px 18px',
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 600,
                    boxShadow: '0 4px 24px rgba(0,0,0,0.55)',
                    borderLeft: `4px solid ${t.type === 'error' ? '#EB5757' : t.type === 'info' ? '#4DA6FF' : '#F06A4D'}`,
                    animation: 'toastIn 0.25s ease',
                    lineHeight: 1.4,
                }}>
                    {t.msg}
                </div>
            ))}
        </div>
    );
}
