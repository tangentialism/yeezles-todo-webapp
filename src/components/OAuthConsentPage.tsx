import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PasskeyLoginButton from './PasskeyLoginButton';
import PageShell from './ui/PageShell';
import Checkbox from './ui/Checkbox';
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  KeyIcon,
  LinkIcon,
  RefreshIcon,
  ReturnIcon,
  Spinner,
} from './ui/Icons';
import { ghostButton, outlineButton, pageCard, primaryButton, sectionCap } from './ui/styles';
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
    message:
      'Approving a connection needs a passkey sign-in on this device. Sign in with a passkey to continue.',
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
    message: "The passkey check didn't go through (it may have timed out). Try again.",
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

/** Page frame: wordmark header, then a centred card. */
const Shell: React.FC<{ children: React.ReactNode; narrow?: boolean }> = ({ children, narrow }) => (
  <PageShell>
    <main
      className={`mx-5 sm:mx-auto mt-4 sm:mt-12 mb-10 p-6 sm:p-8 flex flex-col gap-4 ${pageCard} ${
        narrow ? 'sm:max-w-[400px]' : 'sm:max-w-[520px]'
      }`}
    >
      {children}
    </main>
  </PageShell>
);

/** Round status mark at the top of a state card. */
const StatusMark: React.FC<{ tone: 'danger' | 'quiet'; children: React.ReactNode }> = ({ tone, children }) => (
  <span
    aria-hidden="true"
    className={`w-10 h-10 rounded-full flex items-center justify-center ${
      tone === 'danger' ? 'bg-danger-soft text-danger' : 'bg-hover text-ink-muted'
    }`}
  >
    {children}
  </span>
);

/** Message for a failure, styled as the body of a state card. */
const ErrorMessage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p role="alert" className="text-[14.5px] leading-[22px] text-ink">
    {children}
  </p>
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
        // A failed GET (initial or retry) leaves no live challenge, so the
        // form must not come back on stale details -- fall to the terminal
        // or load-failure view instead.
        setDetails(null);
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
    // `selected` survives a `setDetails(null)`, so a retry after a failed
    // refetch must not re-tick everything -- that would silently widen
    // consent past what the user chose. Empty only on a genuine first-load
    // failure, where everything still defaults to ticked.
    void fetchDetails(selected.size > 0);
  };

  if (!requestId) {
    return (
      <Shell narrow>
        <StatusMark tone="danger"><AlertCircleIcon className="w-[18px] h-[18px]" /></StatusMark>
        <ErrorMessage>This link is missing its request. Start again from Claude.</ErrorMessage>
      </Shell>
    );
  }

  if (errorCode && !ERROR_COPY[errorCode].retry) {
    return (
      <Shell narrow>
        <StatusMark tone="danger"><AlertCircleIcon className="w-[18px] h-[18px]" /></StatusMark>
        <ErrorMessage>{ERROR_COPY[errorCode].message}</ErrorMessage>
        {errorCode === 'UNAUTHENTICATED' && (
          <PasskeyLoginButton onSuccess={() => window.location.reload()} />
        )}
      </Shell>
    );
  }

  if (!details) {
    return (
      <Shell narrow>
        {errorCode ? (
          <>
            <StatusMark tone="quiet"><RefreshIcon className="w-[18px] h-[18px]" /></StatusMark>
            <ErrorMessage>{ERROR_COPY[errorCode].message}</ErrorMessage>
            <button type="button" onClick={handleRetryLoad} className={`${outlineButton} self-start`}>
              Try again
            </button>
          </>
        ) : (
          <div aria-busy="true" className="flex flex-col gap-4">
            <StatusMark tone="quiet"><Spinner className="w-[18px] h-[18px]" /></StatusMark>
            <span className="text-[14.5px] text-ink-muted">Loading request…</span>
            <div aria-hidden="true" className="flex flex-col gap-2.5">
              <span className="h-2.5 w-4/5 rounded bg-hover" />
              <span className="h-2.5 w-3/5 rounded bg-hover" />
            </div>
          </div>
        )}
      </Shell>
    );
  }

  const busy = phase !== 'idle';
  const hasPasskey = (details.passkeyOptions.allowCredentials?.length ?? 0) > 0;

  const selectedCount = details.requestedScopes.filter((scope) => selected.has(scope)).length;

  return (
    <Shell>
      {/* The app and Yeezles, joined: what this page is about, at a glance */}
      <div aria-hidden="true" className="flex items-center gap-2.5">
        <span className="w-11 h-11 rounded-full bg-ink text-paper flex items-center justify-center text-base font-semibold">
          {details.clientName.trim().charAt(0).toUpperCase()}
        </span>
        <span className="w-10 border-t-[1.5px] border-dashed border-ink-faint/60" />
        <LinkIcon className="w-4 h-4 text-ink-faint" />
        <span className="w-10 border-t-[1.5px] border-dashed border-ink-faint/60" />
        <span className="w-11 h-11 rounded-full bg-accent-soft text-accent-ink flex items-center justify-center font-serif text-xl">
          Y
        </span>
      </div>

      <div>
        <h1 className="mt-1.5 font-serif font-medium text-2xl sm:text-[26px] leading-[1.2] tracking-[-0.01em] text-ink">
          {details.clientName} wants to access your Yeezles account
        </h1>
        <p className="mt-2.5 flex items-center gap-2 text-[13px] text-ink-muted">
          <ReturnIcon className="w-[15px] h-[15px] flex-none" />
          <span>
            Returns to <span className="font-mono text-ink">{details.redirectHost}</span>
          </span>
        </p>
      </div>

      {details.isLoopback && (
        <div
          role="note"
          aria-label="Loopback warning"
          className="flex gap-3 rounded-xl bg-danger-soft px-4 py-3.5 text-[13.5px] leading-5 text-ink-2"
        >
          <AlertTriangleIcon className="w-[18px] h-[18px] flex-none mt-px text-danger" />
          <div>
            <p className="font-semibold text-danger">This app runs on your own computer.</p>
            <p className="mt-0.5">
              {details.redirectHost} is an address on this machine, and any program running here
              can use it. Approve only if you started this connection yourself just now, from an
              app you trust such as Claude Code.
            </p>
          </div>
        </div>
      )}

      {hasPasskey ? (
        <fieldset className="mt-2">
          <legend className={`${sectionCap} mb-1`}>Permissions</legend>
          {details.requestedScopes.map(scope => (
            <label
              key={scope}
              className="flex items-start gap-3.5 py-3 border-b border-line last:border-b-0 cursor-pointer"
            >
              <span className="mt-px">
                <Checkbox checked={selected.has(scope)} onChange={() => toggle(scope)} disabled={busy} />
              </span>
              <span className="min-w-0">
                <span className={`block text-[14.5px] leading-[21px] ${selected.has(scope) ? 'text-ink' : 'text-ink-muted'}`}>
                  {details.scopeDescriptions[scope] ?? scope}
                </span>
                <span className="block font-mono text-xs text-ink-faint">{scope}</span>
              </span>
            </label>
          ))}
        </fieldset>
      ) : (
        <div className="flex gap-3 rounded-xl bg-danger-soft px-4 py-3.5">
          <AlertCircleIcon className="w-[18px] h-[18px] flex-none mt-px text-danger" />
          <p role="alert" className="text-[13.5px] leading-5 text-ink-2">
            You have no passkey on this account yet. Add one under Passkeys in the app, then start
            again from Claude.
          </p>
        </div>
      )}

      {errorCode && (
        <p role="alert" className="flex items-start gap-2 text-[13.5px] leading-5 text-danger">
          <AlertCircleIcon className="w-4 h-4 flex-none mt-0.5" />
          {ERROR_COPY[errorCode].message}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-1.5 pt-[18px] border-t border-line">
        {phase === 'leaving' ? (
          <p className="mr-auto flex items-center gap-2 text-sm text-ink-muted">
            <Spinner className="w-4 h-4" />
            Returning to {details.clientName}…
          </p>
        ) : (
          <>
            {hasPasskey && (
              <span className="mr-auto font-mono text-xs text-ink-faint">
                {selectedCount} of {details.requestedScopes.length}
              </span>
            )}
            <button type="button" onClick={handleDeny} disabled={busy} className={`${ghostButton} h-11 px-[18px]`}>
              {phase === 'denying' ? 'Denying…' : 'Deny'}
            </button>
            {hasPasskey && (
              <button
                type="button"
                onClick={handleApprove}
                disabled={busy || selected.size === 0}
                className={`${primaryButton} h-11 px-5 max-sm:w-full`}
              >
                {phase === 'approving' ? <Spinner className="w-4 h-4" /> : <KeyIcon className="w-4 h-4" />}
                {phase === 'approving' ? 'Waiting for passkey…' : 'Approve with passkey'}
              </button>
            )}
          </>
        )}
      </div>
    </Shell>
  );
};

export default OAuthConsentPage;
