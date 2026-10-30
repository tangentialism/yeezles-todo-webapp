import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { StrictMode } from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '../../services/apiError';
import { makePerson } from '../../test/personFactories';

const api = vi.hoisted(() => ({
  getPeoplerConnection: vi.fn(),
  connectPeopler: vi.fn(),
  disconnectPeopler: vi.fn(),
  searchPeopler: vi.fn(),
  checkPeoplerLink: vi.fn(),
}));
const broadcast = vi.hoisted(() => vi.fn());
const useToast = vi.hoisted(() => vi.fn(() => ({ showToast: vi.fn() })));
vi.mock('../useApi', () => ({ useApi: () => api }));
vi.mock('../useCrossTabSync', () => ({ useCrossTabSync: () => ({ broadcast }) }));
vi.mock('../../contexts/ToastContext', () => ({ useToast }));

import {
  usePeoplerCheckOnOpen,
  usePeoplerConnection,
  usePeoplerConnectionActions,
  usePeoplerSearch,
} from '../usePeoplerStore';
import { peoplerKeys } from '../peoplerInvalidation';
import { personKeys } from '../peopleInvalidation';

const TOKEN = 'pk_test_quill_9f3a7c1d';
const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
const wrapperFor = (client: QueryClient, strict = false) =>
  ({ children }: { children: React.ReactNode }) => {
    const tree = <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    return strict ? <StrictMode>{tree}</StrictMode> : tree;
  };
const keysOf = (spy: { mock: { calls: unknown[][] } }) =>
  spy.mock.calls.map((c) => JSON.stringify((c[0] as { queryKey: unknown }).queryKey));
const VIEWS = ['["people"]', '["person"]', '["personTodos"]', '["todos"]', '["todayView"]', '["topics"]', '["topic"]', '["topicTodos"]'];

const connected = {
  connected: true as const,
  status: 'ok' as const,
  peopler_email: 'quill@example.test',
  peopler_display_name: 'Avery Quill',
  peopler_account_id: 4,
  last_verified_at: '2026-10-30T00:00:00.000Z',
};

beforeEach(() => vi.clearAllMocks());

describe('usePeoplerConnection', () => {
  it('does not retry a 503 PEOPLER_UNAVAILABLE (Peopler not configured), calling the api once', async () => {
    api.getPeoplerConnection.mockRejectedValue(new ApiError(503, 'PEOPLER_UNAVAILABLE', 'not configured'));
    const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 1 } } });
    const { result } = renderHook(() => usePeoplerConnection(), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(api.getPeoplerConnection).toHaveBeenCalledTimes(1);
  });

  it('fetches the connection under peoplerKeys.connection', async () => {
    api.getPeoplerConnection.mockResolvedValue(connected);
    const client = makeClient();
    const { result } = renderHook(() => usePeoplerConnection(), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(result.current.data).toEqual(connected));
    expect(client.getQueryData(peoplerKeys.connection)).toEqual(connected);
  });
});

describe('usePeoplerConnectionActions', () => {
  const setup = () => {
    const client = makeClient();
    const spy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => usePeoplerConnectionActions(), { wrapper: wrapperFor(client) });
    return { client, spy, result };
  };

  it('connect writes the connection, refreshes views, broadcasts, and stores no token', async () => {
    api.connectPeopler.mockResolvedValue(connected);
    const { client, spy, result } = setup();
    let returned: unknown;
    await act(async () => {
      returned = await result.current.connect(TOKEN);
    });
    expect(api.connectPeopler).toHaveBeenCalledWith(TOKEN);
    expect(returned).toEqual(connected);
    expect(client.getQueryData(peoplerKeys.connection)).toEqual(connected);
    for (const k of VIEWS) expect(keysOf(spy)).toContain(k);
    expect(broadcast).toHaveBeenCalledWith('PEOPLER_CONNECTION_CHANGED', { id: 0, timestamp: expect.any(Number) });
    expect(JSON.stringify(broadcast.mock.calls)).not.toContain(TOKEN);
    expect(JSON.stringify(client.getQueryCache().getAll().map((q) => [q.queryKey, q.state.data]))).not.toContain(TOKEN);
    expect(JSON.stringify(client.getMutationCache().getAll().map((m) => [m.options.mutationKey, m.state.variables]))).not.toContain(TOKEN);
    expect(client.getMutationCache().getAll()).toHaveLength(0);
    expect(result.current.isConnecting).toBe(false);
  });

  it('a rejected connect rethrows the ApiError, broadcasts nothing and leaves the cache alone', async () => {
    const error = new ApiError(422, 'PEOPLER_TOKEN_REJECTED', 'rejected');
    api.connectPeopler.mockRejectedValue(error);
    const { client, spy, result } = setup();
    client.setQueryData(peoplerKeys.connection, { connected: false });
    await act(async () => {
      await expect(result.current.connect(TOKEN)).rejects.toBe(error);
    });
    expect(broadcast).not.toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
    expect(client.getQueryData(peoplerKeys.connection)).toEqual({ connected: false });
    expect(result.current.isConnecting).toBe(false);
  });

  it('disconnect sets connected false, refreshes views and broadcasts', async () => {
    api.disconnectPeopler.mockResolvedValue(undefined);
    const { client, spy, result } = setup();
    client.setQueryData(peoplerKeys.connection, connected);
    await act(async () => {
      await result.current.disconnect();
    });
    expect(api.disconnectPeopler).toHaveBeenCalledTimes(1);
    expect(client.getQueryData(peoplerKeys.connection)).toEqual({ connected: false });
    for (const k of VIEWS) expect(keysOf(spy)).toContain(k);
    expect(broadcast).toHaveBeenCalledWith('PEOPLER_CONNECTION_CHANGED', { id: 0, timestamp: expect.any(Number) });
    expect(result.current.isDisconnecting).toBe(false);
  });

  it('connect and disconnect drop every cached Peopler search', async () => {
    api.connectPeopler.mockResolvedValue(connected);
    api.disconnectPeopler.mockResolvedValue(undefined);
    const { client, result } = setup();
    client.setQueryData(peoplerKeys.search('Avery'), [{ id: 1 }]);
    await act(async () => {
      await result.current.connect(TOKEN);
    });
    expect(client.getQueryCache().findAll({ queryKey: ['peoplerSearch'] })).toHaveLength(0);
    client.setQueryData(peoplerKeys.search('Blake'), [{ id: 2 }]);
    await act(async () => {
      await result.current.disconnect();
    });
    expect(client.getQueryCache().findAll({ queryKey: ['peoplerSearch'] })).toHaveLength(0);
  });
});

describe('usePeoplerSearch', () => {
  it('never calls the api for an empty or blank query', async () => {
    const client = makeClient();
    for (const q of ['', '  ']) {
      const { result } = renderHook(() => usePeoplerSearch(q), { wrapper: wrapperFor(client) });
      expect(result.current.fetchStatus).toBe('idle');
    }
    expect(api.searchPeopler).not.toHaveBeenCalled();
  });

  it('searches once for a real query, keyed by peoplerKeys.search', async () => {
    api.searchPeopler.mockResolvedValue([{ id: 1, display_name: 'Avery Quill' }]);
    const client = makeClient();
    const { result } = renderHook(() => usePeoplerSearch('Avery'), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(api.searchPeopler).toHaveBeenCalledTimes(1);
    expect(api.searchPeopler).toHaveBeenCalledWith('Avery');
    expect(client.getQueryData(peoplerKeys.search('Avery'))).toHaveLength(1);
  });

  it('never serves a cached search as fresh: staleTime 0 and a short gcTime', async () => {
    api.searchPeopler.mockResolvedValue([]);
    const client = makeClient();
    renderHook(() => usePeoplerSearch('Avery'), { wrapper: wrapperFor(client) });
    const query = client.getQueryCache().find({ queryKey: peoplerKeys.search('Avery') })!;
    const options = query.observers[0].options;
    expect(options.staleTime).toBe(0);
    expect(options.gcTime).toBeLessThanOrEqual(60_000);
  });

  it('does not retry a 4xx, but retries a 5xx', async () => {
    const client = new QueryClient();
    const { retryUnlessClientError } = await import('../../services/apiError');
    api.searchPeopler.mockRejectedValue(new ApiError(400, 'PEOPLER_NOT_CONNECTED', 'no'));
    const { result } = renderHook(() => usePeoplerSearch('Avery'), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(api.searchPeopler).toHaveBeenCalledTimes(1);
    const retry = client.getQueryCache().find({ queryKey: peoplerKeys.search('Avery') })!.options.retry;
    expect(retry).toBe(retryUnlessClientError);
  });
});

describe('usePeoplerCheckOnOpen', () => {
  const stalePerson = makePerson({ id: 5, peopler_id: 11, peopler_link: 'stale', open_count: 2, done_count: 3 });
  const setup = (person: ReturnType<typeof makePerson> | undefined, opts: { strict?: boolean } = {}) => {
    const client = makeClient();
    if (person) client.setQueryData(personKeys.one(person.id), person);
    const spy = vi.spyOn(client, 'invalidateQueries');
    const hook = renderHook(({ p }) => usePeoplerCheckOnOpen(p), {
      initialProps: { p: person },
      wrapper: wrapperFor(client, opts.strict),
    });
    return { client, spy, ...hook };
  };

  it('writes the result, refreshes views and broadcasts when the link fields changed', async () => {
    api.checkPeoplerLink.mockResolvedValue({ ...stalePerson, peopler_id: 12, peopler_link: 'ok', peopler_url: 'https://p.example.test/12' });
    const { client, spy } = setup(stalePerson);
    await waitFor(() => expect(client.getQueryData<typeof stalePerson>(personKeys.one(5))?.peopler_id).toBe(12));
    expect(api.checkPeoplerLink).toHaveBeenCalledWith(5);
    for (const k of VIEWS) expect(keysOf(spy)).toContain(k);
    expect(broadcast).toHaveBeenCalledWith('PERSON_UPDATED', expect.objectContaining({ id: 5 }));
  });

  it('merges over the cached counts when the result has none', async () => {
    const { open_count: _o, done_count: _d, ...bare } = { ...stalePerson, peopler_link: 'ok' as const };
    void _o; void _d;
    api.checkPeoplerLink.mockResolvedValue(bare);
    const { client } = setup(stalePerson);
    await waitFor(() => expect(client.getQueryData<typeof stalePerson>(personKeys.one(5))?.peopler_link).toBe('ok'));
    expect(client.getQueryData<typeof stalePerson>(personKeys.one(5))).toMatchObject({ open_count: 2, done_count: 3 });
  });

  it('writes the cache but does not invalidate or broadcast when the link is unchanged', async () => {
    api.checkPeoplerLink.mockResolvedValue({ ...stalePerson, updated_at: '2026-10-31T00:00:00.000Z' });
    const { client, spy } = setup(stalePerson);
    await waitFor(() => expect(client.getQueryData<typeof stalePerson>(personKeys.one(5))?.updated_at).toBe('2026-10-31T00:00:00.000Z'));
    expect(spy).not.toHaveBeenCalled();
    expect(broadcast).not.toHaveBeenCalled();
  });

  it('runs once per mounted instance: rerenders, a refetched object and StrictMode do not repeat it', async () => {
    api.checkPeoplerLink.mockResolvedValue({ ...stalePerson });
    const { rerender } = setup(stalePerson, { strict: true });
    await waitFor(() => expect(api.checkPeoplerLink).toHaveBeenCalledTimes(1));
    rerender({ p: { ...stalePerson } });
    rerender({ p: { ...stalePerson, open_count: 9 } });
    await act(async () => {});
    expect(api.checkPeoplerLink).toHaveBeenCalledTimes(1);
  });

  it('checks again for a different person id', async () => {
    api.checkPeoplerLink.mockImplementation(async (id: number) => makePerson({ id, peopler_id: 11, peopler_link: 'stale' }));
    const other = makePerson({ id: 6, peopler_id: 12, peopler_link: 'ok' });
    const { rerender } = setup(stalePerson);
    await waitFor(() => expect(api.checkPeoplerLink).toHaveBeenCalledTimes(1));
    rerender({ p: other });
    await waitFor(() => expect(api.checkPeoplerLink).toHaveBeenCalledTimes(2));
    expect(api.checkPeoplerLink).toHaveBeenLastCalledWith(6);
  });

  it('writes under the result own id', async () => {
    api.checkPeoplerLink.mockResolvedValue({ ...stalePerson, id: 99, display_name: 'Tomas Brandt' });
    const { client } = setup(stalePerson);
    await waitFor(() => expect(client.getQueryData(personKeys.one(99))).toBeDefined());
  });

  it('is never called for peopler_link none or an undefined person', async () => {
    setup(makePerson({ id: 1, peopler_link: 'none' }));
    setup(undefined);
    await act(async () => {});
    expect(api.checkPeoplerLink).not.toHaveBeenCalled();
  });

  it('swallows a rejection: no toast, no cache change, no invalidation', async () => {
    api.checkPeoplerLink.mockRejectedValue(new ApiError(502, 'PEOPLER_UNAVAILABLE', 'down'));
    const { client, spy } = setup(stalePerson);
    await waitFor(() => expect(api.checkPeoplerLink).toHaveBeenCalledTimes(1));
    await act(async () => {});
    expect(client.getQueryData(personKeys.one(5))).toEqual(stalePerson);
    expect(spy).not.toHaveBeenCalled();
    expect(broadcast).not.toHaveBeenCalled();
    expect(useToast).not.toHaveBeenCalled();
  });

  it('a dormant result while the cached connection is ok also refreshes the connection', async () => {
    api.checkPeoplerLink.mockResolvedValue({ ...stalePerson, peopler_link: 'dormant' });
    const { client, spy } = (() => {
      const client = makeClient();
      client.setQueryData(personKeys.one(5), stalePerson);
      client.setQueryData(peoplerKeys.connection, connected);
      const spy = vi.spyOn(client, 'invalidateQueries');
      renderHook(() => usePeoplerCheckOnOpen(stalePerson), { wrapper: wrapperFor(client) });
      return { client, spy };
    })();
    await waitFor(() => expect(keysOf(spy)).toContain('["peoplerConnection"]'));
    expect(client.getQueryData<typeof stalePerson>(personKeys.one(5))?.peopler_link).toBe('dormant');
  });
});
