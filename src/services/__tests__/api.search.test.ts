import { describe, it, expect, vi, beforeEach } from 'vitest';

const http = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
}));
vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>();
  return { ...actual, default: { ...actual.default, create: () => http } };
});

import { createAuthenticatedApiClient } from '../api';

describe('getTodos search options', () => {
  const client = createAuthenticatedApiClient(() => 'token', vi.fn());

  beforeEach(() => {
    http.get.mockReset();
    http.get.mockResolvedValue({ data: { success: true, data: [] } });
  });

  it("puts completed=all in the URL", async () => {
    await client.getTodos({ completed: 'all' });
    expect(http.get).toHaveBeenCalledWith('/todos?completed=all');
  });

  it('still serialises boolean completed values', async () => {
    await client.getTodos({ completed: false });
    expect(http.get).toHaveBeenCalledWith('/todos?completed=false');
  });

  it('sends sort_by=relevance with the search term', async () => {
    await client.getTodos({ search: 'budg', completed: 'all', sort_by: 'relevance', limit: 30 });
    expect(http.get).toHaveBeenCalledWith('/todos?completed=all&search=budg&sort_by=relevance&limit=30');
  });
});
