import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listPasskeys, deletePasskey } from '../passkeyApi';

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
});
