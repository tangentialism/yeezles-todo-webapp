import React, { useEffect, useState } from 'react';
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

  const handleRemove = async (id: number) => {
    setError(null);
    try {
      await deletePasskey(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove passkey');
    }
  };

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Passkeys</h2>

      {passkeys.length === 0 && (
        <p className="text-sm text-gray-600">No passkeys enrolled yet.</p>
      )}

      <ul className="space-y-2">
        {passkeys.map(p => (
          <li key={p.id} className="flex items-center justify-between text-sm">
            <span>
              {p.nickname || p.credentialId.slice(0, 12)}
              {p.lastUsedAt && (
                <span className="text-gray-500">
                  {' '}— last used {new Date(p.lastUsedAt).toLocaleDateString()}
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={() => handleRemove(p.id)}
              className="text-red-600 hover:underline"
            >
              Remove
            </button>
          </li>
        ))}
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
