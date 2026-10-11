import React from 'react';
import { Link } from 'react-router-dom';

interface SummaryMetricProps {
  title: string;
  value: number | string | null;
  actionText: string;
  to: string;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

export const SummaryMetric: React.FC<SummaryMetricProps> = ({
  title,
  value,
  actionText,
  to,
  isLoading,
  isError,
  onRetry,
}) => {
  return (
    <Link to={to} className="management-metric-card">
      <div className="management-metric-title">{title}</div>
      {isLoading ? (
        <div style={{ height: '32px', display: 'flex', alignItems: 'center' }}>
          <span style={{ display: 'inline-block', width: '48px', height: '24px', background: 'var(--color-border)', borderRadius: '4px' }} />
        </div>
      ) : isError ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', color: 'var(--color-error-text)', fontWeight: 600 }}>Không thể tải</span>
          {onRetry && (
            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: '11px', padding: '2px 8px', minHeight: 'auto' }}
              onClick={(e) => {
                e.preventDefault();
                onRetry();
              }}
            >
              Thử lại
            </button>
          )}
        </div>
      ) : (
        <div className="management-metric-value">{value ?? 0}</div>
      )}
      <div className="management-metric-action">
        <span>{actionText}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </Link>
  );
};
