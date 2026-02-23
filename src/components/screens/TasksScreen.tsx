'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { apiGetProjectTasks, PROJECT_STATUS_LABEL, fmtDateTime, fmtDate } from '@/lib/leantime-api';
import type { LtTask } from '@/lib/leantime-api';
import { showToast } from '@/components/ui/Toast';
import StatusSheet from '@/components/ui/StatusSheet';
import KanbanBoard from './KanbanBoard';
import styles from './Screen.module.css';

type UpdateLike = { status?: string | number; date?: string; text?: string; description?: string; comment?: string };

function StatusBanner({ latest, onHistory }: { latest: UpdateLike | null | undefined; onHistory: () => void }) {
    if (latest === undefined) return (
        <div className={styles.statusPreview} style={{ borderLeftColor: '#ccc' }}>
            <div className={styles.spContent}>
                <div className={styles.spTop}><div className={styles.spDot} style={{ background: '#ccc' }} /><span className={styles.spLabel} style={{ color: '#aaa' }}>Ładowanie aktualizacji…</span></div>
            </div>
        </div>
    );
    if (!latest) return (
        <div className={styles.spEmpty} onClick={onHistory}>
            <div style={{ fontSize: 20 }}>📊</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-2)', flex: 1 }}>Dodaj aktualizację projektu</div>
            <div style={{ color: 'var(--text-3)', fontSize: 18 }}>›</div>
        </div>
    );
    const sn = Number(latest.status ?? 0) as 0 | 1 | 2;
    const sl = PROJECT_STATUS_LABEL[sn] || PROJECT_STATUS_LABEL[0];
    const text = (latest.text || latest.description || latest.comment || '').replace(/<[^>]*>/g, '').trim();
    return (
        <div className={styles.statusPreview} style={{ borderLeftColor: sl.c }}>
            <div className={styles.spContent}>
                <div className={styles.spTop}>
                    <div className={styles.spDot} style={{ background: sl.c }} />
                    <span className={styles.spLabel} style={{ color: sl.c }}>{sl.l}</span>
                    {latest.date && <span className={styles.spDate}>{fmtDateTime(latest.date)}</span>}
                </div>
                {text && <div className={styles.spText}>{text.substring(0, 120)}</div>}
            </div>
            <div className={styles.spHistory} onClick={(e) => { e.stopPropagation(); onHistory(); }} title="Historia aktualizacji">📋</div>
        </div>
    );
}

export default function TasksScreen() {
    const {
        currentProject, currentTasks, setCurrentTasks, statusList,
        navigate, setCurrentDetailTask, setDetailReturn, projectUpdates,
        setProjectUpdates, loadingTasks, setLoadingTasks,
        projectTasksView, setProjectTasksView
    } = useAppStore();

    const [sheetTask, setSheetTask] = useState<LtTask | null>(null);

    const load = async () => {
        if (!currentProject || loadingTasks) return;
        setLoadingTasks(true);
        try {
            const tasks = await apiGetProjectTasks(currentProject.id);
            setCurrentTasks(tasks);
        } catch (e) {
            showToast(e instanceof Error ? e.message : 'Błąd', 'error');
        } finally {
            setLoadingTasks(false);
        }
    };

    useEffect(() => { load(); }, [currentProject?.id]);

    const statusMap = Object.fromEntries(statusList.map(s => [s.v, s]));
    const PRIO_COLORS: Record<string, string> = { critical: '#c0392b', high: '#e74c3c', medium: '#f37021', low: '#27ae60', lowest: '#3498db' };

    // Grupuj zadania wg statusu
    const grouped: Record<string, typeof currentTasks> = {};
    currentTasks.forEach(t => {
        const s = String(t.status ?? '3');
        if (!grouped[s]) grouped[s] = [];
        grouped[s].push(t);
    });
    const order = statusList.map(s => s.v);
    const keys = Array.from(new Set([...order.filter(k => grouped[k]), ...Object.keys(grouped)]));

    const showTask = (t: typeof currentTasks[0]) => {
        setCurrentDetailTask(t);
        setDetailReturn('tasks');
        navigate('detail');
    };

    const goUpdates = async () => {
        navigate('updates');
    };

    const projName = currentProject?.name || currentProject?.projectName || `Projekt #${currentProject?.id}`;
    const latest = projectUpdates.length > 0 ? projectUpdates[0] : (projectUpdates.length === 0 ? null : undefined);

    return (
        <div className={styles.screen}>
            <header className={styles.header}>
                <button id="tasks-back" className={`${styles.hbtn} ${styles.hbtnBack}`} onClick={() => navigate('projects')} aria-label="Wróć">‹</button>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <h1 className={styles.headerTitle}>{projName}</h1>
                    <span className={styles.headerSub}>{currentTasks.length} zadań</span>
                </div>
                <button
                    id="tasks-view-toggle"
                    className={styles.hbtn}
                    onClick={() => setProjectTasksView(projectTasksView === 'list' ? 'board' : 'list')}
                    title={projectTasksView === 'list' ? 'Widok Kanban' : 'Widok Listy'}
                >
                    {projectTasksView === 'list' ? '📊' : '📋'}
                </button>
                <button id="tasks-add" className={`${styles.hbtn} ${styles.hbtnPrimary}`} onClick={() => navigate('addTask')}>+</button>
            </header>

            <div className={`${styles.list} ${projectTasksView === 'board' ? styles.noPadBottom : ''}`} style={projectTasksView === 'board' ? { padding: 0 } : {}}>
                <div style={{ padding: projectTasksView === 'board' ? '16px 16px 0' : 0 }}>
                    <StatusBanner latest={latest} onHistory={goUpdates} />
                </div>

                {loadingTasks && <div className={styles.empty}><div className={styles.spinner} /><br />Ładowanie zadań...</div>}

                {!loadingTasks && !currentTasks.length && (
                    <div className={styles.empty}>
                        Brak zadań<br />
                        <button className={`${styles.btn} ${styles.btnPrimary}`} style={{ width: 'auto', padding: '10px 24px', marginTop: 16 }} onClick={() => navigate('addTask')}>Dodaj zadanie</button>
                    </div>
                )}

                {!loadingTasks && currentTasks.length > 0 && projectTasksView === 'board' && (
                    <KanbanBoard
                        tasks={currentTasks}
                        statusList={statusList}
                        onTaskClick={showTask}
                        onTaskPress={(t) => setSheetTask(t)}
                    />
                )}

                {!loadingTasks && currentTasks.length > 0 && projectTasksView === 'list' && keys.map(s => {
                    const tasks = grouped[s]; if (!tasks) return null;
                    const st = statusMap[s] || { l: `Status ${s}`, c: '#94a3b8' };
                    return (
                        <div key={s}>
                            <div className={styles.statusHeader}>
                                <div className={styles.statusDot} style={{ background: st.c }} />
                                <span className={styles.statusLabel}>{st.l}</span>
                                <span className={styles.statusCount}>{tasks.length}</span>
                            </div>
                            {tasks.map(t => {
                                const pr = t.priority ? PRIO_COLORS[t.priority] : null;
                                return (
                                    <div key={t.id} id={`task-${t.id}`} className={styles.tCard} onClick={() => showTask(t)}>
                                        <div className={styles.tTop}>
                                            <span className={styles.tId}>#{t.id}</span>
                                            {pr && t.priority && <span className={styles.tPrio} style={{ color: pr, borderColor: pr }}>{t.priority}</span>}
                                        </div>
                                        <div className={styles.tTitle}>{t.headline || t.title || 'Bez tytułu'}</div>
                                        {t.editorFirstname && <div className={styles.tMeta}>👤 {t.editorFirstname} {t.editorLastname || ''}</div>}
                                        {t.dateToFinish && t.dateToFinish !== '0000-00-00 00:00:00' && (
                                            <div className={styles.tMeta}>📅 {fmtDate(t.dateToFinish)}</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>

            {sheetTask && (
                <StatusSheet task={sheetTask as never} statusList={statusList} onClose={() => setSheetTask(null)} />
            )}
        </div>
    );
}
