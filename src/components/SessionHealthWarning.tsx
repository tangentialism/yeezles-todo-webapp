import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { SESSION_EXPIRY_URGENT_DAYS } from '../constants';

/** Length of a persistent ("Stay signed in") session, for the countdown ring. */
const SESSION_LENGTH_DAYS = 90;
const RING_RADIUS = 15;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/**
 * Small floating notice (bottom-left; above the tab bar on phones) when the
 * persistent session is close to expiring. Only renders for authenticated
 * persistent-session users when `sessionHealth.needsRefreshWarning` is true.
 * A ring shows how much of the 90-day session is left, with the days in the
 * middle; it turns danger red at {@link SESSION_EXPIRY_URGENT_DAYS} or fewer.
 */
const SessionHealthWarning: React.FC = () => {
  const { sessionHealth, authMethod, isAuthenticated } = useAuth();

  // Only show for authenticated persistent sessions that need refresh warning
  if (!isAuthenticated ||
      authMethod !== 'persistent-session' ||
      !sessionHealth.needsRefreshWarning ||
      sessionHealth.daysUntilExpiry === null) {
    return null;
  }

  const daysLeft = sessionHealth.daysUntilExpiry;
  const isUrgent = daysLeft <= SESSION_EXPIRY_URGENT_DAYS;
  const fraction = Math.min(Math.max(daysLeft / SESSION_LENGTH_DAYS, 0), 1);

  return (
    <div
      role="status"
      className={`fixed left-4 sm:left-6 z-30 w-[calc(100%-2rem)] max-w-[320px] flex gap-3 px-4 py-3.5 rounded-[14px] bg-surface shadow-menu bottom-[calc(84px+env(safe-area-inset-bottom))] sm:bottom-6 ${
        isUrgent ? 'ring-1 ring-danger/35' : 'ring-1 ring-ink/5'
      }`}
    >
      <span className="relative w-9 h-9 flex-none" aria-hidden="true">
        <svg width="36" height="36" viewBox="0 0 36 36">
          <circle
            cx="18"
            cy="18"
            r={RING_RADIUS}
            fill="none"
            strokeWidth="3"
            className={isUrgent ? 'stroke-danger-soft' : 'stroke-line'}
          />
          <circle
            cx="18"
            cy="18"
            r={RING_RADIUS}
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={RING_LENGTH}
            strokeDashoffset={RING_LENGTH * (1 - fraction)}
            transform="rotate(-90 18 18)"
            className={isUrgent ? 'stroke-danger' : 'stroke-accent'}
          />
        </svg>
        <span
          className={`absolute inset-0 flex items-center justify-center font-mono text-xs font-medium ${
            isUrgent ? 'text-danger' : 'text-ink'
          }`}
        >
          {daysLeft}
        </span>
      </span>
      <div className="min-w-0">
        <p className={`text-sm font-medium leading-5 ${isUrgent ? 'text-danger' : 'text-ink'}`}>
          Session ends in <span className="font-mono">{daysLeft}</span> {daysLeft === 1 ? 'day' : 'days'}
        </p>
        <p className="mt-0.5 text-[13px] leading-[19px] text-ink-muted">
          {isUrgent ? 'Sign in again soon.' : 'Sign in again to refresh it.'}
        </p>
      </div>
    </div>
  );
};

export default SessionHealthWarning;
