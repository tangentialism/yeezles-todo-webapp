/**
 * The API client must be able to end THIS browser's session.
 *
 * Separate file from api.test.ts, which has pre-existing failures from axios
 * mocking (`this.api.interceptors` undefined). This behaviour should not be
 * reported through an already-red harness.
 *
 * Background: signing out only cleared local state. The httpOnly
 * `__Host-remember_token` cookie survived and its server-side session stayed
 * valid, so the next page load silently signed the user back in. Confirmed
 * against production during passkey Phase 2 testing — "log out and back in"
 * did nothing, and enrollment stayed blocked because a cookie-restored user
 * can never obtain the Google ID token enrollment requires.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { createAuthenticatedApiClient } from '../api';

vi.mock('axios');

describe('api client logout', () => {
  let post: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    post = vi.fn().mockResolvedValue({ data: { success: true, data: { loggedOut: true } } });
    vi.mocked(axios.create).mockReturnValue({
      post,
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    } as never);
  });

  it('posts to /auth/logout', async () => {
    const client = createAuthenticatedApiClient(() => 'token', () => {});

    await client.logout();

    expect(post).toHaveBeenCalledWith('/auth/logout');
  });

  it('does not call the sign-out-everywhere endpoint', async () => {
    const client = createAuthenticatedApiClient(() => 'token', () => {});
    const del = vi.mocked(axios.create).mock.results[0].value.delete;

    await client.logout();

    // Signing out of this browser must not sign the user's phone out too.
    expect(del).not.toHaveBeenCalled();
  });
});
