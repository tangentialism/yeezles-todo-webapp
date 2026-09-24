import React from 'react';
import type { AccessTokenSummary } from '../services/accessTokenApi';

interface ConnectedAppsSectionProps {
  /** Rows with source 'oauth' only; the modal does the split. */
  connections: AccessTokenSummary[];
  revokingIds: ReadonlySet<number>;
  onRevoke: (id: number) => void;
}

const formatDate = (iso: string) => new Date(iso).toLocaleDateString();

function expiryText(expiresAt: string | null): string {
  if (expiresAt === null) return 'no expiry';
  const expired = new Date(expiresAt).getTime() <= Date.now();
  return `${expired ? 'expired' : 'expires'} ${formatDate(expiresAt)}`;
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
  <section className="space-y-3" aria-labelledby="connected-apps-heading">
    <h3 id="connected-apps-heading" className="text-sm font-semibold text-gray-900">
      Connected apps
    </h3>

    {connections.length === 0 && (
      <p className="text-sm text-gray-600">No apps are connected.</p>
    )}

    <ul className="space-y-3">
      {connections.map(c => {
        const label = c.clientName ?? c.name;
        return (
          <li key={c.id} className={`text-sm ${c.isRevoked ? 'line-through text-gray-400' : ''}`}>
            <div className="flex items-center justify-between">
              <span>{label}</span>
              {!c.isRevoked && (
                <button
                  type="button"
                  onClick={() => onRevoke(c.id)}
                  disabled={revokingIds.has(c.id)}
                  aria-label={`Disconnect ${label}`}
                  className="text-red-600 hover:underline disabled:opacity-60 disabled:no-underline disabled:cursor-not-allowed"
                >
                  {revokingIds.has(c.id) ? 'Disconnecting...' : 'Disconnect'}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {c.scopes.map(scope => (
                <span
                  key={scope}
                  className="inline-block px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-700"
                >
                  {scope}
                </span>
              ))}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {`Created ${formatDate(c.createdAt)} — last used ${
                c.lastUsedAt ? formatDate(c.lastUsedAt) : 'never'
              } — ${expiryText(c.expiresAt)}`}
            </div>
          </li>
        );
      })}
    </ul>
  </section>
);

export default ConnectedAppsSection;
