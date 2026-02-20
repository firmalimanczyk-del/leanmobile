'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { apiUpdateTask, apiGetMilestones, apiGetUsers, toArr, toDTLocal, dsDate } from '@/lib/leantime-api';
import { showToast } from '@/components/ui/Toast';
import styles from './Screen.module.css';

const PRIOS = ['critical', 'high', 'medium', 'low', 'lowest'];
const PRIO_COLORS: Record<string, string> = { critical: '#c0392b', high: '#e74c3c', medium: '#f37021', low: '#27ae60', lowest: '#3498db' };

function stripHtml(h: string) { const d = document.createElement('div'); d.innerHTML = h; return d.textContent || d.innerText || ''; }

export default function EditTaskScreen() {
    const { currentDetailTask: t, navigate, detailReturn, updateTaskInStore, allUsers, setAllUsers } = useAppStore();
    const [headline, setHeadline] = useState('');
    const [desc, setDesc] = useState('');
    const [prio, setPrio] = useState('');
    const [deadline, setDeadline] = useState('');
    const [planStart, setPlanStart] = useState('');
    const [planEnd, setPlanEnd] = useState('');
    const [milestones, setMilestones] = useState<{ id: string | number; headline?: string }[]>([]);
    const [milestoneId, setMilestoneId] = useState('0');
    const [users, setUsers] = useState<{ id: string | number; firstname?: string; lastname?: string }[]>([]);
    const [editorId, setEditorId] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!t) return;
        setHeadline(t.headline || t.title || '');
        setDesc(t.description ? stripHtml(t.description) : '');
        setPrio(t.priority || '');
        setDeadline(dsDate(t.dateToFinish) || '');
        setPlanStart(toDTLocal(t.editFrom));
        setPlanEnd(toDTLocal(t.editTo));
        setMilestoneId(String(t.milestoneid || 0));
        setEditorId(String(t.editorId || ''));

        // Ładuj milestony i userów
        if (t.projectId) {
            apiGetMilestones(t.projectId).then(setMilestones).catch(() => { });
        }
        const loadU = async () => {
            if (allUsers.length) { setUsers(allUsers); return; }
            try { const u = await apiGetUsers(); setAllUsers(u); setUsers(u); } catch { /* ignore */ }
        };
        loadU();
    }, [t?.id]);

    if (!t) return null;

    const save = async () => {
        if (!headline.trim()) { setError('Tytuł jest wymagany'); return; }
        setSaving(true); setError('');
        const vals: Record<string, unknown> = {
            headline: headline.trim(),
            description: desc ? `<p>${desc}</p>` : '',
            priority: prio, milestoneid: parseInt(milestoneId) || 0,
            editorId: editorId || '',
            projectId: t.projectId, status: t.status, type: t.type || 'task',
            dateToFinish: deadline || '',
            editFrom: planStart ? planStart.replace('T', ' ') + ':00' : '',
            editTo: planEnd ? planEnd.replace('T', ' ') + ':00' : '',
        };
        try {
            await apiUpdateTask(t.id, vals);
            updateTaskInStore(t.id, {
                headline: headline.trim(), description: vals.description as string,
                priority: prio, milestoneid: milestoneId, editorId,
                dateToFinish: (vals.dateToFinish as string) || '0000-00-00 00:00:00',
                editFrom: (vals.editFrom as string) || '0000-00-00 00:00:00',
                editTo: (vals.editTo as string) || '0000-00-00 00:00:00',
            });
            showToast('Zapisano ✓');
            navigate('detail');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Błąd zapisu');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={styles.screen}>
            <header className={styles.header}>
                <button className={`${styles.hbtn} ${styles.hbtnBack}`} onClick={() => navigate('detail')}>‹</button>
                <h1 className={styles.headerTitle}>Edytuj zadanie</h1>
            </header>
            <div className={styles.formWrap}>
                <div className={styles.field}>
                    <label>Tytuł *</label>
                    <input id="edit-headline" value={headline} onChange={e => setHeadline(e.target.value)} />
                </div>
                <div className={styles.field}>
                    <label>Opis</label>
                    <textarea id="edit-desc" value={desc} onChange={e => setDesc(e.target.value)} />
                </div>
                <div className={styles.field}>
                    <label>Priorytet</label>
                    <div className={styles.prioGroup}>
                        {PRIOS.map(p => (
                            <button key={p} className={styles.prioOpt} id={`edit-prio-${p}`}
                                style={prio === p ? { background: `${PRIO_COLORS[p]}22`, color: PRIO_COLORS[p], borderColor: PRIO_COLORS[p] } : {}}
                                onClick={() => setPrio(prio === p ? '' : p)}
                            >{p}</button>
                        ))}
                    </div>
                </div>
                <div className={styles.field}>
                    <label>Termin wykonania</label>
                    <input type="date" id="edit-deadline" value={deadline} onChange={e => setDeadline(e.target.value)} />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <div className={styles.field} style={{ flex: 1 }}>
                        <label>Początek pracy</label>
                        <input type="datetime-local" id="edit-plan-start" value={planStart} onChange={e => setPlanStart(e.target.value)} />
                    </div>
                    <div className={styles.field} style={{ flex: 1 }}>
                        <label>Koniec pracy</label>
                        <input type="datetime-local" id="edit-plan-end" value={planEnd} onChange={e => setPlanEnd(e.target.value)} />
                    </div>
                </div>
                {milestones.length > 0 && (
                    <div className={styles.field}>
                        <label>Milestone</label>
                        <select id="edit-milestone" value={milestoneId} onChange={e => setMilestoneId(e.target.value)}>
                            <option value="0">— brak —</option>
                            {milestones.map(m => <option key={m.id} value={String(m.id)}>{m.headline || `#${m.id}`}</option>)}
                        </select>
                    </div>
                )}
                <div className={styles.field}>
                    <label>Przypisz do</label>
                    <select id="edit-editor" value={editorId} onChange={e => setEditorId(e.target.value)}>
                        <option value="">— brak —</option>
                        {users.map(u => <option key={u.id} value={String(u.id)}>{`${u.firstname || ''} ${u.lastname || ''}`.trim()}</option>)}
                    </select>
                </div>
                {error && <div className={styles.errorBox}>{error}</div>}
                <button id="edit-save" className={`${styles.btn} ${styles.btnPrimary}`} onClick={save} disabled={saving}>
                    {saving ? 'Zapisywanie...' : 'Zapisz zmiany'}
                </button>
                <div style={{ height: 10 }} />
                <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => navigate('detail')}>Anuluj</button>
            </div>
        </div>
    );
}
