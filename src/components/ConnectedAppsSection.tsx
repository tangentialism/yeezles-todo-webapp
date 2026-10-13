import React from 'react';
import type { AccessTokenSummary } from '../services/accessTokenApi';
import TokenRow from './TokenRow';
import { sectionCap } from './ui/styles';
import { formatShortDate } from '../utils/date';

interface ConnectedAppsSectionProps {
  /** Rows with source 'oauth' only; the modal does the split. */
  connections: AccessTokenSummary[];
  revokingIds: ReadonlySet<number>;
  onRevoke: (id: number) => void;
}

function expiryText(expiresAt: string | null): string {
  if (expiresAt === null) return 'no expiry';
  const expired = new Date(expiresAt).getTime() <= Date.now();
  return `${expired ? 'expired' : 'expires'} ${formatShortDate(expiresAt)}`;
}

/**
 * OAuth connections (spec §4, §7): one row per consent, e.g. Claude. The
 * row's `expiresAt` is the 90-day hard limit. Disconnect uses the same
 * DELETE /auth/tokens/:id as a PAT revoke, which ends every token under it.
 */
const ConnectedAppsSection: React.FC<ConnectedAppsSectionProps> = ({
  connections,
  revokingIds,
  onRevoke,
}) => (
  <section aria-labelledby="connected-apps-heading">
    <h3 id="connected-apps-heading" className={`${sectionCap} flex items-baseline gap-2.5 mb-0.5`}>
      Connected apps <span className="font-normal tracking-normal text-ink-faint">{connections.length}</span>
    </h3>

    {connections.length === 0 && (
      <p className="py-3.5 border-b border-line text-sm text-ink-muted">No apps are connected.</p>
    )}

    <ul>
      {connections.map(c => {
        const label = c.clientName ?? c.name;
        return (
          <TokenRow
            key={c.id}
            icon={label.trim().charAt(0).toUpperCase()}
            strongIcon
            label={label}
            meta={`since ${formatShortDate(c.createdAt)} · ${
              c.lastUsedAt ? `used ${formatShortDate(c.lastUsedAt)}` : 'never used'
            } · ${expiryText(c.expiresAt)}`}
            scopes={c.scopes}
            isRevoked={c.isRevoked}
            isBusy={revokingIds.has(c.id)}
            actionLabel="Disconnect"
            busyLabel="Disconnecting…"
            actionAriaLabel={`Disconnect ${label}`}
            onAction={() => onRevoke(c.id)}
          />
        );
      })}
    </ul>
  </section>
);

export default ConnectedAppsSection;
