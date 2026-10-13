import React, { useEffect, useRef, useState } from 'react';
import {
  enrollPasskey,
  listPasskeys,
  deletePasskey,
  type PasskeySummary,
} from '../services/passkeyApi';
import { formatShortDate } from '../utils/date';
import { AlertCircleIcon, KeyIcon, PlusIcon, Spinner, TrashIcon } from './ui/Icons';
import { iconButton, primaryButton } from './ui/styles';

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
    <section aria-label="Passkeys">
      <div className="px-7 pt-2">
        {passkeys.length === 0 ? (
          <div className="flex items-center gap-3.5 py-4 border-b border-line text-sm text-ink-muted">
            <span aria-hidden="true" className="w-9 h-9 rounded-full bg-hover text-ink-faint flex items-center justify-center flex-none">
              <KeyIcon className="w-4 h-4" />
            </span>
            No passkeys yet.
          </div>
        ) : (
          <ul>
            {passkeys.map(p => {
              const label = p.nickname || p.credentialId.slice(0, 12);
              const isRemoving = removingIds.has(p.id);
              return (
                <li
                  key={p.id}
                  className={`flex items-center gap-3.5 py-3.5 border-b border-line transition-opacity ${isRemoving ? 'opacity-55' : ''}`}
                >
                  <span aria-hidden="true" className="w-9 h-9 rounded-full bg-hover text-ink-2 flex items-center justify-center flex-none">
                    <KeyIcon className="w-4 h-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-medium leading-[22px] text-ink truncate">{label}</div>
                    <div className="font-mono text-xs text-ink-faint">
                      added {formatShortDate(p.createdAt)} · {p.lastUsedAt ? `used ${formatShortDate(p.lastUsedAt)}` : 'never used'}
                    </div>
                  </div>
                  {isRemoving && <span className="flex-none text-[13px] text-ink-muted">Removing…</span>}
                  <button
                    type="button"
                    onClick={() => handleRemove(p.id, label)}
                    disabled={isRemoving}
                    aria-label={`Remove ${label}`}
                    title="Remove"
                    className={`${iconButton} flex-none hover:text-danger hover:bg-danger-soft disabled:hover:bg-transparent disabled:hover:text-ink-faint`}
                  >
                    {isRemoving ? <Spinner className="w-4 h-4" /> : <TrashIcon className="w-4 h-4" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {error && (
          <p role="alert" className="mt-3 flex items-start gap-2 text-[13px] text-danger">
            <AlertCircleIcon className="w-4 h-4 flex-none mt-0.5" />
            {error}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1.5 pl-7 pr-5 pt-5 pb-5">
        <span className="mr-auto font-mono text-xs text-ink-faint">
          {passkeys.length} {passkeys.length === 1 ? 'passkey' : 'passkeys'}
        </span>
        <button type="button" onClick={handleAdd} disabled={isBusy} className={`${primaryButton} pl-3.5`}>
          {isBusy ? <Spinner className="w-4 h-4" /> : <PlusIcon className="w-4 h-4" />}
          {isBusy ? 'Waiting for passkey…' : 'Add a passkey'}
        </button>
      </div>
    </section>
  );
};

export default PasskeyEnrollment;
