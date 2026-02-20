'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { apiGetAllTasks, DONE_STATUSES, fmtShort, dsDate } from '@/lib/leantime-api';
import { showToast } from '@/components/ui/Toast';
import TabBar from '@/components/ui/TabBar';
import styles from './Screen.module.css';

interface Group { overdue: TaskItem[]; thisweek: TaskItem[]; later: TaskItem[]; nodate: TaskItem[] }
interface TaskItem { id: string | number; headline?: string; title?: string; status?: string | number; priority?: string; projectId?: string | number; projectName?: string; dateToFinish?: string; editorId?: string | number; userId?: string | number; responsible?: string | number }

const TZ = 'Europe/Warsaw';
const PRIO_COLORS: Record<string, string> = { critical: '#c0392b', high: '#e74c3c', medium: '#f37021', low: '#27ae60', lowest: '#3498db' };

function nowStr() { return new Date().toLocaleDateString('en-CA', { timeZone: TZ }); }
function eowStr() { const d = new Date(); d.setDate(d.getDate() + (7 - d.getDay())); return d.toLocaleDateString('en-CA', { timeZone: TZ }); }

export default function TodosScreen() {
    const { myUserId, myUserName, myUserEmail, allProjects, statusList, myTodos, setMyTodos, navigate, setCurrentDetailTask, setDetailReturn, clearUser, loadingTodos, setLoadingTodos } = useAppStore();
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

    const getInitials = () => (myUserName ? myUserName.split(' ').map((w: string) => w[0] || '').join('').toUpperCase().slice(0, 2) : '?');

    const activeProjectIds = new Set(
        allProjects.filter(p => { const s = p.state != null ? +p.state : 0; return s !== 1 && s !== -1 && p.status !== 'closed' && p.status !== 'archived'; }).map(p => String(p.id))
    );

    const load = async () => {
        if (loadingTodos) return;
        setLoadingTodos(true);
        try {
            const all = await apiGetAllTasks();
            const mine = all.filter(t => {
                const m = String(t.editorId) === String(myUserId) || String(t.userId) === String(myUserId) || String(t.responsible) === String(myUserId);
                return m && activeProjectIds.has(String(t.projectId));
            });
            setMyTodos(mine);
        } catch (e) {
            showToast(e instanceof Error ? e.message : 'Błąd', 'error');
        } finally {
            setLoadingTodos(false);
        }
    };

    useEffect(() => { if (!myTodos.length) load(); }, []);

    const open = myTodos.filter(t => !DONE_STATUSES.has(String(t.status)));
    const today = nowStr(); const eow = eowStr();
    const g: Group = { overdue: [], thisweek: [], later: [], nodate: [] };
    open.forEach(t => {
        const d = dsDate(t.dateToFinish);
        if (!d) g.nodate.push(t);
        else if (d < today) g.overdue.push(t);
        else if (d <= eow) g.thisweek.push(t);
        else g.later.push(t);
    });

    const statusMap = Object.fromEntries(statusList.map(s => [s.v, s]));

    const showTask = (t: TaskItem) => {
        setCurrentDetailTask(t as never);
        setDetailReturn('todos');
        navigate('detail');
    };

    const sections = [
        { key: 'overdue', icon: '🔥', label: 'Zaległe', tasks: g.overdue },
        { key: 'thisweek', icon: '⏰', label: 'Ten tydzień', tasks: g.thisweek },
        { key: 'later', icon: '📅', label: 'Później', tasks: g.later },
        { key: 'nodate', icon: '📌', label: 'Bez terminu', tasks: g.nodate },
    ];

    return (
        <div className={styles.screen}>
            {/* Header */}
            <header className={styles.header}>
                <h1 className={styles.headerTitle}>Moje zadania</h1>
                <button id="todos-refresh" className={styles.hbtn} onClick={load} aria-label="Odśwież" disabled={loadingTodos}>🔄</button>
                <button id="todos-add" className={`${styles.hbtn} ${styles.hbtnPrimary}`} onClick={() => navigate('addTask')} aria-label="Dodaj zadanie">+</button>
                <button id="todos-avatar" className={styles.avatarBtn} onClick={() => { if (confirm(`Wylogować ${myUserName}?`)) { clearUser(); showToast('Wylogowano'); } }}>{getInitials()}</button>
            </header>

            {/* List */}
            <div className={styles.list}>
                {loadingTodos && (
                    <div className={styles.empty}><div className={styles.spinner} /><br />Ładowanie...</div>
                )}
                {!loadingTodos && !open.length && (
                    <div className={styles.empty}>🎉 Brak otwartych zadań!</div>
                )}
                {!loadingTodos && sections.map(({ key, icon, label, tasks }) => {
                    if (!tasks.length) return null;
                    const col = collapsed[key];
                    return (
                        <div key={key}>
                            <div className={`${styles.sectionHeader} ${col ? styles.collapsed : ''}`} onClick={() => setCollapsed(p => ({ ...p, [key]: !p[key] }))}>
                                <span>{icon}</span>
                                <span className={styles.sectionTitle}>{label}</span>
                                <span className={styles.sectionCount}>{tasks.length}</span>
                                <span className={styles.sectionChev}>▼</span>
                            </div>
                            {!col && tasks.map(t => {
                                const st = statusMap[String(t.status)];
                                const df = t.dateToFinish ? fmtShort(t.dateToFinish) : '';
                                const pr = t.priority ? PRIO_COLORS[t.priority] : null;
                                const pn = t.projectName || allProjects.find(p => String(p.id) === String(t.projectId))?.name || '';
                                return (
                                    <div key={t.id} id={`todo-${t.id}`} className={`${styles.todoCard} ${key === 'overdue' ? styles.overdue : key === 'thisweek' ? styles.thisweek : key === 'later' ? styles.later : ''}`} onClick={() => showTask(t)}>
                                        {pn && <div className={styles.todoProject}>{pn}</div>}
                                        <div className={styles.todoTitle}>{t.headline || t.title || 'Bez tytułu'}</div>
                                        <div className={styles.todoMeta}>
                                            {st && <span className={styles.todoTag} style={{ background: st.c }}>{st.l}</span>}
                                            {pr && <span className={styles.todoPrio} style={{ color: pr }}>● {t.priority}</span>}
                                            {df && <span className={styles.todoDate}>📅 {df}</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>

            <TabBar />
        </div>
    );
}
