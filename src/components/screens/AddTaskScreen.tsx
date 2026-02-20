'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { apiAddTask, apiGetMilestones, apiGetUsers, toArr } from '@/lib/leantime-api';
import { showToast } from '@/components/ui/Toast';
import styles from './Screen.module.css';

const PRIOS = ['critical', 'high', 'medium', 'low', 'lowest'];
const PRIO_COLORS: Record<string, string> = { critical: '#c0392b', high: '#e74c3c', medium: '#f37021', low: '#27ae60', lowest: '#3498db' };

function tomorrow() {
    const d = new Date(); d.setDate(d.getDate() + 1);
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0');
    return { date: `${y}-${m}-${dd}`, start: `${y}-${m}-${dd}T08:00`, end: `${y}-${m}-${dd}T09:00` };
}

export default function AddTaskScreen() {
    const { currentProject, allProjects, allUsers, setAllUsers, navigate, detailReturn, setCurrentTasks, currentTasks } = useAppStore();
    const [headline, setHeadline] = useState('');
    const [desc, setDesc] = useState('');
    const [prio, setPrio] = useState('lowest');
    const [deadline, setDeadline] = useState('');
    const [planStart, setPlanStart] = useState('');
    const [planEnd, setPlanEnd] = useState('');
    const [milestones, setMilestones] = useState<{ id: string | number; headline?: string }[]>([]);
    const [milestoneId, setMilestoneId] = useState('0');
    const [users, setUsers] = useState<{ id: string | number; firstname?: string; lastname?: string }[]>([]);
    const [editorId, setEditorId] = useState('');
    const [projId, setProjId] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const isGlobal = !currentProject;
    const activeProjects = allProjects.filter(p => { const s = p.state != null ? +p.state : 0; return s !== 1 && s !== -1 && p.status !== 'closed'; });

    useEffect(() => {
        const def = tomorrow();
        setDeadline(def.date); setPlanStart(def.start); setPlanEnd(def.end);
        const pid = currentProject?.id;
        if (pid) loadSelects(pid);
        // Załaduj użytkowników
        const loadU = async () => {
            if (allUsers.length) { setUsers(allUsers); return; }
            try { const u = await apiGetUsers(); setAllUsers(u); setUsers(u); } catch { /* ignore */ }
        };
        loadU();
    }, []);

    const loadSelects = async (pid: string | number) => {
        try {
            const ms = await apiGetMilestones(pid);
            setMilestones(ms);
        } catch { /* ignore */ }
    };

    const handleProjChange = (id: string) => {
        setProjId(id);
        if (id) loadSelects(id);
    };

    const save = async () => {
        if (!headline.trim()) { setError('Tytuł jest wymagany'); return; }
        const pid = isGlobal ? projId : currentProject?.id;
        if (!pid) { setError('Wybierz projekt'); return; }
        setSaving(true); setError('');
        const vals: Record<string, unknown> = {
            headline: headline.trim(),
            description: desc ? `<p>${desc}</p>` : '',
            priority: prio, milestoneid: parseInt(milestoneId) || 0,
            editorId: editorId || '', tags: '#f37021',
            type: 'task', projectId: pid, status: 3,
            dateToFinish: deadline || '',
            editFrom: planStart ? planStart.replace('T', ' ') + ':00' : '',
            editTo: planEnd ? planEnd.replace('T', ' ') + ':00' : '',
        };
        try {
            await apiAddTask(vals);
            showToast('Zadanie dodane ✓');
            navigate(detailReturn === 'todos' ? 'todos' : 'tasks');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Błąd zapisu');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={styles.screen}>
            <header className={styles.header}>
                <button className={`${styles.hbtn} ${styles.hbtnBack}`} onClick={() => navigate(detailReturn === 'todos' ? 'todos' : 'tasks')}>‹</button>
                <h1 className={styles.headerTitle}>Nowe zadanie</h1>
            </header>
            <div className={styles.formWrap}>
                {isGlobal && (
                    <div className={styles.field}>
                        <label>Projekt *</label>
                        <select id="add-project" value={projId} onChange={e => handleProjChange(e.target.value)}>
                            <option value="">— wybierz projekt —</option>
                            {activeProjects.map(p => <option key={p.id} value={String(p.id)}>{p.name || p.projectName || `#${p.id}`}</option>)}
                        </select>
                    </div>
                )}
                <div className={styles.field}>
                    <label>Tytuł *</label>
                    <input id="add-headline" value={headline} onChange={e => setHeadline(e.target.value)} placeholder="Co trzeba zrobić?" />
                </div>
                <div className={styles.field}>
                    <label>Opis</label>
                    <textarea id="add-desc" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Szczegóły..." />
                </div>
                <div className={styles.field}>
                    <label>Priorytet</label>
                    <div className={styles.prioGroup}>
                        {PRIOS.map(p => (
                            <button key={p} className={styles.prioOpt} id={`add-prio-${p}`}
                                style={prio === p ? { background: `${PRIO_COLORS[p]}22`, color: PRIO_COLORS[p], borderColor: PRIO_COLORS[p] } : {}}
                                onClick={() => setPrio(prio === p ? '' : p)}
                            >{p}</button>
                        ))}
                    </div>
                </div>
                <div className={styles.field}>
                    <label>Termin wykonania</label>
                    <input type="date" id="add-deadline" value={deadline} onChange={e => setDeadline(e.target.value)} />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <div className={styles.field} style={{ flex: 1 }}>
                        <label>Początek pracy</label>
                        <input type="datetime-local" id="add-plan-start" value={planStart} onChange={e => setPlanStart(e.target.value)} />
                    </div>
                    <div className={styles.field} style={{ flex: 1 }}>
                        <label>Koniec pracy</label>
                        <input type="datetime-local" id="add-plan-end" value={planEnd} onChange={e => setPlanEnd(e.target.value)} />
                    </div>
                </div>
                {milestones.length > 0 && (
                    <div className={styles.field}>
                        <label>Milestone</label>
                        <select id="add-milestone" value={milestoneId} onChange={e => setMilestoneId(e.target.value)}>
                            <option value="0">— brak —</option>
                            {milestones.map(m => <option key={m.id} value={String(m.id)}>{m.headline || `#${m.id}`}</option>)}
                        </select>
                    </div>
                )}
                <div className={styles.field}>
                    <label>Przypisz do</label>
                    <select id="add-editor" value={editorId} onChange={e => setEditorId(e.target.value)}>
                        <option value="">— brak —</option>
                        {users.map(u => <option key={u.id} value={String(u.id)}>{`${u.firstname || ''} ${u.lastname || ''}`.trim()}</option>)}
                    </select>
                </div>
                {error && <div className={styles.errorBox}>{error}</div>}
                <button id="add-save" className={`${styles.btn} ${styles.btnPrimary}`} onClick={save} disabled={saving}>
                    {saving ? 'Zapisywanie...' : 'Dodaj zadanie'}
                </button>
            </div>
        </div>
    );
}
