'use client';

import { useAppStore } from '@/lib/store';
import type { Screen } from '@/lib/store';
import styles from './TabBar.module.css';

interface Tab {
    screen: Screen;
    label: string;
    icon: string;
}

const TABS: Tab[] = [
    { screen: 'todos', label: 'Moje', icon: '📋' },
    { screen: 'projects', label: 'Projekty', icon: '📁' },
];

export default function TabBar() {
    const { currentScreen, navigate } = useAppStore();

    return (
        <nav className={styles.tabBar}>
            {TABS.map((tab) => (
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
    );
}
