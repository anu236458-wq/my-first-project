import React, { useState, useEffect } from 'react';
import { api } from '../api/client';

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [instituteName, setInstituteName] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templateText, setTemplateText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await api.getSettings();
      if (res.success && res.data) {
        setSettings(res.data);
        setInstituteName(res.data.institute?.name || '');
        setTemplateName(res.data.whatsapp?.templateName || '');
        setTemplateText(res.data.whatsapp?.templateText || '');
      }
    } catch (err) {
      alert(`Failed to load settings: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSavedMsg(false);
    try {
      const res = await api.updateSettings({
        institute_name: instituteName,
        whatsapp_template_name: templateName,
        whatsapp_template_text: templateText
      });
      if (res.success) {
        setSavedMsg(true);
        setTimeout(() => setSavedMsg(false), 3000);
      }
    } catch (err) {
      alert(`Error updating settings: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading configuration...</div>;
  }

  return (
    <div>
      <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '4px' }}>
          ⚙️ Institute & WhatsApp Configuration
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Manage your coaching branding, WhatsApp Business credentials, and message templates.
        </p>
      </div>

      {savedMsg && (
        <div style={{ padding: '10px 14px', background: 'var(--success-light)', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-md)', color: 'var(--success-dark)', fontSize: '0.85rem', marginBottom: '14px' }}>
          ✓ Settings saved successfully.
        </div>
      )}

      {/* WhatsApp Status Card */}
      <div className="card" style={{ padding: '18px', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>📱 WhatsApp Provider Service Status</span>
          <span className="badge badge-success" style={{ textTransform: 'uppercase' }}>
            {settings?.whatsapp?.activeProvider}
          </span>
        </h3>

        <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: '14px' }}>
          <div style={{ fontSize: '0.88rem', marginBottom: '6px' }}>
            Active Provider Engine: <strong>{settings?.whatsapp?.providerName}</strong>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
            Meta Cloud Credentials: {settings?.whatsapp?.metaConfigured ? '🟢 Configured' : '🟡 In Development / Mock Mode'}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Tip: All API tokens and private keys are secured in the server environment variables (<code>backend/.env</code>) and never leaked to the client browser.
          </div>
        </div>
      </div>

      {/* Settings Form */}
      <div className="card" style={{ padding: '18px' }}>
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Coaching Institute Name</label>
            <input
              type="text"
              className="form-control"
              value={instituteName}
              onChange={(e) => setInstituteName(e.target.value)}
              required
            />
            <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              Appears on navigation bars, reports, and is appended to all parent WhatsApp notifications.
            </small>
          </div>

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label className="form-label">Approved Meta WhatsApp Template Name</label>
            <input
              type="text"
              className="form-control"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label className="form-label">Message Template Preview</label>
            <textarea
              className="form-control"
              rows="3"
              value={templateText}
              onChange={(e) => setTemplateText(e.target.value)}
              required
            />
            <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              Variables: <code>{"{{parent_name}}"}</code>, <code>{"{{student_name}}"}</code>, <code>{"{{batch}}"}</code>, <code>{"{{date}}"}</code>, <code>{"{{institute_name}}"}</code>
            </small>
          </div>

          <div style={{ marginTop: '20px' }}>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ minWidth: '160px', height: '44px' }}
              disabled={saving}
            >
              {saving ? 'Saving Changes...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
