import React from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function LiveCounter({ presentCount, absentCount, unmarkedCount }) {
  const { t } = useLanguage();

  const total = presentCount + absentCount + unmarkedCount;
  const progressPercent = total > 0 ? Math.round(((presentCount + absentCount) / total) * 100) : 0;

  return (
    <div className="status-counter-card">
      {/* Subtle top progress bar */}
      <div className="counter-progress-track">
        <div
          className="counter-progress-fill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="counter-stats-row">
        <div className="counter-stat-item stat-present">
          <span className="stat-label">{t('present')}</span>
          <span className="stat-number">{presentCount}</span>
        </div>

        <div className="counter-divider" />

        <div className="counter-stat-item stat-absent">
          <span className="stat-label">{t('absent')}</span>
          <span className="stat-number">{absentCount}</span>
        </div>

        <div className="counter-divider" />

        <div className="counter-stat-item stat-unmarked">
          <span className="stat-label">{t('unmarked')}</span>
          <span className="stat-number">{unmarkedCount}</span>
        </div>
      </div>
    </div>
  );
}
