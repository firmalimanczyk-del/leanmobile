'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { apiGetProjects, isProjectActive } from '@/lib/leantime-api';
import { showToast } from '@/components/ui/Toast';
import TabBar from '@/components/ui/TabBar';
import styles from './Screen.module.css';

export default function ProjectsScreen() {
    const { allProjects, setAllProjects, navigate, setCurrentProject, setCurrentTasks, loadingProjects, setLoadingProjects, myUserName, clearUser, theme, toggleTheme } = useAppStore();

    const getInitials = () => myUserName?.split(' ').map((w: string) => w[0] || '').join('').toUpperCase().slice(0, 2) || '?';

    const load = async () => {
        if (loadingProjects) return;
        setLoadingProjects(true);
        try {
            const data = await apiGetProjects();
            setAllProjects(data);
        } catch (e) {
            showToast(e instanceof Error ? e.message : 'Błąd', 'error');
        } finally {
            setLoadingProjects(false);
        }
    };

    useEffect(() => { if (!allProjects.length) load(); }, []);

    const active = allProjects.filter(isProjectActive).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    const openProject = (p: typeof active[0]) => {
        setCurrentProject(p);
        setCurrentTasks([]);
        navigate('tasks');
    };

    return (
        <div className={styles.screen}>
            <header className={styles.header}>
                <h1 className={styles.headerTitle}>Projekty</h1>
                <button
                    id="projects-theme"
                    className={styles.hbtn}
                    onClick={toggleTheme}
                    aria-label={theme === 'dark' ? 'Tryb jasny' : 'Tryb ciemny'}
                    title={theme === 'dark' ? 'Tryb jasny' : 'Tryb ciemny'}
                >
                    {theme === 'dark' ? '☀️' : '🌙'}
                </button>
                <button id="projects-refresh" className={styles.hbtn} onClick={load} disabled={loadingProjects} aria-label="Odśwież">🔄</button>
                <button id="projects-add" className={`${styles.hbtn} ${styles.hbtnPrimary}`} onClick={() => navigate('addTask')} aria-label="Dodaj zadanie">+</button>
                <button id="projects-avatar" className={styles.avatarBtn} onClick={() => { if (confirm(`Wylogować ${myUserName}?`)) { clearUser(); showToast('Wylogowano'); } }}>{getInitials()}</button>
            </header>

            <div className={styles.list}>
                {loadingProjects && <div className={styles.empty}><div className={styles.spinner} /><br />Ładowanie...</div>}
                {!loadingProjects && !active.length && <div className={styles.empty}>Brak aktywnych projektów</div>}
                {!loadingProjects && active.map((p) => (
                    <div key={p.id} id={`project-${p.id}`} className={styles.pCard} onClick={() => openProject(p)}>
                        <div className={styles.pInfo}>
                            <div className={styles.pName}>{p.name || p.projectName || `#${p.id}`}</div>
                            {p.clientName && <div className={styles.pClient}>{p.clientName}</div>}
                        </div>
                        {p.numberOfTickets ? <div className={styles.pBadge}>{p.numberOfTickets}</div> : null}
                        <div className={styles.pChev}>›</div>
                    </div>
                ))}
            </div>

            <TabBar />
        </div>
    );
}
