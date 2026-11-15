import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import StatCard from '../components/StatCard';
import RecordPaymentModal from '../components/RecordPaymentModal';
import ReceiptModal from '../components/ReceiptModal';
import FeeReminderModal from '../components/FeeReminderModal';
import { getInitials, getAvatarStyle } from '../components/AttendanceRow';

export default function FeeTrackingPage() {
  const [summary, setSummary] = useState(null);
  const [feesList, setFeesList] = useState([]);
  const [defaulters, setDefaulters] = useState([]);
  const [batches, setBatches] = useState([]);

  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'defaulters'

  const [loading, setLoading] = useState(true);

  // Modals
  const [selectedStudentForPay, setSelectedStudentForPay] = useState(null);
  const [activeReceipt, setActiveReceipt] = useState(null);
  const [showReminderModal, setShowReminderModal] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedBatch) params.batch_id = selectedBatch;
      if (selectedStatus !== 'All') params.status = selectedStatus;
      if (searchQuery) params.search = searchQuery;

      const [sumRes, feeRes, defRes, batchRes] = await Promise.all([
        api.getFeeSummary(),
        api.getFees(params),
        api.getDefaulters({ batch_id: selectedBatch }),
        api.getBatches()
      ]);

      if (sumRes.success) setSummary(sumRes.data);
      if (feeRes.success) setFeesList(feeRes.data);
      if (defRes.success) setDefaulters(defRes.data);
      if (batchRes.success) setBatches(batchRes.data);
    } catch (err) {
      console.error('Failed to load fees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBatch, selectedStatus, searchQuery]);

  const handlePaymentSuccess = (receiptData) => {
    setSelectedStudentForPay(null);
    setActiveReceipt(receiptData);
    loadData();
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Paid':
        return <span className="badge badge-success">✓ Paid</span>;
      case 'Partial':
        return <span className="badge badge-warning">⏳ Partial</span>;
      case 'Overdue':
        return <span className="badge badge-danger">🚨 Overdue</span>;
      default:
        return <span className="badge badge-neutral">⏳ Pending</span>;
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="card" style={{ padding: '16px', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.3px' }}>
            💰 Student Fee Tracking & Receipts
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Record payments, generate printable receipts, and send WhatsApp payment reminders
          </p>
        </div>

        <button
          className="btn btn-whatsapp"
          onClick={() => setShowReminderModal(true)}
          disabled={defaulters.length === 0}
        >
          📲 Remind Defaulters ({defaulters.length})
        </button>
      </div>

      {/* 4 Summary Cards */}
      <div className="stats-grid">
        <StatCard
          label="Total Collected"
          value={`₹${Number(summary?.totalCollected || 0).toLocaleString('en-IN')}`}
          color="var(--success)"
        />
        <StatCard
          label="Pending Balance"
          value={`₹${Number(summary?.totalPending || 0).toLocaleString('en-IN')}`}
          color="var(--warning)"
        />
        <StatCard
          label="Total Overdue"
          value={`₹${Number(summary?.totalOverdue || 0).toLocaleString('en-IN')}`}
          color="var(--danger)"
        />
        <StatCard
          label="Fee Defaulters"
          value={summary?.defaultersCount || 0}
          color="var(--danger)"
        />
      </div>

      {/* View Switcher Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
        <button
          className={`nav-pill ${activeTab === 'all' ? 'active' : ''}`}
          style={{ fontSize: '0.85rem', padding: '8px 16px', borderRadius: 'var(--radius-md)' }}
          onClick={() => setActiveTab('all')}
        >
          👥 All Students Fee Roster ({feesList.length})
        </button>
        <button
          className={`nav-pill ${activeTab === 'defaulters' ? 'active' : ''}`}
          style={{ fontSize: '0.85rem', padding: '8px 16px', borderRadius: 'var(--radius-md)' }}
          onClick={() => setActiveTab('defaulters')}
        >
          🚨 Overdue Defaulters ({defaulters.length})
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '12px', marginBottom: '14px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '180px' }}>
          <input
            type="text"
            className="form-control"
            placeholder="🔍 Search student name or roll..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ width: '180px' }}>
          <select
            className="form-control"
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
          >
            <option value="">All Batches</option>
            {batches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        {activeTab === 'all' && (
          <div style={{ width: '140px' }}>
            <select
              className="form-control"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Partial">Partial</option>
              <option value="Pending">Pending</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>
        )}
      </div>

      {/* Student Fee Cards List (Matching our reference design) */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading fee records...</div>
      ) : activeTab === 'all' ? (
        feesList.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
            No student fee records found.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {feesList.map(st => {
              const initials = getInitials(st.name);
              const avatarStyle = getAvatarStyle(st.student_id);

              return (
                <div key={st.student_id} className="student-row-card" style={{ flexWrap: 'wrap', padding: '14px 16px' }}>
                  {/* Left: Avatar */}
                  <div className="student-avatar" style={{ backgroundColor: avatarStyle.bg, color: avatarStyle.text }}>
                    {initials}
                  </div>

                  {/* Middle: Student & Fee Details */}
                  <div className="student-meta" style={{ minWidth: '180px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <h4 className="student-title">{st.name}</h4>
                      <span className="roll-badge">Roll {st.roll_no}</span>
                    </div>

                    <div className="student-subtitle">
                      <span>{st.batch_name}</span> • <span>Parent: {st.parent_name}</span>
                    </div>

                    <div style={{ marginTop: '4px', fontSize: '0.82rem', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <span>Total: <strong>₹{Number(st.total_fee).toLocaleString('en-IN')}</strong></span>
                      <span style={{ color: 'var(--success)' }}>Paid: <strong>₹{Number(st.amount_paid).toLocaleString('en-IN')}</strong></span>
                      <span style={{ color: st.balance > 0 ? 'var(--danger)' : 'var(--success)' }}>
                        Balance: <strong>₹{Number(st.balance).toLocaleString('en-IN')}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Right: Status Pill & Record Payment Button */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
                    {getStatusBadge(st.status)}

                    {st.balance > 0 ? (
                      <button
                        className="btn btn-primary"
                        style={{ padding: '6px 14px', fontSize: '0.82rem', height: '38px' }}
                        onClick={() => setSelectedStudentForPay(st)}
                      >
                        💳 Pay
                      </button>
                    ) : (
                      st.last_receipt_number && (
                        <button
                          className="btn btn-outline"
                          style={{ padding: '6px 12px', fontSize: '0.8rem', height: '38px' }}
                          onClick={async () => {
                            const res = await api.getReceipt(st.last_receipt_number);
                            if (res.success) setActiveReceipt(res.data);
                          }}
                        >
                          🧾 Receipt
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Defaulters Tab */
        defaulters.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--success)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🎉</div>
            <h3 style={{ fontWeight: 800 }}>No Overdue Defaulters!</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>All students are up-to-date with fee installments.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {defaulters.map(d => {
              const initials = getInitials(d.name);
              const avatarStyle = getAvatarStyle(d.student_id);

              return (
                <div key={d.student_id} className="student-row-card" style={{ borderLeft: '4px solid #ef4444' }}>
                  <div className="student-avatar" style={{ backgroundColor: avatarStyle.bg, color: avatarStyle.text }}>
                    {initials}
                  </div>

                  <div className="student-meta">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <h4 className="student-title">{d.name}</h4>
                      <span className="roll-badge">Roll {d.roll_no}</span>
                    </div>

                    <div className="student-subtitle">
                      <span>{d.batch_name}</span> • <span>Parent: {d.parent_name} ({d.parent_phone})</span>
                    </div>

                    <div style={{ marginTop: '4px', fontSize: '0.85rem', color: 'var(--danger)', fontWeight: 800 }}>
                      Pending Due: ₹{Number(d.balance).toLocaleString('en-IN')} (Due: {d.due_date || 'Past'})
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <a
                      href={`https://wa.me/${(d.parent_phone || '').replace(/[^\d]/g, '')}?text=${encodeURIComponent(`Dear ${d.parent_name || 'Parent'}, gentle reminder that fee installment of Rs. ${Number(d.balance).toLocaleString('en-IN')} for ${d.name} (${d.batch_name}) is overdue. Kindly clear the dues. - Apex Coaching`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline"
                      style={{ padding: '6px 12px', fontSize: '0.8rem', color: '#059669', borderColor: '#a7f3d0' }}
                    >
                      💬 WhatsApp
                    </a>

                    <button
                      className="btn btn-primary"
                      style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                      onClick={() => setSelectedStudentForPay(d)}
                    >
                      💳 Pay
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Record Payment Modal */}
      {selectedStudentForPay && (
        <RecordPaymentModal
          isOpen={true}
          student={selectedStudentForPay}
          onClose={() => setSelectedStudentForPay(null)}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      {/* Printable Receipt Modal */}
      {activeReceipt && (
        <ReceiptModal
          isOpen={true}
          receipt={activeReceipt}
          onClose={() => setActiveReceipt(null)}
        />
      )}

      {/* WhatsApp Defaulters Reminder Modal */}
      {showReminderModal && (
        <FeeReminderModal
          isOpen={true}
          defaulters={defaulters}
          onClose={() => setShowReminderModal(false)}
          onReminderSuccess={loadData}
        />
      )}
    </div>
  );
}
