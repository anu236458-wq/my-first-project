import React, { useState, useEffect } from 'react';
import { api } from '../api/client';

export default function TeachersPage() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add teacher modal
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+91');
  const [password, setPassword] = useState('teacher123');
  const [saving, setSaving] = useState(false);

  const loadTeachers = async () => {
    setLoading(true);
    try {
      const res = await api.getTeachers();
      if (res.success) setTeachers(res.data);
    } catch (err) {
      alert(`Error loading teachers: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeachers();
  }, []);

  const handleCreateTeacher = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      alert('Please fill all required fields');
      return;
    }

    setSaving(true);
    try {
      const res = await api.createTeacher({
        name,
        email,
        phone,
        password
      });

      if (res.success) {
        setShowModal(false);
        setName('');
        setEmail('');
        setPhone('+91');
        setPassword('teacher123');
        loadTeachers();
      }
    } catch (err) {
      alert(`Error creating teacher: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="card" style={{ padding: '14px', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>
            👨‍🏫 Faculty & Teachers
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Manage staff accounts and batch attendance permissions
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Add Teacher
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>Loading teachers...</div>
      ) : (
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Teacher Name</th>
                <th>Email (Login)</th>
                <th>Phone</th>
                <th>Assigned Batches</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map(t => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 700 }}>{t.name}</td>
                  <td>{t.email}</td>
                  <td>{t.phone || '—'}</td>
                  <td><strong>{t.assigned_batch_count || 0}</strong> active batches</td>
                  <td>
                    <span className={`badge ${t.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Teacher Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 800 }}>Create Teacher Account</h3>
              <button className="btn btn-outline" style={{ padding: '4px 10px' }} onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateTeacher}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Rahul Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email (Login ID)</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="rahul@apex.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="+919876543201"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Initial Password</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="teacher123"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
                  {saving ? 'Creating...' : 'Create Account'}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
