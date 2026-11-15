import React, { useState } from 'react';
import { api } from '../api/client';

export default function RecordPaymentModal({ isOpen, onClose, student, onPaymentSuccess }) {
  if (!isOpen || !student) return null;

  const [amount, setAmount] = useState(student.balance || '');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const remainingBalance = student.balance || 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid payment amount greater than 0.');
      return;
    }

    if (numAmount > remainingBalance) {
      setError(`Amount cannot exceed the remaining balance of ₹${remainingBalance.toLocaleString('en-IN')}.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.recordPayment({
        student_id: student.student_id || student.id,
        amount: numAmount,
        payment_date: paymentDate,
        payment_mode: paymentMode,
        notes
      });

      if (res.success && res.data) {
        onPaymentSuccess(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to record payment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>💳 Record Fee Payment</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {student.name} • Roll {student.roll_no} ({student.batch_name})
            </p>
          </div>
          <button className="btn btn-outline" style={{ padding: '4px 10px' }} onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-3">
            {error && (
              <div style={{ padding: '10px 14px', background: 'var(--danger-light)', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)', color: 'var(--danger)', fontSize: '0.85rem' }}>
                ⚠️ {error}
              </div>
            )}

            {/* Fee summary card */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', background: '#f8fafc', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Total Fee</div>
                <div style={{ fontSize: '1rem', fontWeight: 800 }}>₹{Number(student.total_fee || 25000).toLocaleString('en-IN')}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Paid So Far</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--success)' }}>₹{Number(student.amount_paid || 0).toLocaleString('en-IN')}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Balance Due</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--danger)' }}>₹{remainingBalance.toLocaleString('en-IN')}</div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Payment Amount (₹)</label>
              <input
                type="number"
                className="form-control"
                placeholder="e.g. 10000"
                value={amount}
                max={remainingBalance}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                  onClick={() => setAmount(remainingBalance)}
                >
                  Pay Full Balance (₹{remainingBalance.toLocaleString('en-IN')})
                </button>
                {remainingBalance > 10000 && (
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                    onClick={() => setAmount(10000)}
                  >
                    ₹10,000 Installment
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label">Payment Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Payment Mode</label>
                <select
                  className="form-control"
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                >
                  <option value="UPI">📱 UPI (GPay / PhonePe / Paytm)</option>
                  <option value="Cash">💵 Cash</option>
                  <option value="Card">💳 Debit / Credit Card</option>
                  <option value="Bank Transfer">🏦 Bank Transfer (NEFT/IMPS)</option>
                  <option value="Cheque">📄 Cheque</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Transaction Reference / Notes (Optional)</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. UPI Ref 38291048291, or Cheque #102931"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 1, height: '46px', fontSize: '1rem' }}
              disabled={loading || remainingBalance <= 0}
            >
              {loading ? 'Processing...' : `✓ Confirm & Issue Receipt (₹${Number(amount || 0).toLocaleString('en-IN')})`}
            </button>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
