import React, { useEffect, useLayoutEffect, useState } from 'react';
import {
  listTokens,
  createToken,
  revokeToken,
  StepUpRequiredError,
  type AccessTokenSummary,
  type CreatedAccessToken,
} from '../services/accessTokenApi';
import ConnectedAppsSection from './ConnectedAppsSection';
import TokenRow from './TokenRow';
import Dialog from './ui/Dialog';
import { AlertCircleIcon, CheckIcon, CopyIcon, EyeIcon, ShieldIcon, Spinner } from './ui/Icons';
import { fieldInput, fieldLabel, outlineButton, primaryButton, sectionCap } from './ui/styles';
import { formatShortDate } from '../utils/date';

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

/** The scopes grouped by resource for the create form: [resource, scopes][]. */
const SCOPE_GROUPS: [string, string[]][] = Array.from(
  SCOPES.reduce((groups, scope) => {
    const resource = scope.split(':')[0];
    groups.set(resource, [...(groups.get(resource) ?? []), scope]);
    return groups;
  }, new Map<string, string[]>())
);

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
 * Rendered in the shared Dialog shell. Closing it by any route (X,
 * Escape, scrim) only flips `isOpen`; the reveal is cleared on reopen below.
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

  // `!== 'oauth'`, not `=== 'pat'`: a row from a backend that predates the
  // source field must stay visible as a token, not vanish from both lists.
  const connections = tokens.filter(t => t.source === 'oauth');
  const pats = tokens.filter(t => t.source !== 'oauth');

  return (
    <Dialog title="Access tokens & apps" onClose={onClose}>
      {revealedToken ? (
        <div>
          <div className="px-7 pt-4">
            <p className="flex items-center gap-2.5 text-sm">
              <span aria-hidden="true" className="w-[22px] h-[22px] rounded-full bg-accent text-white inline-flex items-center justify-center flex-none">
                <CheckIcon className="w-3 h-3" />
              </span>
              <span className="font-medium text-ink truncate">{revealedToken.name}</span>
              <span className="font-mono text-xs text-ink-faint flex-none">
                {revealedToken.scopes.length} {revealedToken.scopes.length === 1 ? 'scope' : 'scopes'}
              </span>
            </p>
            <div className="mt-4 rounded-xl border border-line-strong bg-paper">
              <p className="px-4 py-3.5 font-mono text-[13px] leading-[21px] break-all text-ink select-all">
                {revealedToken.token}
              </p>
              <div className="flex items-center gap-2.5 pl-4 pr-3 py-2.5 border-t border-line">
                <EyeIcon className="w-4 h-4 flex-none text-danger" />
                <span className="flex-1 text-[13px] text-danger">Shown once. Copy it now and store it securely.</span>
                <button type="button" onClick={handleCopy} className={`${outlineButton} h-9 px-3.5 flex-none`}>
                  <CopyIcon className="w-[15px] h-[15px]" />
                  Copy
                </button>
              </div>
            </div>
          </div>
          <div className="flex justify-end p-5">
            <button type="button" onClick={handleDone} className={primaryButton}>
              Done
            </button>
          </div>
        </div>
      ) : (
        <div className="px-7 pt-4 pb-6 flex flex-col gap-7">
          <ConnectedAppsSection
            connections={connections}
            revokingIds={revokingIds}
            onRevoke={id => void handleRevoke(id)}
          />

          <section aria-labelledby="existing-tokens-heading">
            <h3 id="existing-tokens-heading" className={`${sectionCap} flex items-baseline gap-2.5 mb-0.5`}>
              Tokens <span className="font-normal tracking-normal text-ink-faint">{pats.length}</span>
            </h3>

            {pats.length === 0 && (
              <p className="py-3.5 border-b border-line text-sm text-ink-muted">No tokens yet.</p>
            )}

            <ul>
              {pats.map(t => (
                <TokenRow
                  key={t.id}
                  icon={<ShieldIcon className="w-4 h-4" />}
                  label={t.name}
                  meta={`created ${formatShortDate(t.createdAt)} · ${t.lastUsedAt ? `used ${formatShortDate(t.lastUsedAt)}` : 'never used'}`}
                  scopes={t.scopes}
                  isRevoked={t.isRevoked}
                  isBusy={revokingIds.has(t.id)}
                  actionLabel="Revoke"
                  busyLabel="Revoking…"
                  onAction={() => handleRevoke(t.id)}
                />
              ))}
            </ul>
          </section>

          <section aria-labelledby="new-token-heading" className="flex flex-col gap-4">
            <h3 id="new-token-heading" className={sectionCap}>
              New token
            </h3>

            <div>
              <label htmlFor="access-token-name" className={fieldLabel}>
                Name
              </label>
              <input
                id="access-token-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Shortcuts on iPhone"
                className={fieldInput}
              />
            </div>

            <fieldset>
              <legend className={fieldLabel}>Scopes</legend>
              <div className="grid grid-cols-[64px_1fr] sm:grid-cols-[72px_1fr] gap-y-2 items-center">
                {SCOPE_GROUPS.map(([resource, scopes]) => (
                  <React.Fragment key={resource}>
                    <span className="font-mono text-[12.5px] text-ink-2">{resource}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {scopes.map(scope => {
                        const checked = selectedScopes.has(scope);
                        return (
                          <label key={scope} className="relative cursor-pointer">
                            <input
                              id={`scope-${scope}`}
                              type="checkbox"
                              aria-label={scope}
                              checked={checked}
                              onChange={() => toggleScope(scope)}
                              className="peer absolute inset-0 m-0 opacity-0 cursor-pointer"
                            />
                            <span
                              aria-hidden="true"
                              className={`inline-flex items-center h-8 px-3 rounded-full border text-[13px] transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 ${
                                checked
                                  ? 'border-ink bg-ink text-paper'
                                  : 'border-line-strong bg-surface text-ink-2 hover:border-ink-faint'
                              }`}
                            >
                              {scope.split(':')[1]}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </fieldset>

            {error && (
              <p role="alert" className="flex items-start gap-2 text-[13px] text-danger">
                <AlertCircleIcon className="w-4 h-4 flex-none mt-0.5" />
                {error}
              </p>
            )}

            <div className="flex items-center justify-end gap-3">
              <span className="mr-auto font-mono text-xs text-ink-faint">
                {selectedScopes.size} {selectedScopes.size === 1 ? 'scope' : 'scopes'}
              </span>
              <button
                type="button"
                onClick={handleCreate}
                disabled={isCreating || name.trim().length === 0 || selectedScopes.size === 0}
                className={primaryButton}
              >
                {isCreating && <Spinner className="w-4 h-4" />}
                {isCreating ? 'Creating…' : 'Create token'}
              </button>
            </div>
          </section>
        </div>
      )}
    </Dialog>
  );
};

export default AccessTokenManagementModal;
