import React, { useEffect, useRef, useState } from 'react';
import {
  enrollPasskey,
  listPasskeys,
  deletePasskey,
  type PasskeySummary,
} from '../services/passkeyApi';

/**
 * Enroll and manage passkeys for the signed-in user. Multiple credentials
 * are supported — enrolling a second one is just clicking Add again.
 */
const PasskeyEnrollment: React.FC = () => {
  const [passkeys, setPasskeys] = useState<PasskeySummary[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Tracks which passkey ids are mid-deletion, keyed per row so removing one
  // credential doesn't disable the rest of the list. Mirrored into a ref so
  // the guard in handleRemove is synchronous: two rapid clicks on the same
  // row (e.g. a double-click, or Enter held down) can both fire before React
  // re-renders with the disabled button, and state alone would let both
  // reads see the pre-update value.
  const [removingIds, setRemovingIds] = useState<Set<number>>(new Set());
  const removingIdsRef = useRef<Set<number>>(new Set());

  const refresh = async () => {
    try {
      setPasskeys(await listPasskeys());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load passkeys');
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const handleAdd = async () => {
    setIsBusy(true);
    setError(null);
    try {
      const nickname = window.prompt('Name this passkey', 'This device') || undefined;
      await enrollPasskey(nickname);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enrollment failed');
    } finally {
      setIsBusy(false);
    }
  };

  const handleRemove = async (id: number, label: string) => {
    if (removingIdsRef.current.has(id)) return;

    if (
      !window.confirm(`Are you sure you want to remove "${label}"? This action cannot be undone.`)
    ) {
      return;
    }

    setError(null);
    removingIdsRef.current.add(id);
    setRemovingIds(new Set(removingIdsRef.current));
    try {
      await deletePasskey(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove passkey');
    } finally {
      removingIdsRef.current.delete(id);
      setRemovingIds(new Set(removingIdsRef.current));
    }
  };

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Passkeys</h2>

      {passkeys.length === 0 && (
        <p className="text-sm text-gray-600">No passkeys enrolled yet.</p>
      )}

      <ul className="space-y-2">
        {passkeys.map(p => {
          const label = p.nickname || p.credentialId.slice(0, 12);
          const isRemoving = removingIds.has(p.id);
          return (
            <li key={p.id} className="flex items-center justify-between text-sm">
              <span>
                {label}
                {p.lastUsedAt && (
                  <span className="text-gray-500">
                    {' '}— last used {new Date(p.lastUsedAt).toLocaleDateString()}
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => handleRemove(p.id, label)}
                disabled={isRemoving}
                className="text-red-600 hover:underline disabled:opacity-60 disabled:no-underline disabled:cursor-not-allowed"
              >
                {isRemoving ? 'Removing...' : 'Remove'}
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={handleAdd}
        disabled={isBusy}
        className="py-2 px-4 rounded-md bg-indigo-600 text-white disabled:opacity-60"
      >
        {isBusy ? 'Waiting for passkey...' : 'Add a passkey'}
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  );
};

export default PasskeyEnrollment;
