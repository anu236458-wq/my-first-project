import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function Navbar({ activeTab, setActiveTab }) {
  const { user, logout, isAdmin } = useAuth();
  const { lang, toggleLanguage, t } = useLanguage();

  if (!user) return null;

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="brand" onClick={() => setActiveTab(isAdmin ? 'dashboard' : 'attendance')} style={{ cursor: 'pointer' }}>
          <span>🎓</span>
          <span>{t('appTitle')}</span>
        </div>

        <div className="nav-links">
          {isAdmin && (
            <button
              className={`nav-pill ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              📊 {t('dashboard')}
            </button>
          )}

          <button
            className={`nav-pill ${activeTab === 'attendance' ? 'active' : ''}`}
            onClick={() => setActiveTab('attendance')}
          >
            📋 {t('markAttendance')}
          </button>

          {isAdmin && (
            <>
              <button
                className={`nav-pill ${activeTab === 'batches' ? 'active' : ''}`}
                onClick={() => setActiveTab('batches')}
              >
                🏫 {t('batches')}
              </button>
              <button
                className={`nav-pill ${activeTab === 'students' ? 'active' : ''}`}
                onClick={() => setActiveTab('students')}
              >
                👨‍🎓 {t('students')}
              </button>
              <button
                className={`nav-pill ${activeTab === 'teachers' ? 'active' : ''}`}
                onClick={() => setActiveTab('teachers')}
              >
                👨‍🏫 {t('teachers')}
              </button>
              <button
                className={`nav-pill ${activeTab === 'fees' ? 'active' : ''}`}
                onClick={() => setActiveTab('fees')}
              >
                💰 {t('fees')}
              </button>
              <button
                className={`nav-pill ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => setActiveTab('settings')}
              >
                ⚙️ {t('settings')}
              </button>
            </>
          )}

          <button
            className="nav-pill"
            onClick={toggleLanguage}
            title="Toggle Language"
            style={{ fontWeight: 700 }}
          >
            {lang === 'en' ? '🇮🇳 हिंदी' : '🇬🇧 EN'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className={`role-badge ${user.role.toLowerCase()}`}>
              {user.name.split(' ')[0]} ({user.role})
            </span>
            <button
              className="btn btn-outline"
              style={{ padding: '4px 10px', fontSize: '0.8rem' }}
              onClick={logout}
              title={t('logout')}
            >
              🚪
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
