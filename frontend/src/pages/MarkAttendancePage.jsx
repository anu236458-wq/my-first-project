import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LiveCounter from '../components/LiveCounter';
import AttendanceRow from '../components/AttendanceRow';
import AbsentModal from '../components/AbsentModal';

export default function MarkAttendancePage() {
  const { user, isTeacher } = useAuth();
  const { t } = useLanguage();

  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // View state: 'batches' (list of teacher batches) or 'marking' (student roster)
  const [viewState, setViewState] = useState(isTeacher ? 'batches' : 'marking');

  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [isAlreadySubmitted, setIsAlreadySubmitted] = useState(false);

  // Absent summary modal state
  const [showAbsentModal, setShowAbsentModal] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);

  // Load available batches for user
  useEffect(() => {
    async function loadBatches() {
      try {
        const res = await api.getBatches();
        if (res.success && res.data.length > 0) {
          setBatches(res.data);
          setSelectedBatchId(String(res.data[0].id));
        }
      } catch (err) {
        setError('Failed to load batches.');
      }
    }
    loadBatches();
  }, []);

  // Fetch roster when batch or date changes
  const fetchRoster = async () => {
    if (!selectedBatchId || !selectedDate) return;
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await api.getBatchRoster(selectedBatchId, selectedDate);
      if (res.success && res.data) {
        setRoster(res.data.roster);
        setIsAlreadySubmitted(res.data.isSubmitted);
      }
    } catch (err) {
      setError(err.message || 'Failed to load students roster.');
      setRoster([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedBatchId && viewState === 'marking') {
      fetchRoster();
    }
  }, [selectedBatchId, selectedDate, viewState]);

  // Select batch and enter marking view
  const handleSelectBatchAndMark = (batchId) => {
    setSelectedBatchId(String(batchId));
    setViewState('marking');
  };

  // Back button handler
  const handleBackToBatches = () => {
    setViewState('batches');
  };

  // Mark single student P or A
  const handleMark = (studentId, status) => {
    setRoster(prev =>
      prev.map(st => (st.id === studentId ? { ...st, status } : st))
    );
  };

  const handleMarkAllPresent = () => {
    setRoster(prev => prev.map(st => ({ ...st, status: 'P' })));
  };

  const totalStudents = roster.length;
  const presentCount = roster.filter(s => s.status === 'P').length;
  const absentCount = roster.filter(s => s.status === 'A').length;
  const unmarkedCount = roster.filter(s => s.status === null || s.status === undefined).length;

  const isComplete = totalStudents > 0 && unmarkedCount === 0;

  // Submit attendance
  const handleSubmit = async () => {
    if (!isComplete) return;

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    const records = roster.map(s => ({
      student_id: s.id,
      status: s.status
    }));

    try {
      const res = await api.submitAttendance(selectedBatchId, selectedDate, records);
      if (res.success && res.data) {
        setIsAlreadySubmitted(true);
        setSuccessMsg(res.message);

        const absentRes = await api.getAbsentList(selectedBatchId, selectedDate);
        setSubmittedData({
          batch: res.data.batch,
          date: res.data.date,
          presentCount: res.data.presentCount,
          absentCount: res.data.absentCount,
          absentList: absentRes.data?.absentList || []
        });

        setShowAbsentModal(true);
      }
    } catch (err) {
      setError(err.message || 'Failed to submit attendance.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedBatch = batches.find(b => String(b.id) === String(selectedBatchId));

  // ================= VIEW 1: TEACHER BATCHES DIRECTORY =================
  if (viewState === 'batches') {
    return (
      <div className="space-y-3">
        <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.3px' }}>
              🧑‍🏫 My Assigned Batches
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Select a batch below to mark today's attendance ({selectedDate})
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Date:</label>
            <input
              type="date"
              className="form-control"
              style={{ width: 'auto', padding: '6px 10px', fontSize: '0.85rem' }}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {batches.map(b => (
            <div
              key={b.id}
              className="student-row-card"
              style={{ padding: '16px', cursor: 'pointer' }}
              onClick={() => handleSelectBatchAndMark(b.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 800 }}>
                  🏫
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>{b.name}</h3>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    ⏰ {b.timing} • 📚 {b.subject} • 👥 {b.active_student_count || 0} Students
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ padding: '8px 16px', fontSize: '0.85rem', borderRadius: '12px' }}
                >
                  Mark Attendance →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ================= VIEW 2: MARK ATTENDANCE ROSTER (WITH BACK BUTTON) =================
  return (
    <div>
      {/* Top Bar with Clear BACK BUTTON */}
      <div className="card" style={{ padding: '12px 16px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <button
          type="button"
          className="btn btn-outline"
          onClick={handleBackToBatches}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', fontSize: '0.85rem', fontWeight: 700 }}
        >
          ← Back to Batches
        </button>

        <div style={{ textAlign: 'right' }}>
          <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--primary)' }}>
            {selectedBatch?.name || 'Batch'}
          </span>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {selectedDate} • {selectedBatch?.timing}
          </div>
        </div>
      </div>

      {isAlreadySubmitted && (
        <div style={{ padding: '10px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 'var(--radius-md)', color: '#1e40af', fontSize: '0.85rem', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>ℹ️ {t('alreadyMarkedToday')}</span>
          <button
            className="btn btn-outline"
            style={{ padding: '3px 8px', fontSize: '0.75rem', background: '#ffffff' }}
            onClick={async () => {
              const absentRes = await api.getAbsentList(selectedBatchId, selectedDate);
              setSubmittedData({
                batch: selectedBatch,
                date: selectedDate,
                presentCount,
                absentCount,
                absentList: absentRes.data?.absentList || []
              });
              setShowAbsentModal(true);
            }}
          >
            📋 View Absent List / WhatsApp
          </button>
        </div>
      )}

      {error && (
        <div style={{ padding: '10px 14px', background: 'var(--danger-light)', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)', color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '12px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Top Status Pill Bar (Matching User Reference Image) */}
      <LiveCounter
        presentCount={presentCount}
        absentCount={absentCount}
        unmarkedCount={unmarkedCount}
      />

      {/* Quick Mark All Present Helper */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
        <button
          type="button"
          className="btn btn-outline"
          style={{ padding: '4px 10px', fontSize: '0.78rem' }}
          onClick={handleMarkAllPresent}
          disabled={loading || roster.length === 0}
        >
          ✓ Mark All Present
        </button>
      </div>

      {/* Student List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
          ⏳ Loading students roster...
        </div>
      ) : roster.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '30px' }}>
          <p style={{ color: 'var(--text-muted)' }}>No active students enrolled in this batch.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {roster.map(student => (
            <AttendanceRow
              key={student.id}
              student={student}
              status={student.status}
              onMark={handleMark}
            />
          ))}
        </div>
      )}

      {/* Sticky Bottom Submit Bar */}
      <div className="sticky-bottom-bar">
        <div className="sticky-bottom-inner">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>
              {isComplete ? 'All Students Marked ✓' : `${unmarkedCount} Student(s) Unmarked`}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              P: {presentCount} • A: {absentCount}
            </span>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            style={{ minWidth: '170px', height: '46px', fontSize: '0.95rem', fontWeight: 800 }}
            disabled={!isComplete || submitting}
            onClick={handleSubmit}
          >
            {submitting ? 'Submitting...' : t('submitAttendance')}
          </button>
        </div>
      </div>

      {/* Absent List & One-Tap WhatsApp Modal */}
      {submittedData && (
        <AbsentModal
          isOpen={showAbsentModal}
          onClose={() => setShowAbsentModal(false)}
          batch={submittedData.batch}
          date={submittedData.date}
          presentCount={submittedData.presentCount}
          absentCount={submittedData.absentCount}
          absentList={submittedData.absentList}
          onRefresh={fetchRoster}
        />
      )}
    </div>
  );
}
