import React, { useState } from 'react';
import { api } from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import WhatsAppStatusBadge from './WhatsAppStatusBadge';

export default function AbsentModal({
  isOpen,
  onClose,
  batch,
  date,
  presentCount,
  absentCount,
  absentList = [],
  onRefresh
}) {
  const { t } = useLanguage();
  const [sendingAll, setSendingAll] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [retryingStudentId, setRetryingStudentId] = useState(null);
  const [messageResults, setMessageResults] = useState({});
  const [alreadySentBatch, setAlreadySentBatch] = useState(false);
  const [broadcastSummary, setBroadcastSummary] = useState(null);

  if (!isOpen) return null;

  // Check if messages have already been dispatched for this batch
  const allSentInitially = absentList.length > 0 && absentList.every(s => s.message_status === 'Sent' || s.message_status === 'Delivered');

  const handleSendAllClick = () => {
    setShowConfirm(true);
  };

  const executeSendAll = async () => {
    setShowConfirm(false);
    setSendingAll(true);
    setBroadcastSummary(null);

    try {
      const res = await api.sendAbsentBroadcast(batch.id, date);
      if (res.success && res.data) {
        setBroadcastSummary(res.message);
        setAlreadySentBatch(true);

        // Update local status map
        const resultMap = {};
        res.data.results.forEach(r => {
          resultMap[r.studentId] = {
            status: r.status,
            error: r.error,
            directLink: r.directLink,
            logId: r.logId
          };
        });
        setMessageResults(resultMap);

        if (onRefresh) onRefresh();
      }
    } catch (err) {
      if (err.details?.alreadySent) {
        setAlreadySentBatch(true);
        setBroadcastSummary(err.message);
      } else {
        alert(`WhatsApp Dispatch error: ${err.message}`);
      }
    } finally {
      setSendingAll(false);
    }
  };

  const handleRetrySingle = async (student) => {
    setRetryingStudentId(student.student_id || student.id);
    try {
      const logInfo = messageResults[student.student_id || student.id];
      const res = await api.retrySingleMessage({
        student_id: student.student_id || student.id,
        batch_id: batch.id,
        date,
        log_id: logInfo?.logId || student.message_log_id
      });

      if (res.success && res.data) {
        setMessageResults(prev => ({
          ...prev,
          [student.student_id || student.id]: {
            status: res.data.status,
            error: res.data.error,
            directLink: res.data.directLink,
            logId: res.data.logId
          }
        }));
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      alert(`Retry failed: ${err.message}`);
    } finally {
      setRetryingStudentId(null);
    }
  };

  const isDispatchDisabled = sendingAll || alreadySentBatch || allSentInitially || absentCount === 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>📋 {t('absentSummary')}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {batch?.name} • {date}
            </p>
          </div>
          <button className="btn btn-outline" style={{ padding: '4px 10px' }} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {/* Summary counters */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <div style={{ flex: 1, padding: '10px', background: 'var(--success-light)', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)' }}>{presentCount}</div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--success-dark)' }}>{t('present')}</div>
            </div>
            <div style={{ flex: 1, padding: '10px', background: 'var(--danger-light)', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid #fecaca' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--danger)' }}>{absentCount}</div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--danger-dark)' }}>{t('absent')}</div>
            </div>
          </div>

          {broadcastSummary && (
            <div style={{ padding: '10px 14px', background: '#eff6ff', borderRadius: 'var(--radius-md)', border: '1px solid #bfdbfe', marginBottom: '14px', fontSize: '0.85rem', color: '#1e40af' }}>
              📢 {broadcastSummary}
            </div>
          )}

          {absentCount === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--success-dark)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🎉</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{t('noAbsentToday')}</div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                All enrolled students in this batch are marked present.
              </p>
            </div>
          ) : (
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '10px', color: '#334155' }}>
                Absent Students ({absentCount})
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {absentList.map((st) => {
                  const sId = st.student_id || st.id;
                  const liveResult = messageResults[sId];
                  const currentStatus = liveResult?.status || st.message_status || 'Not Sent';
                  const currentError = liveResult?.error || st.error_reason;
                  const directLink = liveResult?.directLink || `https://wa.me/${(st.parent_phone || '').replace(/[^\d]/g, '')}?text=${encodeURIComponent(`Dear ${st.parent_name || 'Parent'}, ${st.student_name || st.name} was absent from ${batch.name} on ${date}. - Apex Institute`)}`;

                  return (
                    <div
                      key={sId}
                      style={{
                        padding: '12px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)',
                        background: '#ffffff',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span className="roll-badge" style={{ marginRight: '6px' }}>Roll {st.roll_no}</span>
                          <span style={{ fontWeight: 700 }}>{st.student_name || st.name}</span>
                        </div>
                      </div>

                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Parent: <strong>{st.parent_name}</strong> • 📱 {st.parent_phone}
                      </div>

                      <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <WhatsAppStatusBadge
                          status={currentStatus}
                          errorReason={currentError}
                          directLink={directLink}
                          onRetry={() => handleRetrySingle(st)}
                          isRetrying={retryingStudentId === sId}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ flexDirection: 'column' }}>
          {showConfirm ? (
            <div style={{ background: '#fef3c7', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid #fde68a' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#92400e', marginBottom: '6px' }}>
                ⚠️ Confirm WhatsApp Alert
              </div>
              <p style={{ fontSize: '0.85rem', color: '#78350f', marginBottom: '10px' }}>
                Send official WhatsApp absence notification to <strong>{absentCount} parent(s)</strong>?
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-whatsapp"
                  style={{ flex: 1 }}
                  onClick={executeSendAll}
                >
                  ✓ Yes, Send Now
                </button>
                <button
                  className="btn btn-outline"
                  onClick={() => setShowConfirm(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              className="btn btn-whatsapp"
              style={{ width: '100%', height: '48px', fontSize: '1rem', fontWeight: 700 }}
              disabled={isDispatchDisabled}
              onClick={handleSendAllClick}
            >
              {sendingAll ? (
                '⏳ Sending WhatsApp Alerts...'
              ) : alreadySentBatch || allSentInitially ? (
                '✓ WhatsApp Messages Already Sent'
              ) : absentCount === 0 ? (
                '✓ No Absent Students'
              ) : (
                `📲 ${t('sendWhatsAppAll')} (${absentCount})`
              )}
            </button>
          )}

          <button className="btn btn-outline" style={{ width: '100%' }} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
