/**
 * Passkey (WebAuthn) API client.
 *
 * Kept separate from api.ts so that the passkey surface is reviewable on
 * its own, and so removing Google in a later phase touches one file.
 */

import {
  startRegistration,
  startAuthentication,
} from '@simplewebauthn/browser';

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || 'https://api.yeezlestodo.com';

export interface PasskeySummary {
  id: number;
  credentialId: string;
  nickname: string | null;
  createdAt: string;
  lastUsedAt: string | null;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error?: { code: string; message: string };
}

/**
 * Supplies the current Google ID token, or null when there isn't a valid one.
 *
 * Registered once by AuthContext, mirroring how api.ts receives `getValidToken`.
 * Kept as a module-level provider rather than a per-call argument so the four
 * exported functions keep their existing signatures and no call site changes.
 */
type TokenProvider = () => string | null;

let tokenProvider: TokenProvider | null = null;

export function setPasskeyTokenProvider(provider: TokenProvider): void {
  tokenProvider = provider;
}

/**
 * Bearer header, or nothing at all.
 *
 * Nothing — not `Bearer null` — when there is no token: the backend branches on
 * the mere presence of an `Authorization` header, so a bogus one would send it
 * down the Bearer path to fail there instead of falling through to the session
 * cookie.
 */
function authHeader(): Record<string, string> {
  const token = tokenProvider?.() ?? null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    // Spread `init` FIRST, then re-assert `credentials` and merge `headers`
    // on top. If this order is ever "tidied" back to spreading `init` last,
    // a caller-supplied init.credentials or init.headers would silently
    // override the cookie-auth guarantee this helper exists to enforce
    // (session lives in an httpOnly cookie) and would replace the headers
    // object wholesale instead of merging into it. Do not reorder.
    //
    // `authHeader()` goes LAST, after init.headers, for the same reason
    // `credentials` is re-asserted: it is an auth guarantee, not a default, and
    // must not be overridable by a caller-supplied header. Both auth paths are
    // sent together — the Bearer token is what enrollment requires
    // (requireFreshAuth accepts only authMethod 'google-id-token'), while the
    // cookie is what keeps the session working once Google is gone.
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
      ...authHeader(),
    },
  });

  const body = (await response.json()) as ApiEnvelope<T>;
  if (!body.success) {
    throw new Error(body.error?.message || 'Request failed');
  }
  return body.data;
}

/** Enroll a new passkey. Requires an existing authenticated session. */
export async function enrollPasskey(
  nickname?: string
): Promise<{ credentialId: string }> {
  const options = await call<Parameters<typeof startRegistration>[0]['optionsJSON']>(
    '/auth/passkey/register/options',
    { method: 'POST', body: JSON.stringify({}) }
  );

  const response = await startRegistration({ optionsJSON: options });

  return call<{ verified: boolean; credentialId: string }>(
    '/auth/passkey/register/verify',
    { method: 'POST', body: JSON.stringify({ response, nickname }) }
  );
}

/** Usernameless login. The browser offers any discoverable credential. */
export async function loginWithPasskey(): Promise<{ email: string; name: string }> {
  const options = await call<Parameters<typeof startAuthentication>[0]['optionsJSON']>(
    '/auth/passkey/login/options',
    { method: 'POST', body: JSON.stringify({}) }
  );

  const response = await startAuthentication({ optionsJSON: options });

  const result = await call<{ user: { email: string; name: string } }>(
    '/auth/passkey/login/verify',
    { method: 'POST', body: JSON.stringify({ response }) }
  );
  return result.user;
}

export async function listPasskeys(): Promise<PasskeySummary[]> {
  return call<PasskeySummary[]>('/auth/passkey/credentials', { method: 'GET' });
}

export async function deletePasskey(id: number): Promise<void> {
  await call<{ id: number; deleted: boolean }>(
    `/auth/passkey/credentials/${id}`,
    { method: 'DELETE' }
  );
}
