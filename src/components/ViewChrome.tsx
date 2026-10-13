import React from 'react';
import { RefreshIcon, Spinner } from './ui/Icons';
import { iconButton, primaryButton } from './ui/styles';

/** One figure in a view's totals line. */
export interface ViewTotal {
  value: number | string;
  label: string;
  tone?: 'danger' | 'accent';
}

/** Props for {@link ViewHeader}. */
interface ViewHeaderProps {
  title: React.ReactNode;
  /** Area colour shown as a dot before the title. */
  dotColor?: string;
  totals: ViewTotal[];
  onRefresh?: () => void;
  isRefreshing?: boolean;
  refreshLabel?: string;
  /** Draw the ink rule under the header (off when a progress bar follows). */
  ruled?: boolean;
}

const TONE: Record<NonNullable<ViewTotal['tone']>, string> = {
  danger: 'text-danger',
  accent: 'text-accent',
};

/**
 * Page header shared by the All, Today and Done views: serif title on the
 * left, a compact line of totals (small mono figures) on the right.
 */
export const ViewHeader: React.FC<ViewHeaderProps> = ({
  title,
  dotColor,
  totals,
  onRefresh,
  isRefreshing = false,
  refreshLabel = 'Refresh',
  ruled = true,
}) => (
  <div
    className={`flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2.5 pb-3 ${
      ruled ? 'border-b-[1.5px] border-ink' : ''
    }`}
  >
    <h1 className="flex items-center gap-3.5 font-serif font-medium text-[30px] sm:text-4xl leading-[1.1] tracking-[-0.015em] text-ink">
      {dotColor && <span className="w-2.5 h-2.5 rounded-full flex-none" style={{ backgroundColor: dotColor }} />}
      {title}
    </h1>
    <div className="flex items-center gap-3">
      <div role="group" aria-label="Totals" className="flex flex-wrap items-baseline gap-x-[18px] gap-y-1 text-[13px] text-ink-muted">
        {totals.map((total) => (
          <span key={total.label}>
            <span className={`font-mono font-medium text-[13px] ${total.tone ? TONE[total.tone] : 'text-ink'}`}>
              {total.value}
            </span>{' '}
            {total.label}
          </span>
        ))}
      </div>
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-label={refreshLabel}
          title={refreshLabel}
          className={`${iconButton} -my-2 w-9 h-9`}
        >
          <RefreshIcon className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      )}
    </div>
  </div>
);

/** Centered spinner with a label, for a view's first load. */
export const ViewLoading: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex items-center justify-center gap-2.5 py-16 text-sm text-ink-muted">
    <Spinner className="w-5 h-5 text-ink-faint" />
    <span>{label}</span>
  </div>
);

/** Error message with an optional retry button. */
export const ViewError: React.FC<{ title: string; message?: string; onRetry?: () => void }> = ({
  title,
  message,
  onRetry,
}) => (
  <div className="py-16 text-center">
    <p className="font-serif font-medium text-2xl text-ink">{title}</p>
    {message && <p className="mt-1 text-sm text-ink-muted">{message}</p>}
    {onRetry && (
      <button type="button" onClick={onRetry} className={`${primaryButton} mt-5`}>
        Try Again
      </button>
    )}
  </div>
);

/** Quiet empty state under a view header. */
export const ViewEmpty: React.FC<{ title: string; message?: string }> = ({ title, message }) => (
  <div className="py-14 text-center border-b border-line">
    <p className="font-serif font-medium text-2xl text-ink">{title}</p>
    {message && <p className="mt-1 text-sm text-ink-muted">{message}</p>}
  </div>
);
