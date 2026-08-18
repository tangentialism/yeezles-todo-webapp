/**
 * Access token API client.
 *
 * Kept separate from api.ts and passkeyApi.ts, mirroring the same rationale:
 * this surface is reviewable on its own, and its structure (API_BASE,
 * ApiEnvelope, module-level token provider, credentials: 'include') follows
 * passkeyApi.ts exactly.
 */

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || 'https://api.yeezlestodo.com';

export interface AccessTokenSummary {
  id: number;
  name: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  isRevoked: boolean;
}

export interface CreatedAccessToken extends Omit<AccessTokenSummary, 'lastUsedAt' | 'isRevoked'> {
  token: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error?: { code: string; message: string };
}

/**
 * Supplies the current Google ID token, or null when there isn't a valid one.
 *
 * Registered once by AuthContext, mirroring passkeyApi.ts's provider. Kept as
 * a module-level provider rather than a per-call argument so the exported
 * functions keep their existing signatures and no call site changes.
 */
type TokenProvider = () => string | null;

let tokenProvider: TokenProvider | null = null;

export function setAccessTokenApiTokenProvider(provider: TokenProvider): void {
  tokenProvider = provider;
}

/**
 * Bearer header, or nothing at all.
 *
 * Nothing -- not `Bearer null` -- when there is no token: the backend
 * branches on the mere presence of an `Authorization` header, so a bogus one
 * would send it down the Bearer path to fail there instead of falling
 * through to the session cookie.
 */
function authHeader(): Record<string, string> {
  const token = tokenProvider?.() ?? null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Thrown when the backend rejects a request because the session isn't a
 * fresh Google sign-in (403 STEP_UP_REQUIRED). Carries `code` so callers can
 * branch on it without string-matching the message -- the backend's message
 * for this code is shared with passkey enrollment and is wrong for token
 * creation, so callers should write their own copy rather than display it.
 */
export class StepUpRequiredError extends Error {
  code = 'STEP_UP_REQUIRED' as const;

  constructor(message: string) {
    super(message);
    this.name = 'StepUpRequiredError';
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    // Spread `init` FIRST, then re-assert `credentials` and merge `headers`
    // on top -- see passkeyApi.ts's `call` for why this order matters and
    // must not be "tidied" back.
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
      ...authHeader(),
    },
  });

  // 204 No Content (revoke's success response) has no body to parse.
  if (response.status === 204) {
    return undefined as T;
  }

  const body = (await response.json()) as ApiEnvelope<T>;
  if (!body.success) {
    if (response.status === 403 && body.error?.code === 'STEP_UP_REQUIRED') {
      throw new StepUpRequiredError(body.error?.message || 'Fresh sign-in required');
    }
    throw new Error(body.error?.message || 'Request failed');
  }
  return body.data;
}

export async function listTokens(): Promise<AccessTokenSummary[]> {
  return call<AccessTokenSummary[]>('/auth/tokens', { method: 'GET' });
}

export async function createToken(
  name: string,
  scopes: string[]
): Promise<CreatedAccessToken> {
  return call<CreatedAccessToken>('/auth/tokens', {
    method: 'POST',
    body: JSON.stringify({ name, scopes }),
  });
}

export async function revokeToken(id: number): Promise<void> {
  await call<void>(`/auth/tokens/${id}`, { method: 'DELETE' });
}
