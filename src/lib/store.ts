// ============================================================
// store.ts — Globalny stan aplikacji (Zustand)
// ============================================================

import { create } from 'zustand';
import type {
    LtUser, LtProject, LtTask, LtStatusLabel, LtComment,
} from './leantime-api';

// ─── Typy stanu ──────────────────────────────────────────────

export type Screen =
    | 'login'
    | 'todos'
    | 'projects'
    | 'tasks'
    | 'detail'
    | 'addTask'
    | 'editTask'
    | 'updates'
    | 'addUpdate'
    | 'editUpdate';

interface AppState {
    // ── Profil zalogowanego użytkownika
    myUserId: string | null;
    myUserName: string;
    myUserEmail: string;

    // ── Motyw
    theme: 'light' | 'dark';
    toggleTheme: () => void;

    // ── Dane pobrane z API
    allUsers: LtUser[];
    allProjects: LtProject[];
    myTodos: LtTask[];
    currentTasks: LtTask[];
    currentProject: LtProject | null;
    statusList: LtStatusLabel[];
    projectUpdates: LtComment[];

    // ── Aktualnie wyświetlane/edytowane
    currentDetailTask: LtTask | null;
    editingCommentId: string | null;

    // ── Nawigacja
    currentScreen: Screen;
    previousScreen: Screen;
    detailReturn: 'todos' | 'tasks';

    // ── Loading flags
    loadingTodos: boolean;
    loadingProjects: boolean;
    loadingTasks: boolean;
    loadingUpdates: boolean;

    // ── Akcje: auth
    setUser: (id: string, name: string, email: string) => void;
    clearUser: () => void;

    // ── Akcje: nawigacja
    navigate: (screen: Screen) => void;
    goBack: () => void;
    setDetailReturn: (r: 'todos' | 'tasks') => void;

    // ── Akcje: dane
    setAllUsers: (users: LtUser[]) => void;
    setAllProjects: (projects: LtProject[]) => void;
    setMyTodos: (todos: LtTask[]) => void;
    setCurrentTasks: (tasks: LtTask[]) => void;
    setCurrentProject: (project: LtProject | null) => void;
    setStatusList: (list: LtStatusLabel[]) => void;
    setProjectUpdates: (updates: LtComment[]) => void;
    setCurrentDetailTask: (task: LtTask | null) => void;
    setEditingCommentId: (id: string | null) => void;

    // ── Loading setters
    setLoadingTodos: (v: boolean) => void;
    setLoadingProjects: (v: boolean) => void;
    setLoadingTasks: (v: boolean) => void;
    setLoadingUpdates: (v: boolean) => void;

    // ── Update lokalny (optymistyczny)
    updateTaskInStore: (taskId: string | number, changes: Partial<LtTask>) => void;
    removeTaskFromStore: (taskId: string | number) => void;
}

// ─── Funkcje persystencji ────────────────────────────────────

function loadUser() {
    if (typeof window === 'undefined') return { id: null, name: '', email: '' };
    return {
        id: localStorage.getItem('lt_user_id'),
        name: localStorage.getItem('lt_user_name') || '',
        email: localStorage.getItem('lt_user_email') || '',
    };
}

function loadTheme(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'light';
    return (localStorage.getItem('lt_theme') as 'light' | 'dark') || 'dark';
}

// ─── Store ───────────────────────────────────────────────────

const saved = typeof window !== 'undefined' ? loadUser() : { id: null, name: '', email: '' };

export const useAppStore = create<AppState>((set, get) => ({
    // ── Stan początkowy
    myUserId: saved.id,
    myUserName: saved.name,
    myUserEmail: saved.email,

    theme: loadTheme(),
    toggleTheme: () => {
        const next = get().theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('lt_theme', next);
        document.documentElement.setAttribute('data-theme', next);
        set({ theme: next });
    },

    allUsers: [],
    allProjects: [],
    myTodos: [],
    currentTasks: [],
    currentProject: null,
    statusList: [],
    projectUpdates: [],

    currentDetailTask: null,
    editingCommentId: null,

    currentScreen: (saved.id ? 'todos' : 'login') as Screen,
    previousScreen: 'todos' as Screen,
    detailReturn: 'todos',

    loadingTodos: false,
    loadingProjects: false,
    loadingTasks: false,
    loadingUpdates: false,

    // ── Auth
    setUser: (id, name, email) => {
        localStorage.setItem('lt_user_id', id);
        localStorage.setItem('lt_user_name', name);
        localStorage.setItem('lt_user_email', email);
        set({ myUserId: id, myUserName: name, myUserEmail: email });
    },
    clearUser: () => {
        localStorage.removeItem('lt_user_id');
        localStorage.removeItem('lt_user_name');
        localStorage.removeItem('lt_user_email');
        set({
            myUserId: null, myUserName: '', myUserEmail: '',
            allUsers: [], allProjects: [], myTodos: [],
            currentTasks: [], currentProject: null, projectUpdates: [],
            currentDetailTask: null, currentScreen: 'login',
        });
    },

    // ── Nawigacja
    navigate: (screen) => {
        const prev = get().currentScreen;
        set({ previousScreen: prev, currentScreen: screen });
    },
    goBack: () => {
        set({ currentScreen: get().previousScreen });
    },
    setDetailReturn: (r) => set({ detailReturn: r }),

    // ── Dane
    setAllUsers: (users) => set({ allUsers: users }),
    setAllProjects: (projects) => set({ allProjects: projects }),
    setMyTodos: (todos) => set({ myTodos: todos }),
    setCurrentTasks: (tasks) => set({ currentTasks: tasks }),
    setCurrentProject: (project) => set({ currentProject: project }),
    setStatusList: (list) => set({ statusList: list }),
    setProjectUpdates: (updates) => set({ projectUpdates: updates }),
    setCurrentDetailTask: (task) => set({ currentDetailTask: task }),
    setEditingCommentId: (id) => set({ editingCommentId: id }),

    // ── Loading
    setLoadingTodos: (v) => set({ loadingTodos: v }),
    setLoadingProjects: (v) => set({ loadingProjects: v }),
    setLoadingTasks: (v) => set({ loadingTasks: v }),
    setLoadingUpdates: (v) => set({ loadingUpdates: v }),

    // ── Optymistyczne aktualizacje
    updateTaskInStore: (taskId, changes) => {
        const update = (tasks: LtTask[]) =>
            tasks.map((t) => (String(t.id) === String(taskId) ? { ...t, ...changes } : t));
        set({
            myTodos: update(get().myTodos),
            currentTasks: update(get().currentTasks),
            currentDetailTask:
                get().currentDetailTask && String(get().currentDetailTask!.id) === String(taskId)
                    ? { ...get().currentDetailTask!, ...changes }
                    : get().currentDetailTask,
        });
    },
    removeTaskFromStore: (taskId) => {
        const filter = (tasks: LtTask[]) => tasks.filter((t) => String(t.id) !== String(taskId));
        set({
            myTodos: filter(get().myTodos),
            currentTasks: filter(get().currentTasks),
            currentDetailTask:
                get().currentDetailTask && String(get().currentDetailTask!.id) === String(taskId)
                    ? null
                    : get().currentDetailTask,
        });
    },
}));
