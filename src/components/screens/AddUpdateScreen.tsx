'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import {
    apiAddProjectUpdate, apiEditProjectUpdate, apiGetProjectUpdates,
    PROJECT_STATUS_MAP, nowWarsaw, getCommentAuthor,
} from '@/lib/leantime-api';
import { showToast } from '@/components/ui/Toast';
import styles from './Screen.module.css';

const STATUS_OPTS = [
    { val: 'green', label: 'Na dobrej drodze', color: '#27ae60' },
    { val: 'yellow', label: 'Zagrożony', color: '#f39c12' },
    { val: 'red', label: 'Problem', color: '#e74c3c' },
];

export default function AddUpdateScreen() {
    const { currentProject, allUsers, myUserName, projectUpdates, setProjectUpdates, navigate, editingCommentId, setEditingCommentId } = useAppStore();
    const [statusVal, setStatusVal] = useState('green');
    const [text, setText] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const textRef = useRef<HTMLTextAreaElement>(null);
    const isEdit = !!editingCommentId;

    useEffect(() => {
        if (isEdit) {
            const u = projectUpdates.find(x => String(x.id) === String(editingCommentId));
            if (u) {
                const t = (u.text || '').replace(/<[^>]*>/g, '').trim();
                setText(t);
            }
        }
        setTimeout(() => textRef.current?.focus(), 100);
    }, []);

    const save = async () => {
        if (!text.trim()) { setError('Opis jest wymagany'); return; }
        if (!currentProject) return;
        setSaving(true); setError('');
        try {
            if (isEdit && editingCommentId) {
                await apiEditProjectUpdate(editingCommentId, text.trim());
                showToast('Aktualizacja zmieniona ✓');
                setEditingCommentId(null);
            } else {
                const statusNum = PROJECT_STATUS_MAP[statusVal] ?? 0;
                await apiAddProjectUpdate(currentProject.id, currentProject.name || '', text.trim(), statusNum);
                showToast('Aktualizacja dodana ✓');
            }
            // Odśwież listę
            try {
                const data = await apiGetProjectUpdates(currentProject.id);
                setProjectUpdates(data);
            } catch { /* ignore */ }
            navigate('updates');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Błąd zapisu');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={styles.screen}>
            <header className={styles.header}>
                <button className={`${styles.hbtn} ${styles.hbtnBack}`} onClick={() => { setEditingCommentId(null); navigate('updates'); }}>‹</button>
                <h1 className={styles.headerTitle}>{isEdit ? 'Edytuj aktualizację' : 'Nowa aktualizacja'}</h1>
            </header>
            <div className={styles.formWrap}>
                {!isEdit && (
                    <div className={styles.field}>
                        <label>Status projektu</label>
                        <div className={styles.updateStatusGroup}>
                            {STATUS_OPTS.map(o => (
                                <button key={o.val} id={`update-status-${o.val}`}
                                    className={`${styles.updateStatusOpt} ${statusVal === o.val ? styles.selected : ''}`}
                                    onClick={() => setStatusVal(o.val)}
                                >
                                    <span className={styles.usDot} style={{ background: o.color }} />
                                    {o.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                <div className={styles.field}>
                    <label>Opis aktualizacji *</label>
                    <textarea
                        ref={textRef}
                        id="update-text"
                        value={text}
                        onChange={e => setText(e.target.value)}
                        placeholder="Co się zmieniło w projekcie?"
                        style={{ minHeight: 120 }}
                    />
                </div>
                {error && <div className={styles.errorBox}>{error}</div>}
                <button id="update-save" className={`${styles.btn} ${styles.btnPrimary}`} onClick={save} disabled={saving}>
                    {saving ? 'Zapisywanie...' : isEdit ? 'Zapisz zmiany' : 'Dodaj aktualizację'}
                </button>
            </div>
        </div>
    );
}
