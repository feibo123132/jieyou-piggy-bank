import React from 'react';
import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import DashboardPage from '@/pages/DashboardPage';
import SettingsPage from '@/pages/SettingsPage';
import CalendarPage from '@/pages/CalendarPage';
import { DayProcessor } from '@/components/logic/DayProcessor';
import { useAppStore } from '@/store/useAppStore';
import { LoginOverlay } from '@/components/auth/LoginOverlay';

function App() {
  const { settings, isInitialized, pullFromCloud } = useAppStore();

  // Startup Sync: Ensure we have the latest data from cloud on app load
  useEffect(() => {
    if (settings.username && !isInitialized) {
      console.log('[App] Starting initial sync...');
      pullFromCloud();
    }
  }, [settings.username, isInitialized, pullFromCloud]);

  if (!settings || !settings.username) {
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
