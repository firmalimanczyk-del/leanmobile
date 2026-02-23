'use client';

import { useRef, useState } from 'react';
import { useAppStore } from '@/lib/store';
import type { LtTask, LtStatusLabel } from '@/lib/leantime-api';
import { fmtDate } from '@/lib/leantime-api';
import styles from './Screen.module.css';

interface KanbanBoardProps {
    tasks: LtTask[];
    statusList: LtStatusLabel[];
    onTaskClick: (task: LtTask) => void;
    onTaskPress: (task: LtTask) => void;
}

const PRIO_COLORS: Record<string, string> = { critical: '#c0392b', high: '#e74c3c', medium: '#f37021', low: '#27ae60', lowest: '#3498db' };

export default function KanbanBoard({ tasks, statusList, onTaskClick, onTaskPress }: KanbanBoardProps) {
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const startPress = (t: LtTask) => {
        longPressTimer.current = setTimeout(() => onTaskPress(t), 500);
    };

    const cancelPress = () => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };

    // Grupowanie
    const grouped: Record<string, LtTask[]> = {};
    tasks.forEach(t => {
        const s = String(t.status ?? '3');
        if (!grouped[s]) grouped[s] = [];
        grouped[s].push(t);
    });

    const statusMap = Object.fromEntries(statusList.map(s => [s.v, s]));
    const order = statusList.map(s => s.v);
    const keys = Array.from(new Set([...order.filter(k => grouped[k]), ...Object.keys(grouped)]));

    if (keys.length === 0) return null;

    return (
        <div className={styles.kanbanBoard}>
            {keys.map(s => {
                const colTasks = grouped[s] || [];
                const st = statusMap[s] || { l: `Status ${s}`, c: '#94a3b8' };

                return (
                    <div key={s} className={styles.kCol}>
                        <div className={styles.kHeader}>
                            <div className={styles.statusDot} style={{ background: st.c }} />
                            <span className={styles.statusLabel}>{st.l}</span>
                            <span className={styles.statusCount}>{colTasks.length}</span>
                        </div>
                        <div className={styles.kList}>
                            {colTasks.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 13, color: 'var(--text-4)' }}>Brak zadań</div>
                            )}
                            {colTasks.map(t => {
                                const pr = t.priority ? PRIO_COLORS[t.priority] : null;

                                return (
                                    <div
                                        key={t.id}
                                        className={styles.tCard}
                                        style={{ marginBottom: 0 }}
                                        onClick={() => onTaskClick(t)}
                                        onPointerDown={() => startPress(t)}
                                        onPointerUp={cancelPress}
                                        onPointerLeave={cancelPress}
                                        onContextMenu={(e) => { e.preventDefault(); onTaskPress(t); }}
                                    >
                                        <div className={styles.tTop}>
                                            <span className={styles.tId}>#{t.id}</span>
                                            {pr && t.priority && <span className={styles.tPrio} style={{ color: pr, borderColor: pr }}>{t.priority}</span>}
                                        </div>
                                        <div className={styles.tTitle}>{t.headline || t.title || 'Bez tytułu'}</div>
                                        {t.editorFirstname && <div className={styles.tMeta} style={{ marginTop: 8 }}>👤 {t.editorFirstname} {t.editorLastname || ''}</div>}
                                        {t.dateToFinish && t.dateToFinish !== '0000-00-00 00:00:00' && (
                                            <div className={styles.tMeta}>📅 {fmtDate(t.dateToFinish)}</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
