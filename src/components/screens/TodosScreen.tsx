'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { apiGetAllTasks, DONE_STATUSES, fmtShort, dsDate } from '@/lib/leantime-api';
import { showToast } from '@/components/ui/Toast';
import { isPushSupported, subscribeToPush, sendTestPush, getPushPermission } from '@/lib/push-utils';
import TabBar from '@/components/ui/TabBar';
import StatusSheet from '@/components/ui/StatusSheet';
import styles from './Screen.module.css';

interface TaskItem { id: string | number; headline?: string; title?: string; status?: string | number; priority?: string; projectId?: string | number; projectName?: string; dateToFinish?: string; editorId?: string | number; userId?: string | number; responsible?: string | number }
interface Group { overdue: TaskItem[]; thisweek: TaskItem[]; later: TaskItem[]; nodate: TaskItem[] }

const TZ = 'Europe/Warsaw';
const PRIO_COLORS: Record<string, string> = { critical: '#c0392b', high: '#e74c3c', medium: '#f37021', low: '#27ae60', lowest: '#3498db' };
const PRIO_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, lowest: 4 };

function nowStr() { return new Date().toLocaleDateString('en-CA', { timeZone: TZ }); }
function eowStr() { const d = new Date(); d.setDate(d.getDate() + (7 - d.getDay())); return d.toLocaleDateString('en-CA', { timeZone: TZ }); }

export default function TodosScreen() {
    const { myUserId, myUserName, allProjects, statusList, myTodos, setMyTodos, navigate, setCurrentDetailTask, setDetailReturn, clearUser, loadingTodos, setLoadingTodos, toggleTheme, theme } = useAppStore();
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

    // ── Filtry (B) ─────────────────────────────────────────────
    const [showFilters, setShowFilters] = useState(false);
    const [filterPrio, setFilterPrio] = useState<string[]>([]);
    const [filterProject, setFilterProject] = useState('');
    const [sortBy, setSortBy] = useState<'date' | 'priority' | 'title'>('date');

    // ── Status Sheet (D) ───────────────────────────────────────
    const [sheetTask, setSheetTask] = useState<TaskItem | null>(null);
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const getInitials = () => (myUserName ? myUserName.split(' ').map((w: string) => w[0] || '').join('').toUpperCase().slice(0, 2) : '?');

    // ── Push Notifications ──────────────────────────────────
    const [pushState, setPushState] = useState<'idle' | 'subscribing' | 'subscribed' | 'unsupported'>('idle');

    useEffect(() => {
        isPushSupported().then(ok => {
            if (!ok) setPushState('unsupported');
            else getPushPermission().then(p => { if (p === 'granted') setPushState('subscribed'); });
        });
    }, []);

    const handlePush = async () => {
        if (pushState === 'unsupported') { showToast('Twoja przeglądarka nie wspiera powiadomień push', 'error'); return; }
        if (pushState === 'subscribing') return;
        setPushState('subscribing');
        const ok = await subscribeToPush(myUserId || '');
        if (ok) {
            setPushState('subscribed');
            showToast('🔔 Powiadomienia włączone!');
            // Send test notification
            setTimeout(() => sendTestPush(myUserId || ''), 1500);
        } else {
            setPushState('idle');
            showToast('Nie udało się włączyć powiadomień', 'error');
        }
    };

    const activeProjectIds = new Set(
        allProjects.filter(p => { const s = p.state != null ? +p.state : 0; return s !== 1 && s !== -1 && p.status !== 'closed' && p.status !== 'archived'; }).map(p => String(p.id))
    );

    const load = async (userId?: string | null, projects?: typeof allProjects) => {
        const uid = userId !== undefined ? userId : myUserId;
        const projs = projects !== undefined ? projects : allProjects;
        if (loadingTodos) return;
        setLoadingTodos(true);
        try {
            const all = await apiGetAllTasks();
            const activeProjIds = new Set(
                projs.filter(p => { const s = p.state != null ? +p.state : 0; return s !== 1 && s !== -1 && p.status !== 'closed' && p.status !== 'archived'; }).map(p => String(p.id))
            );
            const mine = all.filter(t => {
                const m = String(t.editorId) === String(uid) || String(t.userId) === String(uid) || String(t.responsible) === String(uid);
                return m && (activeProjIds.size === 0 || activeProjIds.has(String(t.projectId)));
            });
            setMyTodos(mine);
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Błąd';
            // Nie pokazuj surowego JSON — przyjazny komunikat
            if (msg.includes('AUTH_EXPIRED') || msg.includes('Sesja wygasła')) {
                showToast('Sesja wygasła — zaloguj się ponownie', 'error');
            } else if (msg.includes('HTTP 5') || msg.includes('HTTP 4')) {
                showToast('Problem z połączeniem — spróbuj ponownie', 'error');
            } else {
                showToast(msg.length > 80 ? msg.substring(0, 80) + '…' : msg, 'error');
            }
        } finally {
            setLoadingTodos(false);
        }
    };

    const loadedRef = useRef(false);
    useEffect(() => {
        if (!myUserId) return;
        const isEmailId = myUserId.includes('@') || !/^\d+$/.test(myUserId);
        if (isEmailId) return;
        if (loadedRef.current && myTodos.length > 0) return;
        loadedRef.current = true;
        load(myUserId, allProjects);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [myUserId, allProjects.length]);

    // ── Long-press handlers (D) ────────────────────────────────
    const startPress = (t: TaskItem) => {
        longPressTimer.current = setTimeout(() => setSheetTask(t), 500);
    };
    const cancelPress = () => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };

    // ── Filtrowanie i sortowanie (B) ───────────────────────────
    const hasFilters = filterPrio.length > 0 || filterProject !== '';
    const clearFilters = () => { setFilterPrio([]); setFilterProject(''); };

    const open = myTodos.filter(t => {
        if (DONE_STATUSES.has(String(t.status))) return false;
        if (filterPrio.length > 0 && !filterPrio.includes(t.priority || '')) return false;
        if (filterProject && String(t.projectId) !== filterProject) return false;
        return true;
    });

    const sorted = [...open].sort((a, b) => {
        if (sortBy === 'priority') return (PRIO_ORDER[a.priority || ''] ?? 99) - (PRIO_ORDER[b.priority || ''] ?? 99);
        if (sortBy === 'title') return (a.headline || a.title || '').localeCompare(b.headline || b.title || '');
        const da = dsDate(a.dateToFinish) || '9999'; const db = dsDate(b.dateToFinish) || '9999';
        return da < db ? -1 : da > db ? 1 : 0;
    });

    const today = nowStr(); const eow = eowStr();
    const g: Group = { overdue: [], thisweek: [], later: [], nodate: [] };
    sorted.forEach(t => {
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

    const PRIOS = [
        { v: 'critical', l: '🔴 Krytyczny' },
        { v: 'high', l: '🟠 Wysoki' },
        { v: 'medium', l: '🟡 Średni' },
        { v: 'low', l: '🟢 Niski' },
    ];

    const togglePrio = (v: string) => setFilterPrio(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]);

    return (
        <div className={styles.screen}>
            {/* Header */}
            <header className={styles.header}>
                <h1 className={styles.headerTitle}>Moje zadania</h1>
                <button
                    id="todos-theme"
                    className={styles.hbtn}
                    onClick={toggleTheme}
                    aria-label={theme === 'dark' ? 'Tryb jasny' : 'Tryb ciemny'}
                    title={theme === 'dark' ? 'Tryb jasny' : 'Tryb ciemny'}
                >
                    {theme === 'dark' ? '☀️' : '🌙'}
                </button>
                <button
                    id="todos-filter"
                    className={`${styles.hbtn} ${showFilters ? styles.hbtnPrimary : ''}`}
                    onClick={() => setShowFilters(v => !v)}
                    aria-label="Filtry"
                    title="Filtry i sortowanie"
                    style={hasFilters && !showFilters ? { background: 'var(--amber)', color: '#fff', border: 'none' } : {}}
                >
                    ⚙️
                </button>
                {pushState !== 'unsupported' && (
                    <button
                        id="todos-push"
                        className={`${styles.hbtn} ${pushState === 'subscribed' ? styles.hbtnPrimary : ''}`}
                        onClick={handlePush}
                        disabled={pushState === 'subscribing'}
                        aria-label="Powiadomienia push"
                        title={pushState === 'subscribed' ? 'Powiadomienia włączone' : 'Włącz powiadomienia'}
                    >
                        {pushState === 'subscribing' ? '⏳' : pushState === 'subscribed' ? '🔔' : '🔕'}
                    </button>
                )}
                <button id="todos-refresh" className={styles.hbtn} onClick={() => load()} aria-label="Odśwież" disabled={loadingTodos}>🔄</button>
                <button id="todos-add" className={`${styles.hbtn} ${styles.hbtnPrimary}`} onClick={() => navigate('addTask')} aria-label="Dodaj zadanie">+</button>
                <button id="todos-avatar" className={styles.avatarBtn} onClick={() => { if (confirm(`Wylogować ${myUserName}?`)) { clearUser(); showToast('Wylogowano'); } }}>{getInitials()}</button>
            </header>

            {/* Filter Bar (B) */}
            {showFilters && (
                <div className={styles.filterBar}>
                    {/* Sortowanie */}
                    <div className={styles.filterRow}>
                        <span className={styles.filterLabel}>Sortuj</span>
                        {(['date', 'priority', 'title'] as const).map(s => (
                            <button
                                key={s}
                                className={`${styles.filterSortBtn} ${sortBy === s ? styles.filterSortBtnActive : ''}`}
                                onClick={() => setSortBy(s)}
                            >
                                {s === 'date' ? '📅 Data' : s === 'priority' ? '🎯 Priorytet' : '🔤 Tytuł'}
                            </button>
                        ))}
                    </div>
                    {/* Priorytet */}
                    <div className={styles.filterRow}>
                        <span className={styles.filterLabel}>Priorytet</span>
                        {PRIOS.map(p => (
                            <button
                                key={p.v}
                                className={`${styles.filterChip} ${filterPrio.includes(p.v) ? styles.filterChipActive : ''}`}
                                onClick={() => togglePrio(p.v)}
                            >
                                {p.l}
                            </button>
                        ))}
                    </div>
                    {/* Projekt */}
                    <div className={styles.filterRow}>
                        <span className={styles.filterLabel}>Projekt</span>
                        <select
                            className={styles.filterSelect}
                            value={filterProject}
                            onChange={e => setFilterProject(e.target.value)}
                        >
                            <option value="">Wszystkie</option>
                            {allProjects.filter(p => activeProjectIds.has(String(p.id))).map(p => (
                                <option key={p.id} value={String(p.id)}>{p.name || p.projectName}</option>
                            ))}
                        </select>
                        {hasFilters && (
                            <button className={styles.filterClear} onClick={clearFilters}>Wyczyść</button>
                        )}
                    </div>
                </div>
            )}

            {/* List */}
            <div className={styles.list}>
                {loadingTodos && (
                    <div className={styles.empty}><div className={styles.spinner} /><br />Ładowanie...</div>
                )}
                {!loadingTodos && !open.length && (
                    <div className={styles.empty}>
                        {hasFilters ? '🔍 Brak zadań spełniających filtry' : '🎉 Brak otwartych zadań!'}
                    </div>
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
                                    <div
                                        key={t.id}
                                        id={`todo-${t.id}`}
                                        className={`${styles.todoCard} ${key === 'overdue' ? styles.overdue : key === 'thisweek' ? styles.thisweek : key === 'later' ? styles.later : ''}`}
                                        onClick={() => showTask(t)}
                                        onPointerDown={() => startPress(t)}
                                        onPointerUp={cancelPress}
                                        onPointerLeave={cancelPress}
                                        onContextMenu={(e) => { e.preventDefault(); setSheetTask(t); }}
                                    >
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

            {/* Status Bottom Sheet (D) */}
            {sheetTask && (
                <StatusSheet
                    task={sheetTask as never}
                    statusList={statusList}
                    onClose={() => setSheetTask(null)}
                />
            )}

            <TabBar />
        </div>
    );
}
