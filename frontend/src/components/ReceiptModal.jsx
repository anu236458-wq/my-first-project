import React from 'react';

export default function ReceiptModal({ isOpen, onClose, receipt }) {
  if (!isOpen || !receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const cleanPhone = (receipt.parentPhone || '').replace(/[^\d]/g, '');
  const waText = `Dear ${receipt.parentName || 'Parent'}, payment of Rs. ${Number(receipt.amount).toLocaleString('en-IN')} has been successfully received for ${receipt.studentName} (${receipt.batchName}). Receipt No: ${receipt.receiptNumber}. Remaining Balance: Rs. ${Number(receipt.balanceRemaining).toLocaleString('en-IN')}. Thank you! - Apex Coaching Institute`;
  const waShareUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waText)}`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.25rem' }}>🧾</span>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Official Fee Payment Receipt</h3>
          </div>
          <button className="btn btn-outline" style={{ padding: '4px 10px' }} onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Printable Receipt Paper Container */}
        <div className="modal-body" id="printableReceiptArea">
          <div style={{ background: '#ffffff', border: '2px solid #e2e8f0', borderRadius: 'var(--radius-lg)', padding: '20px', position: 'relative' }}>
            
            {/* Institute Header */}
            <div style={{ textAlign: 'center', borderBottom: '2px dashed #cbd5e1', paddingBottom: '14px', marginBottom: '16px' }}>
              <div style={{ fontSize: '1.8rem', marginBottom: '2px' }}>🎓</div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--primary)', letterSpacing: '-0.3px' }}>
                Apex Coaching Institute
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Government Approved Coaching Center • Contact: +91 98765 43210
              </p>
              <div style={{ display: 'inline-block', marginTop: '6px', background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '2px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800 }}>
                FEE PAYMENT ACKNOWLEDGMENT
              </div>
            </div>

            {/* Receipt Meta */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '14px', color: '#475569' }}>
              <div>
                Receipt No: <strong style={{ color: '#0f172a' }}>{receipt.receiptNumber}</strong>
              </div>
              <div>
                Date: <strong style={{ color: '#0f172a' }}>{receipt.paymentDate}</strong>
              </div>
            </div>

            {/* Student & Parent Info Box */}
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0', marginBottom: '16px', fontSize: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Student Name:</span>
                  <div style={{ fontWeight: 800, color: '#0f172a' }}>{receipt.studentName}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Roll Number:</span>
                  <div style={{ fontWeight: 800, color: '#0f172a' }}>Roll {receipt.rollNo}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Batch / Course:</span>
                  <div style={{ fontWeight: 700 }}>{receipt.batchName}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Parent / Phone:</span>
                  <div style={{ fontWeight: 600 }}>{receipt.parentName} ({receipt.parentPhone})</div>
                </div>
              </div>
            </div>

            {/* Financial Breakdown Table */}
            <div className="table-responsive" style={{ marginBottom: '16px' }}>
              <table>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Total Course Fee</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{Number(receipt.totalFee).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td>Amount Paid Earlier</td>
                    <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
                      ₹{Number(receipt.totalPaid ? receipt.totalPaid - receipt.amount : 0).toLocaleString('en-IN')}
                    </td>
                  </tr>
                  <tr style={{ background: '#f0fdf4', fontWeight: 800, color: '#166534' }}>
                    <td>Payment Received ({receipt.paymentMode})</td>
                    <td style={{ textAlign: 'right', fontSize: '1.05rem' }}>
                      ₹{Number(receipt.amount).toLocaleString('en-IN')}
                    </td>
                  </tr>
                  <tr style={{ fontWeight: 800 }}>
                    <td>Remaining Balance Due</td>
                    <td style={{ textAlign: 'right', color: receipt.balanceRemaining > 0 ? '#dc2626' : '#16a34a' }}>
                      ₹{Number(receipt.balanceRemaining).toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Note & Authorization */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', maxWidth: '240px' }}>
                * This is a computer generated receipt. Thank you for your payment.
                {receipt.notes && <div>Ref: {receipt.notes}</div>}
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontStyle: 'italic', fontSize: '0.8rem' }}>
                  [Authorized Seal]
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', borderTop: '1px solid #cbd5e1', paddingTop: '2px' }}>
                  Apex Accounts Office
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Modal Actions */}
        <div className="modal-footer" style={{ gap: '8px' }}>
          <button
            type="button"
            className="btn btn-outline"
            style={{ flex: 1 }}
            onClick={handlePrint}
          >
            🖨️ Print Receipt / PDF
          </button>

          <a
            href={waShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-whatsapp"
            style={{ flex: 1, textDecoration: 'none' }}
          >
            📲 Share Receipt on WhatsApp
          </a>

          <button type="button" className="btn btn-outline" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
