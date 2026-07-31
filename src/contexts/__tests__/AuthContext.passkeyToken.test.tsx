/**
 * AuthContext must hand the Google ID token to the passkey client.
 *
 * Deliberately a separate file from AuthContext.test.tsx: that suite has 14
 * pre-existing failures caused by real network calls escaping into jsdom
 * ("Cross origin http://localhost:3000 forbidden"), and this behaviour should
 * not be reported through a harness that is already red for unrelated reasons.
 *
 * The defect this covers, found during passkey Phase 2 device testing: the
 * passkey client authenticated by cookie ONLY, and enrollment is guarded by
 * requireFreshAuth, which accepts solely authMethod 'google-id-token' — set by
 * the backend only on the Bearer path. So passkey enrollment could never
 * succeed: 401 with no session cookie, 403 with one. Registering the provider
 * here is what closes that gap.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { setPasskeyTokenProvider } from '../../services/passkeyApi';
import { AuthProvider } from '../AuthContext';

// AuthProvider builds an API client and runs a session health check on mount.
// Neither is under test here, and unmocked they reach the network.
vi.mock('../../services/api', () => ({
  createAuthenticatedApiClient: vi.fn(() => ({
    getTodos: vi.fn(),
    checkSessionHealth: vi.fn().mockResolvedValue({ authenticated: false }),
  })),
}));

vi.mock('../../services/passkeyApi', () => ({
  setPasskeyTokenProvider: vi.fn(),
}));

describe('AuthContext passkey token wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers a token provider with the passkey client on mount', () => {
    render(
      <AuthProvider>
        <div>child</div>
      </AuthProvider>
    );

    expect(setPasskeyTokenProvider).toHaveBeenCalled();
    const provider = vi.mocked(setPasskeyTokenProvider).mock.calls[0][0];
    expect(typeof provider).toBe('function');
  });

  it('the registered provider returns null while signed out', () => {
    render(
      <AuthProvider>
        <div>child</div>
      </AuthProvider>
    );

    const provider = vi.mocked(setPasskeyTokenProvider).mock.calls[0][0];
    // No login has happened, so there is no valid Google ID token. The passkey
    // client must then send no Authorization header at all rather than
    // "Bearer null" — see passkeyApi.test.ts.
    expect(provider()).toBeNull();
  });
});
