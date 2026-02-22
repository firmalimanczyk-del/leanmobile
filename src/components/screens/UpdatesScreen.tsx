'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { apiGetProjectUpdates, apiDeleteProjectUpdate, PROJECT_STATUS_LABEL, fmtDateTime, getCommentAuthor } from '@/lib/leantime-api';
import { showToast } from '@/components/ui/Toast';
import styles from './Screen.module.css';

export default function UpdatesScreen() {
    const { currentProject, projectUpdates, setProjectUpdates, navigate, allUsers, setEditingCommentId, loadingUpdates, setLoadingUpdates, myUserId } = useAppStore();
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [confirmId, setConfirmId] = useState<string | null>(null);

    const load = async () => {
        if (!currentProject || loadingUpdates) return;
        setLoadingUpdates(true);
        try {
            const data = await apiGetProjectUpdates(currentProject.id);
            setProjectUpdates(data);
        } catch (e) {
            showToast(e instanceof Error ? e.message : 'Błąd', 'error');
        } finally {
            setLoadingUpdates(false);
        }
    };

    useEffect(() => { load(); }, [currentProject?.id]);

    const handleDelete = async (commentId: string) => {
        if (confirmId !== commentId) {
            // Pierwsze kliknięcie — pokaż potwierdzenie
            setConfirmId(commentId);
            return;
        }
        // Drugie kliknięcie — usuń
        setConfirmId(null);
        setDeletingId(commentId);
        try {
            await apiDeleteProjectUpdate(commentId);
            setProjectUpdates(projectUpdates.filter(u => String(u.id) !== commentId));
            showToast('Aktualizacja usunięta ✓');
        } catch (e) {
            showToast(e instanceof Error ? e.message : 'Błąd usuwania', 'error');
        } finally {
            setDeletingId(null);
        }
    };

    const projName = currentProject?.name || currentProject?.projectName || 'Projekt';

    return (
        <div className={styles.screen}>
            <header className={styles.header}>
                <button className={`${styles.hbtn} ${styles.hbtnBack}`} onClick={() => navigate('tasks')}>‹</button>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <h1 className={styles.headerTitle}>Aktualizacje</h1>
                    <span className={styles.headerSub}>{projName}</span>
                </div>
                <button className={styles.hbtn} onClick={load} disabled={loadingUpdates}>🔄</button>
                <button className={`${styles.hbtn} ${styles.hbtnPrimary}`} style={{ fontSize: 16 }} onClick={() => navigate('addUpdate')}>+</button>
            </header>

            <div className={styles.listNoTab}>
                {loadingUpdates && <div className={styles.empty}><div className={styles.spinner} /><br />Ładowanie...</div>}
                {!loadingUpdates && !projectUpdates.length && (
                    <div className={styles.empty}>
                        Brak aktualizacji projektu<br />
                        <button className={`${styles.btn} ${styles.btnPrimary}`} style={{ width: 'auto', padding: '10px 24px', marginTop: 16 }} onClick={() => navigate('addUpdate')}>Dodaj pierwszą aktualizację</button>
                    </div>
                )}
                {!loadingUpdates && projectUpdates.map(u => {
                    const sn = Number(u.status ?? 0) as 0 | 1 | 2;
                    const sl = PROJECT_STATUS_LABEL[sn] || PROJECT_STATUS_LABEL[0];
                    const author = getCommentAuthor(u, allUsers);
                    const text = (u.text || u.description || u.comment || '').trim();
                    const date = u.date || u.created || '';
                    const uid = String(u.id);
                    const isDeleting = deletingId === uid;
                    const isConfirming = confirmId === uid;

                    return (
                        <div
                            key={u.id}
                            className={styles.updateCard}
                            style={{
                                borderLeftColor: sl.c,
                                opacity: isDeleting ? 0.4 : 1,
                                transition: 'opacity 0.2s ease',
                            }}
                        >
                            <div className={styles.updateHeader}>
                                <div className={styles.updateDot} style={{ background: sl.c, color: sl.c }} />
                                <span className={styles.updateStatusLabel} style={{ color: sl.c }}>{sl.l}</span>
                                {date && <span className={styles.updateDate}>{fmtDateTime(date)}</span>}
                            </div>
                            <div className={styles.updateMeta}>
                                {author && <span className={styles.updateAuthor}>👤 {author}</span>}
                                <div className={styles.updateActions}>
                                    {/* Edytuj */}
                                    <button
                                        onClick={() => { setConfirmId(null); setEditingCommentId(uid); navigate('addUpdate'); }}
                                        title="Edytuj"
                                        disabled={isDeleting}
                                    >✏️</button>
                                    {/* Usuń */}
                                    {!isConfirming ? (
                                        <button
                                            onClick={() => handleDelete(uid)}
                                            title="Usuń"
                                            disabled={isDeleting}
                                            style={{ color: 'var(--red)' }}
                                        >
                                            {isDeleting ? '⏳' : '🗑️'}
                                        </button>
                                    ) : (
                                        /* Potwierdzenie inline */
                                        <>
                                            <button
                                                onClick={() => handleDelete(uid)}
                                                style={{ color: '#fff', background: 'var(--red)', borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 700 }}
                                                title="Potwierdź usunięcie"
                                            >Usuń?</button>
                                            <button
                                                onClick={() => setConfirmId(null)}
                                                style={{ color: 'var(--text-3)', fontSize: 13 }}
                                                title="Anuluj"
                                            >✕</button>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className={styles.updateText} dangerouslySetInnerHTML={{ __html: text }} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
