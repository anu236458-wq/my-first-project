import React from 'react';

export default function StatCard({ label, value, subtext, color = 'var(--text-main)' }) {
  return (
    <div className="stat-card">
      <div className="stat-card-value" style={{ color }}>
        {value}
      </div>
      <div className="stat-card-label">{label}</div>
      {subtext && (
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
          {subtext}
        </div>
      )}
    </div>
  );
}
