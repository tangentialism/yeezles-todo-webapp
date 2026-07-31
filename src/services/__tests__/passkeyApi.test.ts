import { describe, it, expect, vi, beforeEach } from 'vitest';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import {
  enrollPasskey,
  loginWithPasskey,
  listPasskeys,
  deletePasskey,
  setPasskeyTokenProvider,
} from '../passkeyApi';

vi.mock('@simplewebauthn/browser', () => ({
  startRegistration: vi.fn(),
  startAuthentication: vi.fn(),
}));

describe('passkeyApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('lists passkeys from the credentials endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [{
          id: 1, credentialId: 'abc', nickname: 'MacBook',
          createdAt: '2026-07-27T00:00:00Z', lastUsedAt: null,
        }],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await listPasskeys();

    expect(result).toHaveLength(1);
    expect(result[0].nickname).toBe('MacBook');
    // Cookie auth: the request must carry credentials.
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ credentials: 'include' });
  });

  it('throws when the backend reports failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      }),
    }));

    await expect(listPasskeys()).rejects.toThrow('Authentication required');
  });

  it('deletes a passkey by id', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { id: 7, deleted: true } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await deletePasskey(7);

    expect(fetchMock.mock.calls[0][0]).toContain('/auth/passkey/credentials/7');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'DELETE' });
  });

  // --- Regression coverage for call()'s credentials/headers merge order ---

  it('call() always forces credentials: include and merges the Content-Type header, regardless of spread order', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await listPasskeys();

    const [, init] = fetchMock.mock.calls[0];
    expect(init).toMatchObject({
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
  });

  // Note: a "direct" regression test proving a caller-supplied
  // `credentials: 'omit'` cannot win is not reachable through the public
  // API. None of the four exported functions (enrollPasskey,
  // loginWithPasskey, listPasskeys, deletePasskey) accept a caller-supplied
  // `init`/`credentials`/`headers` argument, and the internal `call()`
  // helper that does accept one is not exported. See the fix report for
  // task 7 for how this was verified instead (temporarily reverting the
  // spread order in call() and confirming the test above fails).

  // --- enrollPasskey ---

  it('enrolls a passkey: fetches options, calls startRegistration, verifies, and returns the credentialId', async () => {
    const optionsPayload = { challenge: 'chal-1', rp: { id: 'yeezlestodo.com' } };
    const authenticatorResponse = { id: 'cred-abc', rawId: 'cred-abc', response: {}, type: 'public-key' };

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: optionsPayload }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { verified: true, credentialId: 'cred-abc' } }),
      });
    vi.stubGlobal('fetch', fetchMock);
    vi.mocked(startRegistration).mockResolvedValue(authenticatorResponse as never);

    const result = await enrollPasskey('MacBook');

    expect(fetchMock.mock.calls[0][0]).toContain('/auth/passkey/register/options');
    expect(startRegistration).toHaveBeenCalledWith({ optionsJSON: optionsPayload });
    expect(fetchMock.mock.calls[1][0]).toContain('/auth/passkey/register/verify');
    const verifyBody = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(verifyBody).toEqual({ response: authenticatorResponse, nickname: 'MacBook' });
    expect(result.credentialId).toBe('cred-abc');
  });

  it('enrollPasskey throws with the backend message when verification fails', async () => {
    const optionsPayload = { challenge: 'chal-1' };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: optionsPayload }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: { code: 'INVALID_RESPONSE', message: 'Registration verification failed' },
        }),
      });
    vi.stubGlobal('fetch', fetchMock);
    vi.mocked(startRegistration).mockResolvedValue({ id: 'cred-x' } as never);

    await expect(enrollPasskey()).rejects.toThrow('Registration verification failed');
  });

  // --- loginWithPasskey ---

  it('logs in with a passkey: fetches options, calls startAuthentication, verifies, and returns the user', async () => {
    const optionsPayload = { challenge: 'chal-2', rpId: 'yeezlestodo.com' };
    const authenticatorResponse = { id: 'assertion-1', rawId: 'assertion-1', response: {}, type: 'public-key' };

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: optionsPayload }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { user: { email: 'a@example.com', name: 'Test User' } },
        }),
      });
    vi.stubGlobal('fetch', fetchMock);
    vi.mocked(startAuthentication).mockResolvedValue(authenticatorResponse as never);

    const result = await loginWithPasskey();

    expect(fetchMock.mock.calls[0][0]).toContain('/auth/passkey/login/options');
    expect(startAuthentication).toHaveBeenCalledWith({ optionsJSON: optionsPayload });
    expect(fetchMock.mock.calls[1][0]).toContain('/auth/passkey/login/verify');
    const verifyBody = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(verifyBody).toEqual({ response: authenticatorResponse });
    expect(result).toEqual({ email: 'a@example.com', name: 'Test User' });
  });

  it('loginWithPasskey throws with the backend message when verification fails', async () => {
    const optionsPayload = { challenge: 'chal-2' };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: optionsPayload }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'No matching passkey found' },
        }),
      });
    vi.stubGlobal('fetch', fetchMock);
    vi.mocked(startAuthentication).mockResolvedValue({ id: 'assertion-x' } as never);

    await expect(loginWithPasskey()).rejects.toThrow('No matching passkey found');
  });

  // --- Bearer token forwarding -------------------------------------------
  //
  // These cover the Phase 2 defect: passkeyApi was a cookie-ONLY client, so
  // every request reached the backend with no Authorization header. Enrollment
  // is guarded by requireFreshAuth, which accepts only authMethod
  // 'google-id-token' — a value the backend sets solely on the Bearer path.
  // Cookie auth yields 'persistent-session' and is refused. So without these
  // headers there is no state in which enrollment can succeed: 401 with no
  // cookie, 403 with one.

  it('sends the Google ID token as a Bearer header when a provider is registered', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);
    setPasskeyTokenProvider(() => 'google-id-token-abc');

    await listPasskeys();

    expect(fetchMock.mock.calls[0][1].headers).toMatchObject({
      Authorization: 'Bearer google-id-token-abc',
    });
  });

  it('sends the Bearer header on enrollment, the endpoint that requires it', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { challenge: 'chal-enroll' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { verified: true, credentialId: 'cred-1' } }),
      });
    vi.stubGlobal('fetch', fetchMock);
    vi.mocked(startRegistration).mockResolvedValue({ id: 'attestation-x' } as never);
    setPasskeyTokenProvider(() => 'google-id-token-enroll');

    await enrollPasskey('MacBook Touch ID');

    // Both legs of the ceremony must carry it, not just the first.
    expect(fetchMock.mock.calls[0][1].headers).toMatchObject({
      Authorization: 'Bearer google-id-token-enroll',
    });
    expect(fetchMock.mock.calls[1][1].headers).toMatchObject({
      Authorization: 'Bearer google-id-token-enroll',
    });
  });

  it('omits the Authorization header entirely when no token is available', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);
    // Expired or absent Google token: getValidToken() returns null. Sending
    // "Bearer null" would be worse than sending nothing — it would take the
    // backend down the Bearer branch and fail there instead of falling
    // through to the session cookie.
    setPasskeyTokenProvider(() => null);

    await listPasskeys();

    expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty('Authorization');
  });

  it('still sends cookies alongside the Bearer header', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);
    setPasskeyTokenProvider(() => 'google-id-token-abc');

    await listPasskeys();

    // Login/verify establishes the session cookie, so credentials must survive.
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ credentials: 'include' });
  });
});
