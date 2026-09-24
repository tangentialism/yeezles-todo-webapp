import { describe, it, expect, vi, beforeEach } from 'vitest';
import { startAuthentication } from '@simplewebauthn/browser';
import {
  getConsentRequest,
  approveConsent,
  denyConsent,
  checkRedirect,
  OAuthConsentError,
  type ConsentRequestDetails,
} from '../oauthConsentApi';

vi.mock('@simplewebauthn/browser', () => ({
  startAuthentication: vi.fn(),
}));

const DETAILS: ConsentRequestDetails = {
  requestId: 'req-1',
  clientId: 'https://claude.ai/oauth/claude-client-metadata',
  clientName: 'Claude',
  redirectHost: 'claude.ai',
  isLoopback: false,
  requestedScopes: ['todos:read', 'todos:create'],
  scopeDescriptions: { 'todos:read': 'See your todos', 'todos:create': 'Create todos' },
  expiresAt: '2026-09-23T12:10:00Z',
  passkeyOptions: { challenge: 'chal-1', rpId: 'yeezlestodo.com', allowCredentials: [] },
};

const ASSERTION = {
  id: 'cred-1', rawId: 'cred-1', type: 'public-key',
  response: { clientDataJSON: 'c', authenticatorData: 'a', signature: 's' },
  clientExtensionResults: {},
};

function jsonResponse(status: number, body: unknown) {
  return { ok: status < 400, status, json: async () => body };
}

async function caught(p: Promise<unknown>): Promise<OAuthConsentError> {
  try {
    await p;
  } catch (err) {
    expect(err).toBeInstanceOf(OAuthConsentError);
    return err as OAuthConsentError;
  }
  throw new Error('expected rejection');
}

describe('oauthConsentApi', () => {
  beforeEach(() => {
    vi.mocked(startAuthentication).mockReset();
  });

  describe('getConsentRequest', () => {
    it('GETs the path-encoded request id with the cookie and no Authorization header', async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { success: true, data: DETAILS }));
      vi.stubGlobal('fetch', fetchMock);

      const result = await getConsentRequest('a/b?c');

      expect(result).toEqual(DETAILS);
      expect(fetchMock.mock.calls[0][0]).toMatch(/\/oauth\/requests\/a%2Fb%3Fc$/);
      expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'GET', credentials: 'include' });
      expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty('Authorization');
    });

    it.each([
      [401, 'UNAUTHENTICATED'],
      [404, 'REQUEST_NOT_FOUND'],
      [403, 'ORIGIN_MISMATCH'],
      [403, 'PASSKEY_INVALID'],
      [400, 'INVALID_SCOPES'],
      [429, 'RATE_LIMITED'],
    ])('maps %i %s to an OAuthConsentError with that code', async (status, code) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
        jsonResponse(status, { success: false, error: { code, message: `backend says ${code}` } })
      ));

      const err = await caught(getConsentRequest('req-1'));

      expect(err.code).toBe(code);
      expect(err.status).toBe(status);
    });

    it('maps an unrecognised error code to UNKNOWN', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
        jsonResponse(500, { success: false, error: { code: 'INTERNAL', message: 'boom' } })
      ));

      const err = await caught(getConsentRequest('req-1'));

      expect(err.code).toBe('UNKNOWN');
      expect(err.status).toBe(500);
    });

    it('maps a non-JSON body (e.g. a rate limiter 429) to UNKNOWN, not a SyntaxError', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => { throw new SyntaxError('Unexpected token T'); },
      }));

      const err = await caught(getConsentRequest('req-1'));

      expect(err.code).toBe('UNKNOWN');
      expect(err.status).toBe(429);
    });

    it('maps a rejected fetch to NETWORK', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

      const err = await caught(getConsentRequest('req-1'));

      expect(err.code).toBe('NETWORK');
      expect(err.status).toBeNull();
    });
  });

  describe('approveConsent', () => {
    it('runs the ceremony on the request-bound options, POSTs the exact contract body, and returns redirectTo', async () => {
      vi.mocked(startAuthentication).mockResolvedValue(ASSERTION as never);
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, {
        success: true,
        data: { redirectTo: 'https://claude.ai/api/mcp/auth_callback?code=abc&state=xyz&iss=https%3A%2F%2Fapi.yeezlestodo.com' },
      }));
      vi.stubGlobal('fetch', fetchMock);

      const redirectTo = await approveConsent(DETAILS, ['todos:read']);

      expect(startAuthentication).toHaveBeenCalledWith({ optionsJSON: DETAILS.passkeyOptions });
      expect(fetchMock.mock.calls[0][0]).toMatch(/\/oauth\/consent$/);
      expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST', credentials: 'include' });
      expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual({
        requestId: 'req-1',
        decision: 'approve',
        scopes: ['todos:read'],
        assertion: ASSERTION,
      });
      expect(redirectTo).toBe('https://claude.ai/api/mcp/auth_callback?code=abc&state=xyz&iss=https%3A%2F%2Fapi.yeezlestodo.com');
    });

    it('raises PASSKEY_CANCELLED and sends nothing when the ceremony throws', async () => {
      vi.mocked(startAuthentication).mockRejectedValue(
        Object.assign(new Error('The operation either timed out or was not allowed.'), { name: 'NotAllowedError' })
      );
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);

      const err = await caught(approveConsent(DETAILS, ['todos:read']));

      expect(err.code).toBe('PASSKEY_CANCELLED');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('surfaces PASSKEY_INVALID from the backend', async () => {
      vi.mocked(startAuthentication).mockResolvedValue(ASSERTION as never);
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
        jsonResponse(403, { success: false, error: { code: 'PASSKEY_INVALID', message: 'bad assertion' } })
      ));

      const err = await caught(approveConsent(DETAILS, ['todos:read']));

      expect(err.code).toBe('PASSKEY_INVALID');
    });

    it('refuses a redirectTo to a host other than the one shown', async () => {
      vi.mocked(startAuthentication).mockResolvedValue(ASSERTION as never);
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
        jsonResponse(200, { success: true, data: { redirectTo: 'https://evil.example/cb?code=abc' } })
      ));

      const err = await caught(approveConsent(DETAILS, ['todos:read']));

      expect(err.code).toBe('UNEXPECTED_REDIRECT');
    });
  });

  describe('denyConsent', () => {
    it('POSTs exactly { requestId, decision: deny } without a ceremony', async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, {
        success: true,
        data: { redirectTo: 'https://claude.ai/api/mcp/auth_callback?error=access_denied&state=xyz&iss=x' },
      }));
      vi.stubGlobal('fetch', fetchMock);

      const redirectTo = await denyConsent(DETAILS);

      expect(startAuthentication).not.toHaveBeenCalled();
      expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual({
        requestId: 'req-1',
        decision: 'deny',
      });
      expect(redirectTo).toContain('error=access_denied');
    });
  });

  describe('checkRedirect', () => {
    const remote = { redirectHost: 'claude.ai', isLoopback: false };
    const loopback = { redirectHost: 'localhost', isLoopback: true };

    it('accepts https to the shown host', () => {
      expect(checkRedirect('https://claude.ai/cb?code=1', remote)).toBe('https://claude.ai/cb?code=1');
    });

    it('accepts http loopback on any port, with or without a port in redirectHost', () => {
      expect(checkRedirect('http://localhost:33418/callback?code=1', loopback)).toBe('http://localhost:33418/callback?code=1');
      expect(checkRedirect('http://localhost:33418/callback?code=1', { redirectHost: 'localhost:33418', isLoopback: true }))
        .toBe('http://localhost:33418/callback?code=1');
    });

    it.each([
      ['javascript scheme', 'javascript:alert(1)'],
      ['data scheme', 'data:text/html,hi'],
      ['other host', 'https://evil.example/cb'],
      ['suffix trick', 'https://claude.ai.evil.example/cb'],
      ['userinfo trick', 'https://claude.ai@evil.example/cb'],
      ['plain http to a non-loopback host', 'http://claude.ai/cb'],
      ['relative path', '/cb?code=1'],
      ['empty string', ''],
    ])('refuses %s', (_label, url) => {
      expect(() => checkRedirect(url, remote)).toThrow(OAuthConsentError);
    });

    it('refuses a non-string redirectTo', () => {
      expect(() => checkRedirect(undefined, remote)).toThrow(OAuthConsentError);
      expect(() => checkRedirect({ href: 'https://claude.ai' }, remote)).toThrow(OAuthConsentError);
    });
  });
});
