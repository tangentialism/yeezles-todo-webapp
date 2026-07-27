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

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    // Session lives in an httpOnly cookie, so every call must include it.
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
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
