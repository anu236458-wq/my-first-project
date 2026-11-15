import React from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function WhatsAppStatusBadge({ status, errorReason, directLink, onRetry, isRetrying }) {
  const { t } = useLanguage();

  if (status === 'Sent' || status === 'Delivered') {
    return (
      <span className="badge badge-success" title="WhatsApp alert delivered to parent">
        ✓ {status === 'Delivered' ? 'Delivered' : 'Sent'}
      </span>
    );
  }

  if (status === 'Failed') {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span className="badge badge-danger" title={errorReason || 'Sending failed'}>
          ⚠ Failed
        </span>

        {onRetry && (
          <button
            className="btn btn-outline"
            style={{ padding: '2px 8px', fontSize: '0.75rem' }}
            onClick={onRetry}
            disabled={isRetrying}
          >
            {isRetrying ? '...' : `🔄 ${t('retryFailed')}`}
          </button>
        )}

        {directLink && (
          <a
            href={directLink}
            target="_blank"
            rel="noopener noreferrer"
            className="wa-fallback-link"
            title="Open WhatsApp chat directly on this phone/browser"
          >
            💬 {t('waDirectLink')}
          </a>
        )}
      </div>
    );
  }

  return (
    <span className="badge badge-neutral">
      ⏳ Not Sent
    </span>
  );
}
