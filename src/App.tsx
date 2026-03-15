import React from 'react';
import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import DashboardPage from '@/pages/DashboardPage';
import SettingsPage from '@/pages/SettingsPage';
import CalendarPage from '@/pages/CalendarPage';
import TrashPage from '@/pages/TrashPage';
import { DayProcessor } from '@/components/logic/DayProcessor';
import { useAppStore } from '@/store/useAppStore';
import { LoginOverlay } from '@/components/auth/LoginOverlay';
import { hasAuthenticatedSession } from '@/lib/cloudbase';

function App() {
  const { settings, isInitialized, isLocked, pullFromCloud, requireLogin } = useAppStore();

  // Startup gate: require authenticated session before unlocking app.
  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const username = settings.username?.trim();
      if (!username) return;

      const hasSession = await hasAuthenticatedSession(username);
      if (cancelled) return;

      if (!hasSession) {
        requireLogin();
        return;
      }

      if (!isInitialized) {
        console.log('[App] Starting initial sync...');
        await pullFromCloud(username);
      }
    };

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [settings.username, isInitialized, pullFromCloud, requireLogin]);

  if (!settings || !settings.username || isLocked) {
    return <LoginOverlay />;
  }

  return (
    <Router basename={import.meta.env.BASE_URL}>
      <DayProcessor />
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/trash" element={<TrashPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
