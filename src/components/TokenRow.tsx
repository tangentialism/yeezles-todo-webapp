import React from 'react';
import { dangerTextButton } from './ui/styles';

/** Props for {@link TokenRow}. */
interface TokenRowProps {
  /** Round mark on the left: an icon, or the app's initial. */
  icon: React.ReactNode;
  /** Ink-filled mark (connected apps) instead of the quiet grey one (tokens). */
  strongIcon?: boolean;
  label: string;
  /** Mono line of dates, e.g. "created Aug 4 · used Oct 12". */
  meta: string;
  scopes: string[];
  isRevoked: boolean;
  isBusy: boolean;
  actionLabel: string;
  busyLabel: string;
  /** Accessible name for the action, when the visible label alone is ambiguous. */
  actionAriaLabel?: string;
  onAction: () => void;
}

/**
 * One access token or connected app: mark, name, a mono line of dates, its
 * scopes as small mono chips, and a quiet destructive action. Revoked rows
 * are struck through and faded, with no action.
 */
const TokenRow: React.FC<TokenRowProps> = ({
  icon,
  strongIcon = false,
  label,
  meta,
  scopes,
  isRevoked,
  isBusy,
  actionLabel,
  busyLabel,
  actionAriaLabel,
  onAction,
}) => (
  <li className={`flex items-start gap-3.5 py-3.5 border-b border-line ${isRevoked ? 'opacity-60' : ''}`}>
    <span
      aria-hidden="true"
      className={`w-9 h-9 rounded-full flex items-center justify-center flex-none text-sm font-semibold ${
        strongIcon && !isRevoked ? 'bg-ink text-paper' : 'bg-hover text-ink-2'
      }`}
    >
      {icon}
    </span>
    <div className="flex-1 min-w-0">
      <div className="flex items-start gap-2">
        <div
          className={`flex-1 min-w-0 pt-px text-[15px] leading-[22px] truncate ${
            isRevoked ? 'text-ink-faint line-through decoration-line-strong' : 'font-medium text-ink'
          }`}
        >
          {label}
        </div>
        {isRevoked ? (
          <span className="flex-none pt-1 font-mono text-[11.5px] text-ink-faint">revoked</span>
        ) : (
          <button
            type="button"
            onClick={onAction}
            disabled={isBusy}
            aria-label={actionAriaLabel}
            className={`${dangerTextButton} flex-none -mt-1 -mr-2`}
          >
            {isBusy ? busyLabel : actionLabel}
          </button>
        )}
      </div>
      <div className="mt-0.5 font-mono text-xs text-ink-faint">{meta}</div>
      {scopes.length > 0 && !isRevoked && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {scopes.map(scope => (
            <span key={scope} className="px-[7px] py-0.5 rounded-md bg-hover font-mono text-[11.5px] text-ink-2">
              {scope}
            </span>
          ))}
        </div>
      )}
    </div>
  </li>
);

export default TokenRow;
