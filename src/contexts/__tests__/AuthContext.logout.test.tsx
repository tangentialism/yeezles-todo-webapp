/**
 * Signing out must actually end the session, not just forget it locally.
 *
 * Separate file from AuthContext.test.tsx, which has 14 pre-existing failures
 * from real network calls escaping into jsdom.
 *
 * Confirmed against production during passkey Phase 2 testing: "log out and
 * back in" left the user signed in. logout() cleared local state but never told
 * the server, so the httpOnly `__Host-remember_token` cookie and its session
 * survived and the next page load silently restored the user as
 * `persistent-session`. Two consequences — a 90-day session left behind on a
 * shared machine, and passkey enrollment permanently unreachable, because a
 * cookie-restored user never holds the Google ID token enrollment requires and
 * had no way to obtain one.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createAuthenticatedApiClient } from '../../services/api';
import { AuthProvider, useAuth } from '../AuthContext';

const logoutSpy = vi.fn().mockResolvedValue({ success: true, data: { loggedOut: true } });
const revokeAllSpy = vi.fn().mockResolvedValue({ success: true, data: { revokedCount: 2 } });

vi.mock('../../services/api', () => ({
  createAuthenticatedApiClient: vi.fn(() => ({
    logout: logoutSpy,
    revokeAllSessions: revokeAllSpy,
    validatePersistentSession: vi.fn().mockResolvedValue({ success: false }),
    checkSessionHealth: vi.fn().mockResolvedValue({ authenticated: false }),
  })),
}));

vi.mock('../../services/passkeyApi', () => ({
  setPasskeyTokenProvider: vi.fn(),
}));

function LogoutButton() {
  const { logout } = useAuth();
  return <button onClick={() => void logout()}>sign out</button>;
}

describe('AuthContext logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('tells the server to end this session', async () => {
    render(
      <AuthProvider>
        <LogoutButton />
      </AuthProvider>
    );

    screen.getByText('sign out').click();

    await waitFor(() => {
      expect(logoutSpy).toHaveBeenCalled();
    });
  });

  it('does not sign the user out everywhere', async () => {
    render(
      <AuthProvider>
        <LogoutButton />
      </AuthProvider>
    );

    screen.getByText('sign out').click();

    await waitFor(() => {
      expect(logoutSpy).toHaveBeenCalled();
    });
    // The user's phone must stay signed in — that distinction is the entire
    // reason /auth/logout exists alongside DELETE /auth/sessions.
    expect(revokeAllSpy).not.toHaveBeenCalled();
    expect(createAuthenticatedApiClient).toHaveBeenCalled();
  });
});
