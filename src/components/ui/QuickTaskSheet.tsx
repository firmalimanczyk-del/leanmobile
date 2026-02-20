'use client';

// QuickTaskSheet.tsx — Błyskawiczne dodawanie zadania (⚡)
// - Tytuł (wymagany) + opis (opcjonalny)
// - Projekt: "Ogólny" (auto-wykrywany z listy) lub pierwszy dostępny
// - Przypisane: zalogowany użytkownik
// - Priorytet: medium
// - Termin: teraz + 15 minut

import { useRef, useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { apiAddTask, nowWarsaw } from '@/lib/leantime-api';
import { showToast } from '@/components/ui/Toast';
import styles from '@/components/screens/Screen.module.css';
import cssSheet from './QuickTaskSheet.module.css';

function getDefaultProject(allProjects: { id: string | number; name?: string; projectName?: string; state?: string | number; status?: string }[]) {
    // Tylko aktywne projekty
    const active = allProjects.filter(p => {
        const s = p.state != null ? +p.state : 0;
        return s !== 1 && s !== -1 && p.status !== 'closed' && p.status !== 'archived';
    });
    // Szukaj "ogólny" / "general" / "general tasks"
    const keywords = ['ogólny', 'ogolny', 'general', 'pozostałe', 'pozostale', 'inne', 'misc', 'quick'];
    const found = active.find(p =>
        keywords.some(k => (p.name || p.projectName || '').toLowerCase().includes(k))
    );
    return found || active[0] || null;
}

function nowPlus15(): string {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 15);
    // Format: YYYY-MM-DD HH:MM:SS (Leantime format)
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

interface Props { onClose: () => void }

export default function QuickTaskSheet({ onClose }: Props) {
    const { myUserId, myUserName, allProjects, setMyTodos, myTodos } = useAppStore();
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [saving, setSaving] = useState(false);
    const titleRef = useRef<HTMLInputElement>(null);

    const defaultProject = getDefaultProject(allProjects);

    useEffect(() => {
        // Auto-focus na tytule po otwarciu
        setTimeout(() => titleRef.current?.focus(), 80);
    }, []);

    const handleSave = async () => {
        const t = title.trim();
        if (!t) { titleRef.current?.focus(); return; }
        setSaving(true);
        try {
            const deadline = nowPlus15();
            const editFrom = nowWarsaw();
            const result = await apiAddTask({
                headline: t,
                description: desc.trim() || '',
                projectId: defaultProject ? String(defaultProject.id) : '',
                editorId: myUserId || '',
                userId: myUserId || '',
                priority: 'medium',
                status: '3',           // Nowe
                dateToFinish: deadline,
                editFrom,
                editTo: deadline,
                type: 'task',
            });

            // Optymistyczne dodanie do listy "Moje"
            const newTask = {
                id: (result as { id?: string | number })?.id || `temp-${Date.now()}`,
                headline: t,
                description: desc.trim(),
                projectId: defaultProject?.id,
                projectName: defaultProject?.name || defaultProject?.projectName,
                editorId: myUserId,
                userId: myUserId,
                priority: 'medium',
                status: '3',
                dateToFinish: deadline,
            };
            setMyTodos([newTask as never, ...myTodos]);

            showToast(`⚡ Dodano: ${t}`, 'success');
            onClose();
        } catch (e) {
            showToast(e instanceof Error ? e.message : 'Błąd dodawania', 'error');
            setSaving(false);
        }
    };

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave(); }
        if (e.key === 'Escape') onClose();
    };

    const pName = defaultProject?.name || defaultProject?.projectName || '—';
    const deadline15 = (() => {
        const d = new Date(); d.setMinutes(d.getMinutes() + 15);
        return d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    })();

    return (
        <div className={styles.sheetOverlay}>
            <div className={styles.sheetBackdrop} onClick={onClose} />
            <div className={`${styles.sheet} ${cssSheet.quickSheet}`}>
                <div className={styles.sheetHandle} />

                {/* Nagłówek */}
                <div className={cssSheet.header}>
                    <span className={cssSheet.bolt}>⚡</span>
                    <div>
                        <div className={cssSheet.headerTitle}>Szybkie zadanie</div>
                        <div className={cssSheet.headerMeta}>
                            📁 {pName} &nbsp;·&nbsp; 👤 {myUserName || 'Ja'} &nbsp;·&nbsp; ⏰ do {deadline15}
                        </div>
                    </div>
                </div>

                {/* Formularz */}
                <div className={cssSheet.form}>
                    <input
                        ref={titleRef}
                        className={cssSheet.titleInput}
                        placeholder="Co masz do zrobienia? (Enter = zapisz)"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        onKeyDown={handleKey}
                        disabled={saving}
                        maxLength={200}
                        autoComplete="off"
                    />
                    <textarea
                        className={cssSheet.descInput}
                        placeholder="Krótki opis (opcjonalnie)..."
                        value={desc}
                        onChange={e => setDesc(e.target.value)}
                        onKeyDown={handleKey}
                        disabled={saving}
                        rows={2}
                        maxLength={1000}
                    />
                </div>

                {/* Przyciski */}
                <div className={cssSheet.actions}>
                    <button className={cssSheet.cancelBtn} onClick={onClose} disabled={saving}>
                        Anuluj
                    </button>
                    <button
                        className={cssSheet.saveBtn}
                        onClick={handleSave}
                        disabled={saving || !title.trim()}
                    >
                        {saving ? '⏳' : '⚡'} {saving ? 'Dodaję...' : 'Dodaj zadanie'}
                    </button>
                </div>
            </div>
        </div>
    );
}
