'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { apiGetProjectUpdates, PROJECT_STATUS_LABEL, fmtDateTime, getCommentAuthor } from '@/lib/leantime-api';
import { showToast } from '@/components/ui/Toast';
import styles from './Screen.module.css';

export default function UpdatesScreen() {
    const { currentProject, projectUpdates, setProjectUpdates, navigate, allUsers, setEditingCommentId, loadingUpdates, setLoadingUpdates } = useAppStore();

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

    const projName = currentProject?.name || currentProject?.projectName || 'Projekt';

    return (
        <div className={styles.screen}>
            <header className={styles.header}>
                <button className={`${styles.hbtn} ${styles.hbtnBack}`} onClick={() => navigate('tasks')}>‹</button>
                <h1 className={styles.headerTitle}>Aktualizacje</h1>
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
                    return (
                        <div key={u.id} className={styles.updateCard} style={{ borderLeftColor: sl.c }}>
                            <div className={styles.updateHeader}>
                                <div className={styles.updateDot} style={{ background: sl.c }} />
                                <span className={styles.updateStatusLabel} style={{ color: sl.c }}>{sl.l}</span>
                                {date && <span className={styles.updateDate}>{fmtDateTime(date)}</span>}
                            </div>
                            <div className={styles.updateMeta}>
                                {author && <span className={styles.updateAuthor}>👤 {author}</span>}
                                <div className={styles.updateActions}>
                                    <button onClick={() => { setEditingCommentId(String(u.id)); navigate('addUpdate'); }} title="Edytuj">✏️</button>
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
