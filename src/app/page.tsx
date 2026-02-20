'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { apiGetStatusLabels, apiGetProjects, apiGetUsers, FALLBACK_STATUS_LIST } from '@/lib/leantime-api';

import LoginScreen from '@/components/screens/LoginScreen';
import TodosScreen from '@/components/screens/TodosScreen';
import ProjectsScreen from '@/components/screens/ProjectsScreen';
import TasksScreen from '@/components/screens/TasksScreen';
import DetailScreen from '@/components/screens/DetailScreen';
import AddTaskScreen from '@/components/screens/AddTaskScreen';
import EditTaskScreen from '@/components/screens/EditTaskScreen';
import UpdatesScreen from '@/components/screens/UpdatesScreen';
import AddUpdateScreen from '@/components/screens/AddUpdateScreen';
import Toast from '@/components/ui/Toast';

export default function App() {
  const { currentScreen, myUserId, setUser, myUserName, myUserEmail, setStatusList, setAllProjects, setAllUsers } = useAppStore();

  useEffect(() => {
    if (!myUserId) return;

    // Jeśli myUserId wygląda jak email (nie liczba), napraw go przez /api/auth/me
    const isEmail = myUserId.includes('@') || !/^\d+$/.test(myUserId);
    if (isEmail) {
      fetch('/api/auth/me', { credentials: 'same-origin' })
        .then(r => r.ok ? r.json() : null)
        .then(me => {
          if (me?.ok && me.id) {
            const correctedName = `${me.firstname || ''} ${me.lastname || ''}`.trim() || me.username || me.email || myUserEmail;
            setUser(String(me.id), correctedName, me.email || myUserEmail);
          }
        })
        .catch(() => { });
    }

    setStatusList(FALLBACK_STATUS_LIST);
    Promise.allSettled([
      apiGetStatusLabels().then(setStatusList),
      apiGetProjects().then(setAllProjects),
      apiGetUsers().then(setAllUsers),
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myUserId]);

  return (
    <main>
      {currentScreen === 'login' && <LoginScreen />}
      {currentScreen === 'todos' && <TodosScreen />}
      {currentScreen === 'projects' && <ProjectsScreen />}
      {currentScreen === 'tasks' && <TasksScreen />}
      {currentScreen === 'detail' && <DetailScreen />}
      {currentScreen === 'addTask' && <AddTaskScreen />}
      {currentScreen === 'editTask' && <EditTaskScreen />}
      {currentScreen === 'updates' && <UpdatesScreen />}
      {currentScreen === 'addUpdate' && <AddUpdateScreen />}
      <Toast />
    </main>
  );
}
