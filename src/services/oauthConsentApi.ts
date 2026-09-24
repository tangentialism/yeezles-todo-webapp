/**
 * OAuth consent API client (spec §6.2, "Consent HTTP contract").
 *
 * Kept separate from api.ts, passkeyApi.ts and accessTokenApi.ts for the
 * same reason they are separate from each other: this surface is reviewable
 * on its own. Unlike those two, it sends NO Authorization header -- the
 * contract authenticates consent by the session cookie alone, and a stale
 * Bearer would send the backend down the Bearer branch instead of falling
 * through to the cookie.
 */

import { startAuthentication } from '@simplewebauthn/browser';
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/browser';

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || 'https://api.yeezlestodo.com';

/** `data` of `GET /oauth/requests/:id` -- field for field from the contract. */
export interface ConsentRequestDetails {
  requestId: string;
  clientId: string;
  clientName: string;
  redirectHost: string;
  isLoopback: boolean;
  requestedScopes: string[];
  scopeDescriptions: Record<string, string>;
  expiresAt: string;
  passkeyOptions: PublicKeyCredentialRequestOptionsJSON;
}

/** Body of `POST /oauth/consent` -- exactly the contract's two shapes. */
export type ConsentSubmission =
  | {
      requestId: string;
      decision: 'approve';
      scopes: string[];
      assertion: AuthenticationResponseJSON;
    }
  | { requestId: string; decision: 'deny' };

/** The five error codes the contract defines. */
export type ContractErrorCode =
  | 'UNAUTHENTICATED'
  | 'REQUEST_NOT_FOUND'
  | 'ORIGIN_MISMATCH'
  | 'PASSKEY_INVALID'
  | 'INVALID_SCOPES';

/**
 * Contract codes, plus one more backend code the webapp recognises beyond
 * the contract's five, plus four the webapp raises itself:
 * - RATE_LIMITED: a backend code (429) beyond the contract's five, recognised
 *   here because the backend's rate limiter can reject a consent call.
 * - PASSKEY_CANCELLED: startAuthentication threw (user cancelled, timed out,
 *   no matching credential); nothing was sent to the backend.
 * - UNEXPECTED_REDIRECT: the backend's redirectTo failed checkRedirect.
 * - NETWORK: fetch itself rejected.
 * - UNKNOWN: any other non-success response, including non-JSON bodies.
 */
export type OAuthConsentErrorCode =
  | ContractErrorCode
  | 'RATE_LIMITED'
  | 'PASSKEY_CANCELLED'
  | 'UNEXPECTED_REDIRECT'
  | 'NETWORK'
  | 'UNKNOWN';

const RECOGNISED_CODES: ReadonlySet<string> = new Set<
  ContractErrorCode | 'RATE_LIMITED'
>(['UNAUTHENTICATED', 'REQUEST_NOT_FOUND', 'ORIGIN_MISMATCH', 'PASSKEY_INVALID', 'INVALID_SCOPES', 'RATE_LIMITED']);

export class OAuthConsentError extends Error {
  readonly code: OAuthConsentErrorCode;
  /** HTTP status, or null when no response was received. */
  readonly status: number | null;

  constructor(code: OAuthConsentErrorCode, message: string, status: number | null = null) {
    super(message);
    this.name = 'OAuthConsentError';
    this.code = code;
    this.status = status;
  }
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error?: { code: string; message: string };
}

async function call<T>(path: string, init: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      // Same order as passkeyApi.ts's call(): spread init FIRST so the
      // cookie guarantee below cannot be overridden by a caller.
      ...init,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...init.headers,
      },
    });
  } catch {
    throw new OAuthConsentError('NETWORK', 'Could not reach the server');
  }

  // A rate limiter or proxy can answer with text or HTML. Never let a
  // parse failure escape as a SyntaxError the page cannot classify.
  let body: ApiEnvelope<T> | null;
  try {
    body = (await response.json()) as ApiEnvelope<T>;
  } catch {
    body = null;
  }

  if (body?.success === true) {
    return body.data;
  }

  const code = body?.error?.code;
  if (code !== undefined && RECOGNISED_CODES.has(code)) {
    throw new OAuthConsentError(
      code as OAuthConsentErrorCode,
      body?.error?.message ?? code,
      response.status
    );
  }
  throw new OAuthConsentError(
    'UNKNOWN',
    body?.error?.message ?? `Request failed (${response.status})`,
    response.status
  );
}

/**
 * Refuse any redirectTo that is not http(s) to the host the user was shown.
 *
 * The backend builds redirectTo from a redirect_uri it already validated, so
 * this should never fire. It exists so that a backend bug can never make this
 * page navigate to a `javascript:` URL or to a host the consent screen did not
 * name. Hostnames only: the contract does not say whether redirectHost carries
 * a port, and loopback ports vary per run (RFC 8252).
 */
export function checkRedirect(
  redirectTo: unknown,
  shown: Pick<ConsentRequestDetails, 'redirectHost' | 'isLoopback'>
): string {
  const refuse = (): never => {
    throw new OAuthConsentError(
      'UNEXPECTED_REDIRECT',
      'The server returned an unexpected redirect'
    );
  };

  if (typeof redirectTo !== 'string') return refuse();

  let target: URL;
  let expected: URL;
  try {
    target = new URL(redirectTo);
    expected = new URL(`http://${shown.redirectHost}`);
  } catch {
    return refuse();
  }

  const httpsOk = target.protocol === 'https:';
  const httpOk = target.protocol === 'http:' && shown.isLoopback;
  if (!httpsOk && !httpOk) return refuse();
  if (target.hostname.toLowerCase() !== expected.hostname.toLowerCase()) return refuse();

  return redirectTo;
}

/** `GET /oauth/requests/:id`. The id is path-encoded; it comes from the URL bar. */
export async function getConsentRequest(requestId: string): Promise<ConsentRequestDetails> {
  return call<ConsentRequestDetails>(
    `/oauth/requests/${encodeURIComponent(requestId)}`,
    { method: 'GET' }
  );
}

/**
 * Run the passkey ceremony against the request-bound challenge, then
 * `POST /oauth/consent` with decision 'approve'. Resolves to a checked
 * redirectTo; the caller navigates.
 */
export async function approveConsent(
  details: ConsentRequestDetails,
  scopes: string[]
): Promise<string> {
  let assertion: AuthenticationResponseJSON;
  try {
    assertion = await startAuthentication({ optionsJSON: details.passkeyOptions });
  } catch (err) {
    throw new OAuthConsentError(
      'PASSKEY_CANCELLED',
      err instanceof Error ? err.message : 'The passkey check did not complete'
    );
  }

  const submission: ConsentSubmission = {
    requestId: details.requestId,
    decision: 'approve',
    scopes,
    assertion,
  };
  const data = await call<{ redirectTo: unknown }>('/oauth/consent', {
    method: 'POST',
    body: JSON.stringify(submission),
  });
  return checkRedirect(data.redirectTo, details);
}

/** `POST /oauth/consent` with decision 'deny'. No passkey. */
export async function denyConsent(details: ConsentRequestDetails): Promise<string> {
  const submission: ConsentSubmission = {
    requestId: details.requestId,
    decision: 'deny',
  };
  const data = await call<{ redirectTo: unknown }>('/oauth/consent', {
    method: 'POST',
    body: JSON.stringify(submission),
  });
  return checkRedirect(data.redirectTo, details);
}
