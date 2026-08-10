import React, { useEffect, useLayoutEffect, useState } from 'react';
import {
  listTokens,
  createToken,
  revokeToken,
  StepUpRequiredError,
  type AccessTokenSummary,
  type CreatedAccessToken,
} from '../services/accessTokenApi';

interface AccessTokenManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** The ten scopes the backend recognizes -- see spec section 6.2. */
const SCOPES = [
  'todos:read', 'todos:create', 'todos:update', 'todos:delete',
  'areas:read', 'areas:create', 'areas:update', 'areas:delete',
  'export:read', 'import:write',
] as const;

/**
 * Copy shown when token creation is rejected for lacking a fresh Google
 * sign-in. Deliberately NOT the backend's message: requireFreshAuth's
 * message is written for passkey enrollment ("Enrolling a passkey requires
 * a fresh sign-in...") and is shared code that cannot be changed here, but
 * it would be wrong -- and confusing -- shown to someone creating a token.
 */
const STEP_UP_COPY =
  'Creating an access token requires a fresh Google sign-in. Sign in with Google again, then retry.';

/**
 * Management surface for access tokens: lists existing tokens, offers a
 * create form, and reveals a newly minted token's plaintext exactly once.
 *
 * Modal chrome (backdrop, header, X button) is copied from
 * PasskeyManagementModal verbatim -- no escape-key or backdrop-click
 * handling, matching that existing convention.
 */
const AccessTokenManagementModal: React.FC<AccessTokenManagementModalProps> = ({ isOpen, onClose }) => {
  const [tokens, setTokens] = useState<AccessTokenSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);
  const [revokingIds, setRevokingIds] = useState<Set<number>>(new Set());
  // The plaintext token lives here, and only here -- no localStorage, no
  // sessionStorage, no toast that outlives this component. `handleDone`
  // clears it, and so does every reopen (see the isOpen effect below).
  const [revealedToken, setRevealedToken] = useState<CreatedAccessToken | null>(null);

  const refresh = async () => {
    try {
      setTokens(await listTokens());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load access tokens');
    }
  };

  // Dashboard mounts this modal unconditionally and toggles `isOpen`, so the
  // component instance -- and all its state -- survives a close. Closing via
  // the X button only flips `isOpen`; it does not run `handleDone`. Without
  // resetting here, a token revealed via Create then dismissed with X (not
  // Done) would still be sitting in `revealedToken` and would reappear the
  // next time the modal opens. Resetting on open rather than only on close
  // covers every dismissal path, including ones nobody has added yet.
  //
  // This MUST be useLayoutEffect, not useEffect, for `revealedToken`
  // specifically. A plain (passive) effect runs after the browser paints, so
  // on the render that flips `isOpen` back to true, React would commit and
  // paint the reveal box with the *stale* plaintext still in state, then
  // clear it and re-render a frame later. For most state a one-frame flash
  // is invisible; for the one value in this entire system that is a live
  // credential, it is a real exposure (shoulder-surf, screen share). A
  // layout effect runs synchronously after DOM mutation but before paint, so
  // the clear lands in the same frame the reopen does and the stale value is
  // never drawn to the screen. Do not "simplify" this back to useEffect.
  useLayoutEffect(() => {
    if (isOpen) {
      setRevealedToken(null);
      setError(null);
      setName('');
      setSelectedScopes(new Set());
    }
  }, [isOpen]);

  // Kept as a separate, ordinary (passive) effect: refresh() is an async
  // network fetch and has no business blocking paint the way the state
  // resets above do.
  useEffect(() => {
    if (isOpen) {
      void refresh();
    }
  }, [isOpen]);

  const toggleScope = (scope: string) => {
    setSelectedScopes(prev => {
      const next = new Set(prev);
      if (next.has(scope)) {
        next.delete(scope);
      } else {
        next.add(scope);
      }
      return next;
    });
  };

  const handleCreate = async () => {
    setError(null);
    setIsCreating(true);
    try {
      const created = await createToken(name.trim(), Array.from(selectedScopes));
      setRevealedToken(created);
      setName('');
      setSelectedScopes(new Set());
      await refresh();
    } catch (err) {
      if (err instanceof StepUpRequiredError) {
        setError(STEP_UP_COPY);
      } else {
        setError(err instanceof Error ? err.message : 'Could not create access token');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async (id: number) => {
    setError(null);
    setRevokingIds(prev => new Set(prev).add(id));
    try {
      await revokeToken(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not revoke access token');
    } finally {
      setRevokingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleCopy = () => {
    if (!revealedToken) return;
    void navigator.clipboard?.writeText(revealedToken.token).catch(() => {
      // Clipboard access can be denied by the browser; the token stays
      // visible in the box either way, so there is nothing else to do here.
    });
  };

  const handleDone = () => {
    setRevealedToken(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Access Tokens</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-6 py-4">
          {revealedToken ? (
            <div className="space-y-3">
              <p className="font-mono text-xs break-all bg-gray-100 border border-gray-200 rounded-md p-3">
                {revealedToken.token}
              </p>
              <p className="text-sm text-red-600">
                This is the only time you will see this token. Copy it now and store it securely.
              </p>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="py-2 px-4 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Copy
                </button>
                <button
                  type="button"
                  onClick={handleDone}
                  className="py-2 px-4 rounded-md bg-indigo-600 text-white text-sm hover:bg-indigo-700"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900">Existing tokens</h3>

                {tokens.length === 0 && (
                  <p className="text-sm text-gray-600">No access tokens yet.</p>
                )}

                <ul className="space-y-3">
                  {tokens.map(t => (
                    <li key={t.id} className={`text-sm ${t.isRevoked ? 'line-through text-gray-400' : ''}`}>
                      <div className="flex items-center justify-between">
                        <span>{t.name}</span>
                        {!t.isRevoked && (
                          <button
                            type="button"
                            onClick={() => handleRevoke(t.id)}
                            disabled={revokingIds.has(t.id)}
                            className="text-red-600 hover:underline disabled:opacity-60 disabled:no-underline disabled:cursor-not-allowed"
                          >
                            {revokingIds.has(t.id) ? 'Revoking...' : 'Revoke'}
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {t.scopes.map(scope => (
                          <span
                            key={scope}
                            className="inline-block px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-700"
                          >
                            {scope}
                          </span>
                        ))}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Created {new Date(t.createdAt).toLocaleDateString()} — last used{' '}
                        {t.lastUsedAt ? new Date(t.lastUsedAt).toLocaleDateString() : 'never'}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="space-y-3 border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-gray-900">Create a new token</h3>

                <div>
                  <label htmlFor="access-token-name" className="block text-sm text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    id="access-token-name"
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>

                <fieldset className="space-y-1">
                  <legend className="text-sm text-gray-700 mb-1">Scopes</legend>
                  {SCOPES.map(scope => {
                    const [resource, action] = scope.split(':');
                    return (
                      <div key={scope} className="flex items-center space-x-2 text-sm">
                        <input
                          id={`scope-${scope}`}
                          type="checkbox"
                          aria-label={scope}
                          checked={selectedScopes.has(scope)}
                          onChange={() => toggleScope(scope)}
                        />
                        <span className="text-gray-700">
                          {resource} &middot; {action}
                        </span>
                      </div>
                    );
                  })}
                </fieldset>

                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={isCreating || name.trim().length === 0 || selectedScopes.size === 0}
                  className="py-2 px-4 rounded-md bg-indigo-600 text-white text-sm disabled:opacity-60"
                >
                  {isCreating ? 'Creating...' : 'Create token'}
                </button>
              </section>

              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccessTokenManagementModal;
