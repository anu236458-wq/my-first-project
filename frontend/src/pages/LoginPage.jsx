import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)' }}>
      <div style={{ maxWidth: '420px', width: '100%', background: '#ffffff', borderRadius: 'var(--radius-lg)', padding: '28px', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '6px' }}>🎓</div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--primary)' }}>
            {t('appTitle')}
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Attendance & Parent WhatsApp Alerts System
          </p>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', background: 'var(--danger-light)', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)', color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '16px' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t('email')}</label>
            <input
              type="email"
              className="form-control"
              placeholder="e.g. rahul@apex.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('password')}</label>
            <input
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', height: '46px', fontSize: '1rem', marginTop: '8px' }}
            disabled={loading}
          >
            {loading ? 'Signing In...' : t('loginBtn')}
          </button>
        </form>

        <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px', textAlign: 'center', fontWeight: 600 }}>
            QUICK DEMO ONE-TAP LOGIN
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-outline"
              style={{ fontSize: '0.85rem', padding: '8px 12px' }}
              onClick={() => fillCredentials('admin@apex.com', 'admin123')}
            >
              👑 {t('quickFillAdmin')}
            </button>
            <button
              type="button"
              className="btn btn-outline"
              style={{ fontSize: '0.85rem', padding: '8px 12px' }}
              onClick={() => fillCredentials('rahul@apex.com', 'teacher123')}
            >
              🧑‍🏫 {t('quickFillTeacher')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
