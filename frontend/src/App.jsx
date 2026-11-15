import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import MarkAttendancePage from './pages/MarkAttendancePage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import BatchesPage from './pages/BatchesPage';
import StudentsPage from './pages/StudentsPage';
import TeachersPage from './pages/TeachersPage';
import SettingsPage from './pages/SettingsPage';
import FeeTrackingPage from './pages/FeeTrackingPage';

export default function App() {
  const { user, loading, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('attendance');

  useEffect(() => {
    if (user) {
      setActiveTab(isAdmin ? 'dashboard' : 'attendance');
    }
  }, [user, isAdmin]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
        <div style={{ textAlign: 'center', color: 'var(--primary)', fontWeight: 700 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🎓</div>
          Loading Apex Institute...
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="app-container">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="main-content">
        {activeTab === 'dashboard' && isAdmin && (
          <AdminDashboardPage setActiveTab={setActiveTab} />
        )}

        {activeTab === 'attendance' && (
          <MarkAttendancePage />
        )}

        {activeTab === 'batches' && isAdmin && (
          <BatchesPage />
        )}

        {activeTab === 'students' && isAdmin && (
          <StudentsPage />
        )}

        {activeTab === 'teachers' && isAdmin && (
          <TeachersPage />
        )}

        {activeTab === 'settings' && isAdmin && (
          <SettingsPage />
        )}

        {activeTab === 'fees' && isAdmin && (
          <FeeTrackingPage />
        )}
      </main>
    </div>
  );
}
