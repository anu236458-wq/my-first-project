import React, { useState } from 'react';
import { api } from '../api/client';
import WhatsAppStatusBadge from './WhatsAppStatusBadge';

export default function FeeReminderModal({ isOpen, onClose, defaulters = [], onReminderSuccess }) {
  if (!isOpen) return null;

  const [sending, setSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [results, setResults] = useState({});
  const [alreadyDispatched, setAlreadyDispatched] = useState(false);
  const [summaryMsg, setSummaryMsg] = useState(null);

  const handleBroadcast = async () => {
    setShowConfirm(false);
    setSending(true);
    setSummaryMsg(null);

    try {
      const res = await api.sendFeeReminderBroadcast();
      if (res.success && res.data) {
        setAlreadyDispatched(true);
        setSummaryMsg(res.message);

        const resultMap = {};
        res.data.results.forEach(r => {
          resultMap[r.studentId] = {
            status: r.status,
            error: r.error,
            directLink: r.directLink
          };
        });
        setResults(resultMap);

        if (onReminderSuccess) onReminderSuccess();
      }
    } catch (err) {
      alert(`Fee Reminder broadcast failed: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>📲 Broadcast WhatsApp Fee Reminder</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Notify parents of students with overdue fee installments
            </p>
          </div>
          <button className="btn btn-outline" style={{ padding: '4px 10px' }} onClick={onClose}>✕</button>
        </div>

        <div className="modal-body space-y-3">
          {summaryMsg && (
            <div style={{ padding: '10px 14px', background: '#eff6ff', borderRadius: 'var(--radius-md)', border: '1px solid #bfdbfe', fontSize: '0.85rem', color: '#1e40af' }}>
              📢 {summaryMsg}
            </div>
          )}

          <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: '10px 12px', borderRadius: 'var(--radius-md)', fontSize: '0.82rem', color: '#92400e' }}>
            Template Preview:
            <div style={{ fontStyle: 'italic', marginTop: '4px', color: '#78350f' }}>
              "Dear {"{{parent_name}}"}, this is a gentle reminder that a pending fee of Rs. {"{{pending_amount}}"} for {"{{student_name}}"} ({"{{batch}}"}) was due on {"{{due_date}}"}. Kindly clear the dues. - Apex Coaching"
            </div>
          </div>

          <div className="space-y-2">
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>
              Defaulters List ({defaulters.length})
            </h4>

            {defaulters.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--success)' }}>
                🎉 No overdue fee defaulters at this time!
              </div>
            ) : (
              defaulters.map(d => {
                const live = results[d.student_id];
                const status = live?.status || d.reminder_status || 'Not Sent';
                const error = live?.error;
                const directLink = live?.directLink || `https://wa.me/${(d.parent_phone || '').replace(/[^\d]/g, '')}?text=${encodeURIComponent(`Dear ${d.parent_name || 'Parent'}, pending fee of Rs. ${Number(d.balance).toLocaleString('en-IN')} for ${d.name} (${d.batch_name}) is due. Kindly clear the dues. - Apex Coaching`)}`;

                return (
                  <div
                    key={d.student_id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '10px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span className="roll-badge" style={{ marginRight: '6px' }}>Roll {d.roll_no}</span>
                        <strong style={{ fontSize: '0.92rem' }}>{d.name}</strong>
                      </div>
                      <span style={{ fontWeight: 800, color: 'var(--danger)', fontSize: '0.95rem' }}>
                        ₹{Number(d.balance).toLocaleString('en-IN')} due
                      </span>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Parent: {d.parent_name} ({d.parent_phone})</span>
                      <span>Due: {d.due_date || 'Past'}</span>
                    </div>

                    <div style={{ marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <WhatsAppStatusBadge
                        status={status}
                        errorReason={error}
                        directLink={directLink}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="modal-footer" style={{ flexDirection: 'column' }}>
          {showConfirm ? (
            <div style={{ background: '#fef3c7', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid #fde68a' }}>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#92400e', marginBottom: '6px' }}>
                ⚠️ Confirm Fee Reminder Blast
              </div>
              <p style={{ fontSize: '0.85rem', color: '#78350f', marginBottom: '10px' }}>
                Send official WhatsApp fee reminders to <strong>{defaulters.length} parent(s)</strong> with overdue balances?
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-whatsapp"
                  style={{ flex: 1 }}
                  onClick={handleBroadcast}
                >
                  ✓ Yes, Dispatch Reminders
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
              style={{ width: '100%', height: '48px', fontSize: '1rem', fontWeight: 800 }}
              disabled={sending || alreadyDispatched || defaulters.length === 0}
              onClick={() => setShowConfirm(true)}
            >
              {sending ? '⏳ Sending Reminders...' : alreadyDispatched ? '✓ Reminders Dispatched via WhatsApp' : `📲 Send Fee Reminder to All (${defaulters.length} Defaulters)`}
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
