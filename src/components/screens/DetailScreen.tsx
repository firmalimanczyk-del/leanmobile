'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { apiChangeStatus, apiDeleteTask, DONE_STATUSES, fmtDate, fmtDateTime } from '@/lib/leantime-api';
import { showToast } from '@/components/ui/Toast';
import styles from './Screen.module.css';

const PRIO_LABEL: Record<string, { l: string; c: string }> = {
    critical: { l: 'Krytyczny', c: '#c0392b' }, high: { l: 'Wysoki', c: '#e74c3c' },
    medium: { l: 'Średni', c: '#f37021' }, low: { l: 'Niski', c: '#27ae60' },
    lowest: { l: 'Najniższy', c: '#3498db' },
};

export default function DetailScreen() {
    const { currentDetailTask: t, detailReturn, statusList, navigate, updateTaskInStore, removeTaskFromStore, allProjects } = useAppStore();
    const [savingStatus, setSavingStatus] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);

    if (!t) return null;

    const pr = t.priority ? PRIO_LABEL[t.priority] : null;
    const pn = t.projectName || allProjects.find(p => String(p.id) === String(t.projectId))?.name || '';

    const changeStatus = async (newStatus: string) => {
        if (savingStatus) return;
        setSavingStatus(true);
        try {
            await apiChangeStatus(t.id, newStatus);
            updateTaskInStore(t.id, { status: newStatus });
            showToast(`Status: ${statusList.find(s => s.v === newStatus)?.l || newStatus} ✓`);
            if (DONE_STATUSES.has(newStatus)) {
                setTimeout(() => navigate(detailReturn === 'todos' ? 'todos' : 'tasks'), 500);
            }
        } catch (e) {
            showToast(e instanceof Error ? e.message : 'Błąd', 'error');
        } finally {
            setSavingStatus(false);
        }
    };

    const deleteTask = async () => {
        if (deleting) return;
        setDeleting(true);
        try {
            await apiDeleteTask(t.id);
            removeTaskFromStore(t.id);
            showToast('Zadanie usunięte ✓');
            navigate(detailReturn === 'todos' ? 'todos' : 'tasks');
        } catch (e) {
            showToast(e instanceof Error ? e.message : 'Błąd', 'error');
            setDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    return (
        <div className={styles.screen}>
            <header className={styles.header}>
                <button id="detail-back" className={`${styles.hbtn} ${styles.hbtnBack}`} onClick={() => navigate(detailReturn === 'todos' ? 'todos' : 'tasks')} aria-label="Wróć">‹</button>
                <h1 className={styles.headerTitle}>#{t.id}</h1>
                <button id="detail-edit" className={styles.hbtn} onClick={() => navigate('editTask')} style={{ fontSize: 14 }}>✏️</button>
            </header>

            <div className={styles.listNoTab}>
                {/* Tytuł + projekt */}
                <div className={styles.detailSection}>
                    {pn && <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8 }}>{pn}</div>}
                    <h2 style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.4, marginBottom: 12 }}>{t.headline || t.title || ''}</h2>
                    {pr && (
                        <div style={{ marginBottom: 12 }}>
                            <span style={{ background: `${pr.c}22`, color: pr.c, padding: '4px 12px', borderRadius: 6, fontSize: 13, fontWeight: 600 }}>{pr.l}</span>
                        </div>
                    )}
                </div>

                {/* Status */}
                <div className={styles.detailSection}>
                    <div className={styles.detailSectionTitle}>Status</div>
                    <div className={`${styles.statusPills} ${savingStatus ? styles.statusPillsSaving : ''}`}>
                        {statusList.map(s => {
                            const active = String(t.status) === s.v;
                            return (
                                <button
                                    key={s.v}
                                    id={`status-pill-${s.v}`}
                                    className={`${styles.statusPill} ${active ? styles.active : ''}`}
                                    style={active ? { background: s.c, borderColor: s.c } : { color: s.c, borderColor: `${s.c}44` }}
                                    onClick={() => changeStatus(s.v)}
                                >
                                    {s.l}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Opis */}
                {t.description && (
                    <div className={styles.detailSection}>
                        <div className={styles.detailSectionTitle}>Opis</div>
                        <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text)' }} dangerouslySetInnerHTML={{ __html: t.description }} />
                    </div>
                )}

                {/* Szczegóły */}
                <div className={styles.detailSection}>
                    <div className={styles.detailSectionTitle}>Szczegóły</div>
                    {t.editorFirstname && (
                        <div className={styles.detailRow}><span className={styles.detailRowLabel}>Przypisany</span><span className={styles.detailRowValue}>{t.editorFirstname} {t.editorLastname || ''}</span></div>
                    )}
                    {t.userFirstname && (
                        <div className={styles.detailRow}><span className={styles.detailRowLabel}>Autor</span><span className={styles.detailRowValue}>{t.userFirstname} {t.userLastname || ''}</span></div>
                    )}
                    {t.dateToFinish && t.dateToFinish !== '0000-00-00 00:00:00' && (
                        <div className={styles.detailRow}><span className={styles.detailRowLabel}>Termin</span><span className={styles.detailRowValue}>{fmtDate(t.dateToFinish)}</span></div>
                    )}
                    {t.editFrom && t.editFrom !== '0000-00-00 00:00:00' && (
                        <div className={styles.detailRow}><span className={styles.detailRowLabel}>Plan start</span><span className={styles.detailRowValue}>{fmtDateTime(t.editFrom)}</span></div>
                    )}
                    {t.editTo && t.editTo !== '0000-00-00 00:00:00' && (
                        <div className={styles.detailRow}><span className={styles.detailRowLabel}>Plan koniec</span><span className={styles.detailRowValue}>{fmtDateTime(t.editTo)}</span></div>
                    )}
                    {t.date && (
                        <div className={styles.detailRow}><span className={styles.detailRowLabel}>Utworzono</span><span className={styles.detailRowValue}>{fmtDate(t.date)}</span></div>
                    )}
                    {t.type && (
                        <div className={styles.detailRow}><span className={styles.detailRowLabel}>Typ</span><span className={styles.detailRowValue}>{t.type}</span></div>
                    )}
                </div>

                {/* Akcje */}
                <div style={{ padding: '16px', display: 'flex', gap: 10 }}>
                    <button id="detail-edit-btn" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => navigate('editTask')} style={{ flex: 1, border: '2px solid var(--amber)', color: 'var(--amber)' }}>
                        ✏️ Edytuj
                    </button>
                </div>

                {/* Usuń */}
                <div style={{ padding: '0 16px 32px' }}>
                    {!showDeleteConfirm ? (
                        <button id="detail-delete" className={`${styles.btn} ${styles.btnDanger}`} onClick={() => setShowDeleteConfirm(true)}>🗑️ Usuń zadanie</button>
                    ) : (
                        <div className={styles.confirmDelete}>
                            <p>Usunąć zadanie &quot;{t.headline || t.title}&quot;? Tej operacji nie można cofnąć.</p>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                                <button className={`${styles.btn} ${styles.btnDanger}`} style={{ width: 'auto', padding: '10px 20px' }} onClick={deleteTask} disabled={deleting}>{deleting ? 'Usuwanie...' : 'Usuń'}</button>
                                <button className={`${styles.btn} ${styles.btnSecondary}`} style={{ width: 'auto', padding: '10px 20px' }} onClick={() => setShowDeleteConfirm(false)}>Anuluj</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
