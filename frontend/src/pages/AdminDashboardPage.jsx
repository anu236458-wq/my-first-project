import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import StatCard from '../components/StatCard';
import WhatsAppStatusBadge from '../components/WhatsAppStatusBadge';
import AbsentModal from '../components/AbsentModal';

export default function AdminDashboardPage({ setActiveTab }) {
  const { t } = useLanguage();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [stats, setStats] = useState(null);
  const [batchSummary, setBatchSummary] = useState([]);
  const [absentGroups, setAbsentGroups] = useState([]);
  const [expandedBatches, setExpandedBatches] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal for batch absent list & WhatsApp
  const [selectedBatchModal, setSelectedBatchModal] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, batchRes, absentRes] = await Promise.all([
        api.getDashboardStats(selectedDate),
        api.getDashboardBatchSummary(selectedDate),
        api.getDashboardAbsentGrouped(selectedDate)
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (batchRes.success) setBatchSummary(batchRes.data);
      if (absentRes.success) {
        setAbsentGroups(absentRes.data);
        // Expand first absent group by default
        if (absentRes.data.length > 0) {
          setExpandedBatches({ [absentRes.data[0].batchId]: true });
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedDate]);

  const toggleBatchExpand = (batchId) => {
    setExpandedBatches(prev => ({
      ...prev,
      [batchId]: !prev[batchId]
    }));
  };

  const openBatchWhatsAppModal = async (batchItem) => {
    try {
      const absentRes = await api.getAbsentList(batchItem.batchId, selectedDate);
      setSelectedBatchModal({
        batch: { id: batchItem.batchId, name: batchItem.batchName },
        date: selectedDate,
        presentCount: batchItem.presentCount || 0,
        absentCount: batchItem.absentCount || batchItem.students?.length || 0,
        absentList: absentRes.data?.absentList || []
      });
    } catch (err) {
      alert(`Could not load batch absent list: ${err.message}`);
    }
  };

  return (
    <div>
      {/* Date Header */}
      <div className="card" style={{ padding: '14px', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>
            📊 {t('todayOverview')}
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Real-time institute attendance & WhatsApp delivery metrics
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Date:</label>
          <input
            type="date"
            className="form-control"
            style={{ width: 'auto' }}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: 'var(--danger-light)', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)', color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '14px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Metric Cards */}
      <div className="stats-grid">
        <StatCard
          label={t('totalStudents')}
          value={stats?.totalStudents || 0}
          color="var(--primary)"
        />
        <StatCard
          label={t('present')}
          value={stats?.totalPresent || 0}
          color="var(--success)"
        />
        <StatCard
          label={t('absent')}
          value={stats?.totalAbsent || 0}
          color="var(--danger)"
        />
        <StatCard
          label={t('attendanceRate')}
          value={`${stats?.attendancePercentage || 0}%`}
          color={stats?.attendancePercentage > 75 ? 'var(--success)' : 'var(--warning)'}
        />
      </div>

      {/* Batch-wise Attendance Summary Table */}
      <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>🏫 Batch Attendance Summary</span>
          <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>
            {batchSummary.length} Active Batches
          </span>
        </h3>

        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Batch</th>
                <th>Timing</th>
                <th>Teacher</th>
                <th>Status</th>
                <th>Present / Total</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {batchSummary.map((b) => (
                <tr key={b.batchId}>
                  <td style={{ fontWeight: 700 }}>{b.batchName}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{b.timing}</td>
                  <td>{b.teacherName}</td>
                  <td>
                    {b.isMarked ? (
                      <span className="badge badge-success">✓ Marked</span>
                    ) : (
                      <span className="badge badge-warning">⏳ Pending</span>
                    )}
                  </td>
                  <td>
                    <strong>{b.presentCount}</strong> / {b.totalStudents} ({b.attendancePercentage}%)
                  </td>
                  <td>
                    <button
                      className="btn btn-outline"
                      style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                      onClick={() => openBatchWhatsAppModal(b)}
                    >
                      {b.absentCount > 0 ? `📲 WhatsApp (${b.absentCount})` : '📋 View'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Absent Students Grouped by Batch (Expandable Cards) */}
      <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px' }}>
          🚨 Absent Students Grouped by Batch ({stats?.totalAbsent || 0})
        </h3>

        {absentGroups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--success-dark)' }}>
            🎉 No absent students reported for any batch on {selectedDate}!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {absentGroups.map((group) => {
              const isExpanded = Boolean(expandedBatches[group.batchId]);
              return (
                <div
                  key={group.batchId}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden'
                  }}
                >
                  <div
                    onClick={() => toggleBatchExpand(group.batchId)}
                    style={{
                      padding: '12px 14px',
                      background: '#f8fafc',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 700 }}>{group.batchName}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
                        ({group.timing})
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="badge badge-danger">
                        {group.absentCount} Absent
                      </span>
                      <span>{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ padding: '12px', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {group.students.map((st) => (
                        <div
                          key={st.studentId}
                          style={{
                            padding: '8px 10px',
                            background: '#f8fafc',
                            borderRadius: 'var(--radius-sm)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '6px'
                          }}
                        >
                          <div>
                            <span className="roll-badge" style={{ marginRight: '6px' }}>Roll {st.rollNo}</span>
                            <span style={{ fontWeight: 700 }}>{st.studentName}</span>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
                              Parent: {st.parentName} ({st.parentPhone})
                            </span>
                          </div>

                          <div>
                            <WhatsAppStatusBadge
                              status={st.messageStatus}
                              errorReason={st.errorReason}
                            />
                          </div>
                        </div>
                      ))}

                      <div style={{ marginTop: '6px', textAlign: 'right' }}>
                        <button
                          className="btn btn-whatsapp"
                          style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                          onClick={() => openBatchWhatsAppModal(group)}
                        >
                          📲 Broadcast Absence WhatsApp
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Absent Modal */}
      {selectedBatchModal && (
        <AbsentModal
          isOpen={true}
          onClose={() => setSelectedBatchModal(null)}
          batch={selectedBatchModal.batch}
          date={selectedBatchModal.date}
          presentCount={selectedBatchModal.presentCount}
          absentCount={selectedBatchModal.absentCount}
          absentList={selectedBatchModal.absentList}
          onRefresh={fetchDashboardData}
        />
      )}
    </div>
  );
}
