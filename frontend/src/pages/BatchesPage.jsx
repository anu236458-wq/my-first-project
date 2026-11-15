import React, { useState, useEffect } from 'react';
import { api } from '../api/client';

export default function BatchesPage() {
  const [batches, setBatches] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form modal state
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [timing, setTiming] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [batchRes, teacherRes] = await Promise.all([
        api.getBatches(),
        api.getTeachers()
      ]);
      if (batchRes.success) setBatches(batchRes.data);
      if (teacherRes.success) {
        setTeachers(teacherRes.data);
        if (teacherRes.data.length > 0) setTeacherId(String(teacherRes.data[0].id));
      }
    } catch (err) {
      setError(err.message || 'Failed to load batches.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    if (!name || !subject || !timing || !teacherId) {
      alert('Please fill all fields');
      return;
    }

    setSaving(true);
    try {
      const res = await api.createBatch({
        name,
        subject,
        timing,
        teacher_id: teacherId
      });
      if (res.success) {
        setShowModal(false);
        setName('');
        setSubject('');
        setTiming('');
        loadData();
      }
    } catch (err) {
      alert(`Error creating batch: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="card" style={{ padding: '14px', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>
            🏫 Batches Management
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Configure institute classes, timings, and assign teachers
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Add Batch
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>Loading batches...</div>
      ) : (
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Batch Name</th>
                <th>Subject</th>
                <th>Timing</th>
                <th>Assigned Teacher</th>
                <th>Active Students</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {batches.map(b => (
                <tr key={b.id}>
                  <td style={{ fontWeight: 700 }}>{b.name}</td>
                  <td>{b.subject}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{b.timing}</td>
                  <td>👨‍🏫 {b.teacher_name || 'Unassigned'}</td>
                  <td><strong>{b.active_student_count || 0}</strong> students</td>
                  <td>
                    <span className={`badge ${b.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Batch Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 800 }}>Add New Batch</h3>
              <button className="btn btn-outline" style={{ padding: '4px 10px' }} onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateBatch}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Batch Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Class 10 - Evening Physics"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Subject</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Physics, Chemistry, Maths"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Timing</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 04:00 PM - 05:30 PM"
                    value={timing}
                    onChange={(e) => setTiming(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Assign Teacher</label>
                  <select
                    className="form-control"
                    value={teacherId}
                    onChange={(e) => setTeacherId(e.target.value)}
                    required
                  >
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
                  {saving ? 'Saving...' : 'Create Batch'}
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
