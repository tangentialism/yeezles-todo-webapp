import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PasskeyLoginButton from './PasskeyLoginButton';
import {
  getConsentRequest,
  approveConsent,
  denyConsent,
  OAuthConsentError,
  type ConsentRequestDetails,
  type OAuthConsentErrorCode,
} from '../services/oauthConsentApi';

/** How a failure is shown. `retry: false` ends the page: no buttons remain. */
interface ErrorPresentation {
  message: string;
  retry: boolean;
}

const ERROR_COPY: Record<OAuthConsentErrorCode, ErrorPresentation> = {
  REQUEST_NOT_FOUND: {
    message: 'This request expired or was already used. Start again from Claude.',
    retry: false,
  },
  UNAUTHENTICATED: {
    message: 'Your session has ended. Sign in with a passkey to continue.',
    retry: false,
  },
  ORIGIN_MISMATCH: {
    message:
      'The server did not accept this page as coming from Yeezles Todo, so it cannot approve requests. Start again from Claude.',
    retry: false,
  },
  UNEXPECTED_REDIRECT: {
    message:
      'The server returned an unexpected destination, so this page did not follow it. Start again from Claude.',
    retry: false,
  },
  PASSKEY_INVALID: {
    message: 'That passkey could not be verified. Try again.',
    retry: true,
  },
  PASSKEY_CANCELLED: {
    message: 'The passkey check was cancelled or did not finish. Try again.',
    retry: true,
  },
  INVALID_SCOPES: {
    message: 'Choose at least one permission, then approve again.',
    retry: true,
  },
  RATE_LIMITED: {
    message: 'Too many attempts. Wait a minute, then try again.',
    retry: true,
  },
  NETWORK: {
    message: 'Could not reach the server. Check your connection and try again.',
    retry: true,
  },
  UNKNOWN: {
    message: 'Something went wrong. Try again.',
    retry: true,
  },
};

const toCode = (err: unknown): OAuthConsentErrorCode =>
  err instanceof OAuthConsentError ? err.code : 'UNKNOWN';

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
    <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full mx-4 space-y-4">
      {children}
    </div>
  </div>
);

/**
 * `/oauth/consent?request=<id>` -- spec §6.2.
 *
 * Rendered only when signed in (App.tsx shows LoginButton at this same URL
 * otherwise, so the request id survives sign-in). Approve needs a fresh
 * passkey assertion; Deny does not. The backend's redirectTo is never put in
 * state or rendered -- it is checked and handed straight to
 * window.location.assign.
 */
const OAuthConsentPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const requestId = (searchParams.get('request') ?? '').trim();

  const [details, setDetails] = useState<ConsentRequestDetails | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [phase, setPhase] = useState<'idle' | 'approving' | 'denying' | 'leaving'>('idle');
  const [errorCode, setErrorCode] = useState<OAuthConsentErrorCode | null>(null);

  // Only the newest GET may write state. StrictMode runs the mount effect
  // twice, and a retry refetch can overlap a slow earlier one; each GET may
  // carry a different challenge, and only the newest is live.
  const loadSeq = useRef(0);

  const invalidateLoads = useCallback(() => {
    loadSeq.current += 1;
  }, []);

  const fetchDetails = useCallback(
    async (keepSelection: boolean): Promise<void> => {
      const seq = ++loadSeq.current;
      try {
        const fresh = await getConsentRequest(requestId);
        if (seq !== loadSeq.current) return;
        setDetails(fresh);
        setSelected(prev =>
          keepSelection
            ? new Set(fresh.requestedScopes.filter(s => prev.has(s)))
            : new Set(fresh.requestedScopes)
        );
      } catch (err) {
        if (seq !== loadSeq.current) return;
        setErrorCode(toCode(err));
      }
    },
    [requestId]
  );

  useEffect(() => {
    if (!requestId) return;
    void fetchDetails(false);
    return invalidateLoads;
  }, [requestId, fetchDetails, invalidateLoads]);

  const toggle = (scope: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(scope)) {
        next.delete(scope);
      } else {
        next.add(scope);
      }
      return next;
    });
  };

  const handleApprove = async () => {
    if (!details || phase !== 'idle' || selected.size === 0) return;
    setErrorCode(null);
    setPhase('approving');
    try {
      const scopes = details.requestedScopes.filter(s => selected.has(s));
      const redirectTo = await approveConsent(details, scopes);
      setPhase('leaving');
      window.location.assign(redirectTo);
    } catch (err) {
      const code = toCode(err);
      setErrorCode(code);
      if (ERROR_COPY[code].retry) {
        // The failed attempt may have spent the request-bound challenge.
        // Fetch fresh options, keeping the user's ticks, before re-enabling.
        await fetchDetails(true);
      }
      setPhase('idle');
    }
  };

  const handleDeny = async () => {
    if (!details || phase !== 'idle') return;
    setErrorCode(null);
    setPhase('denying');
    try {
      const redirectTo = await denyConsent(details);
      setPhase('leaving');
      window.location.assign(redirectTo);
    } catch (err) {
      setErrorCode(toCode(err));
      setPhase('idle');
    }
  };

  const handleRetryLoad = () => {
    setErrorCode(null);
    void fetchDetails(false);
  };

  if (!requestId) {
    return (
      <Shell>
        <p role="alert" className="text-sm text-red-600">
          This link is missing its request. Start again from Claude.
        </p>
      </Shell>
    );
  }

  if (errorCode && !ERROR_COPY[errorCode].retry) {
    return (
      <Shell>
        <p role="alert" className="text-sm text-red-600">
          {ERROR_COPY[errorCode].message}
        </p>
        {errorCode === 'UNAUTHENTICATED' && (
          <PasskeyLoginButton onSuccess={() => window.location.reload()} />
        )}
      </Shell>
    );
  }

  if (!details) {
    return (
      <Shell>
        {errorCode ? (
          <>
            <p role="alert" className="text-sm text-red-600">
              {ERROR_COPY[errorCode].message}
            </p>
            <button
              type="button"
              onClick={handleRetryLoad}
              className="py-2 px-4 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
            >
              Try again
            </button>
          </>
        ) : (
          <div className="flex items-center space-x-3 text-gray-600">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
            <span>Loading request...</span>
          </div>
        )}
      </Shell>
    );
  }

  const busy = phase !== 'idle';
  const hasPasskey = (details.passkeyOptions.allowCredentials?.length ?? 0) > 0;

  return (
    <Shell>
      <h1 className="text-xl font-semibold text-gray-900">
        {details.clientName} wants to access your Yeezles Todo account
      </h1>
      <p className="text-sm text-gray-600">
        Will redirect to <span className="font-mono text-gray-900">{details.redirectHost}</span>
      </p>

      {details.isLoopback && (
        <div
          role="note"
          aria-label="Loopback warning"
          className="text-sm text-amber-800 bg-amber-50 border border-amber-300 rounded-md p-3"
        >
          <p className="font-semibold">This app runs on your own computer.</p>
          <p className="mt-1">
            {details.redirectHost} is an address on this machine, and any program running here
            can use it. Approve only if you started this connection yourself just now, from an
            app you trust such as Claude Code.
          </p>
        </div>
      )}

      {hasPasskey ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-gray-900 mb-1">Permissions</legend>
          {details.requestedScopes.map(scope => (
            <label key={scope} className="flex items-start space-x-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={selected.has(scope)}
                onChange={() => toggle(scope)}
                disabled={busy}
                className="mt-1 rounded border-gray-300 text-indigo-600"
              />
              <span>
                <span className="text-gray-900">{details.scopeDescriptions[scope] ?? scope}</span>
                <span className="block font-mono text-xs text-gray-500">{scope}</span>
              </span>
            </label>
          ))}
        </fieldset>
      ) : (
        <p role="alert" className="text-sm text-red-600">
          You have no passkey on this account yet. Add one under Passkeys in the app, then start
          again from Claude.
        </p>
      )}

      {errorCode && (
        <p role="alert" className="text-sm text-red-600">
          {ERROR_COPY[errorCode].message}
        </p>
      )}

      {phase === 'leaving' ? (
        <p className="text-sm text-gray-600">Returning to {details.clientName}...</p>
      ) : (
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={handleDeny}
            disabled={busy}
            className="py-2 px-4 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {phase === 'denying' ? 'Denying...' : 'Deny'}
          </button>
          {hasPasskey && (
            <button
              type="button"
              onClick={handleApprove}
              disabled={busy || selected.size === 0}
              className="py-2 px-4 rounded-md bg-indigo-600 text-white text-sm hover:bg-indigo-700 disabled:opacity-60"
            >
              {phase === 'approving' ? 'Waiting for passkey...' : 'Approve with passkey'}
            </button>
          )}
        </div>
      )}
    </Shell>
  );
};

export default OAuthConsentPage;
