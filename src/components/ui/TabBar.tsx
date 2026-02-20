'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import type { Screen } from '@/lib/store';
import QuickTaskSheet from './QuickTaskSheet';
import styles from './TabBar.module.css';

interface Tab { screen: Screen; label: string; icon: string }

const TABS_LEFT: Tab[] = [
    { screen: 'todos', label: 'Moje', icon: '📋' },
];
const TABS_RIGHT: Tab[] = [
    { screen: 'projects', label: 'Projekty', icon: '📁' },
];

export default function TabBar() {
    const { currentScreen, navigate } = useAppStore();
    const [showQuick, setShowQuick] = useState(false);

    return (
        <>
            <nav className={styles.tabBar}>
                {/* Lewa zakładka */}
                {TABS_LEFT.map(tab => (
                    <button
                        key={tab.screen}
                        id={`tab-${tab.screen}`}
                        className={`${styles.tab} ${currentScreen === tab.screen ? styles.active : ''}`}
                        onClick={() => navigate(tab.screen)}
                        aria-label={tab.label}
                        aria-current={currentScreen === tab.screen ? 'page' : undefined}
                    >
                        <span className={styles.icon}>{tab.icon}</span>
                        <span className={styles.label}>{tab.label}</span>
                    </button>
                ))}

                {/* Centralny przycisk ⚡ */}
                <div className={styles.fabWrap}>
                    <button
                        id="tab-quick"
                        className={styles.fab}
                        onClick={() => setShowQuick(true)}
                        aria-label="Szybkie zadanie"
                        title="Dodaj szybkie zadanie (⚡)"
                    >
                        ⚡
                    </button>
                </div>

                {/* Prawa zakładka */}
                {TABS_RIGHT.map(tab => (
                    <button
                        key={tab.screen}
                        id={`tab-${tab.screen}`}
                        className={`${styles.tab} ${currentScreen === tab.screen ? styles.active : ''}`}
                        onClick={() => navigate(tab.screen)}
                        aria-label={tab.label}
                        aria-current={currentScreen === tab.screen ? 'page' : undefined}
                    >
                        <span className={styles.icon}>{tab.icon}</span>
                        <span className={styles.label}>{tab.label}</span>
                    </button>
                ))}
            </nav>

            {/* Quick Task Sheet */}
            {showQuick && <QuickTaskSheet onClose={() => setShowQuick(false)} />}
        </>
    );
}
