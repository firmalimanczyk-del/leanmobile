'use client';

// StatusSheet.tsx — Bottom sheet do szybkiej zmiany statusu zadania (D)
import { useState } from 'react';
import { apiChangeStatus, DONE_STATUSES } from '@/lib/leantime-api';
import { useAppStore } from '@/lib/store';
import { showToast } from '@/components/ui/Toast';
import type { LtTask, LtStatusLabel } from '@/lib/leantime-api';
import styles from '@/components/screens/Screen.module.css';

interface Props {
    task: LtTask;
    statusList: LtStatusLabel[];
    onClose: () => void;
}

export default function StatusSheet({ task, statusList, onClose }: Props) {
    const { updateTaskInStore, removeTaskFromStore } = useAppStore();
    const [saving, setSaving] = useState<string | null>(null);

    const changeStatus = async (status: LtStatusLabel) => {
        if (saving) return;
        setSaving(status.v);
        try {
            // Optymistyczna aktualizacja
            updateTaskInStore(task.id, { status: status.v });
            await apiChangeStatus(task.id, status.v);
            // Jeśli ukończone — usuń z listy "Moje"
            if (DONE_STATUSES.has(status.v)) {
                removeTaskFromStore(task.id);
                showToast(`✅ Ukończono: ${task.headline || task.title || ''}`, 'success');
            } else {
                showToast(`Status: ${status.l}`, 'success');
            }
            onClose();
        } catch (e) {
            // Cofnij optymistyczną aktualizację
            updateTaskInStore(task.id, { status: task.status });
            showToast(e instanceof Error ? e.message : 'Błąd zmiany statusu', 'error');
            setSaving(null);
        }
    };

    return (
        <div className={styles.sheetOverlay}>
            <div className={styles.sheetBackdrop} onClick={onClose} />
            <div className={styles.sheet}>
                <div className={styles.sheetHandle} />
                <div className={styles.sheetTitle}>Zmień status</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '0 20px 10px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {task.headline || task.title || 'Zadanie'}
                </div>
                {statusList.map(s => {
                    const isCurrent = String(task.status) === String(s.v);
                    const isSaving = saving === s.v;
                    return (
                        <button
                            key={s.v}
                            className={`${styles.sheetItem} ${saving ? styles.sheetItemSaving : ''}`}
                            onClick={() => changeStatus(s)}
                            disabled={!!saving}
                        >
                            <span className={styles.sheetDot} style={{ background: s.c }} />
                            <span className={styles.sheetItemLabel}>{s.l}</span>
                            {isSaving && <span style={{ fontSize: 13 }}>⏳</span>}
                            {isCurrent && !isSaving && <span className={styles.sheetItemCheck}>✓</span>}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
