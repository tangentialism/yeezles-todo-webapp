import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '../../services/apiError';
import { makePerson } from '../../test/personFactories';

const api = vi.hoisted(() => ({
  getPeople: vi.fn(),
  getPerson: vi.fn(),
  getTodos: vi.fn(),
  createPerson: vi.fn(),
  updatePerson: vi.fn(),
  deletePerson: vi.fn(),
  mergePerson: vi.fn(),
}));
const broadcast = vi.hoisted(() => vi.fn());
vi.mock('../useApi', () => ({ useApi: () => api }));
vi.mock('../useCrossTabSync', () => ({ useCrossTabSync: () => ({ broadcast }) }));

import { usePeople, usePeopleMutations, usePerson, usePersonTodos } from '../usePeopleStore';
import { personKeys } from '../peopleInvalidation';

const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
const wrapperFor = (client: QueryClient) =>
  ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

const mutate = async (fn: () => Promise<unknown>) => {
  await act(async () => {
    await fn();
  });
};

const keysOf = (spy: { mock: { calls: unknown[][] } }) =>
  spy.mock.calls.map((c) => JSON.stringify((c[0] as { queryKey: unknown }).queryKey));

describe('usePeopleStore queries', () => {
  beforeEach(() => vi.clearAllMocks());

  it('usePeople keys by { q, limit } and passes them to the client', async () => {
    api.getPeople.mockResolvedValue([makePerson({ id: 1 })]);
    const client = makeClient();
    const { result } = renderHook(() => usePeople({ q: 'pri', limit: 8 }), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(api.getPeople).toHaveBeenCalledWith({ q: 'pri', limit: 8 });
    expect(client.getQueryData(personKeys.list('pri', 8))).toHaveLength(1);
  });

  it('usePeople defaults to q "" and limit 100, and stays idle when disabled', async () => {
    api.getPeople.mockResolvedValue([]);
    const client = makeClient();
    const { result } = renderHook(() => usePeople(), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.getPeople).toHaveBeenCalledWith({ q: '', limit: 100 });
    api.getPeople.mockClear();
    renderHook(() => usePeople({ q: 'x', enabled: false }), { wrapper: wrapperFor(makeClient()) });
    expect(api.getPeople).not.toHaveBeenCalled();
  });

  it('usePerson fetches one person and is idle for null', async () => {
    api.getPerson.mockResolvedValue(makePerson({ id: 4 }));
    const { result } = renderHook(() => usePerson(4), { wrapper: wrapperFor(makeClient()) });
    await waitFor(() => expect(result.current.data?.id).toBe(4));
    expect(api.getPerson).toHaveBeenCalledWith(4);
    api.getPerson.mockClear();
    renderHook(() => usePerson(null), { wrapper: wrapperFor(makeClient()) });
    expect(api.getPerson).not.toHaveBeenCalled();
  });

  it('usePersonTodos asks for one person and one completion state, with no area', async () => {
    api.getTodos.mockResolvedValue({ success: true, data: [{ id: 9 }] });
    const { result } = renderHook(() => usePersonTodos(7, true), { wrapper: wrapperFor(makeClient()) });
    await waitFor(() => expect(result.current.data).toEqual([{ id: 9 }]));
    expect(api.getTodos).toHaveBeenCalledWith({ person_id: 7, completed: true });
  });

  it('usePersonTodos is idle without an id or when disabled', () => {
    renderHook(() => usePersonTodos(null, false), { wrapper: wrapperFor(makeClient()) });
    renderHook(() => usePersonTodos(7, true, false), { wrapper: wrapperFor(makeClient()) });
    expect(api.getTodos).not.toHaveBeenCalled();
  });
});

describe('usePeopleMutations', () => {
  beforeEach(() => vi.clearAllMocks());

  const setup = () => {
    const client = makeClient();
    const spy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => usePeopleMutations(), { wrapper: wrapperFor(client) });
    return { client, spy, result };
  };

  it('createPerson invalidates people views only, then broadcasts', async () => {
    api.createPerson.mockResolvedValue(makePerson({ id: 7 }));
    const { spy, result } = setup();
    await mutate(() => result.current.createPerson({ display_name: 'New' }));
    const keys = keysOf(spy);
    for (const k of ['["people"]', '["person"]', '["personTodos"]']) expect(keys).toContain(k);
    expect(keys).not.toContain('["todos"]');
    expect(broadcast).toHaveBeenCalledWith('PERSON_CREATED', expect.objectContaining({ id: 7 }));
  });

  it('a rename invalidates people, todo and topic views; an alias-only update leaves todos alone', async () => {
    api.updatePerson.mockResolvedValue(makePerson({ id: 7, display_name: 'Renamed' }));
    const { spy, result } = setup();
    await mutate(() => result.current.updatePerson(7, { display_name: 'Renamed' }));
    const keys = keysOf(spy);
    for (const k of ['["people"]', '["person"]', '["personTodos"]', '["todos"]', '["todayView"]', '["topicTodos"]']) {
      expect(keys).toContain(k);
    }
    expect(broadcast).toHaveBeenCalledWith('PERSON_UPDATED', expect.objectContaining({ id: 7 }));
    spy.mockClear();
    await mutate(() => result.current.updatePerson(7, { aliases: ['P'] }));
    const aliasKeys = keysOf(spy);
    expect(aliasKeys).toContain('["people"]');
    expect(aliasKeys).not.toContain('["todos"]');
    expect(aliasKeys).not.toContain('["topicTodos"]');
  });

  it('a link or unlink (peopler_id key, even null) also refreshes todo and topic views; a plain alias edit does not', async () => {
    api.updatePerson.mockResolvedValue(makePerson({ id: 3 }));
    for (const updates of [{ peopler_id: 7 }, { peopler_id: null }]) {
      const { spy, result } = setup();
      await mutate(() => result.current.updatePerson(3, updates));
      const keys = keysOf(spy);
      for (const k of ['["people"]', '["todos"]', '["todayView"]', '["topicTodos"]', '["topics"]']) expect(keys).toContain(k);
    }
    const { spy, result } = setup();
    await mutate(() => result.current.updatePerson(3, { aliases: ['P'] }));
    expect(keysOf(spy)).not.toContain('["todos"]');
    expect(keysOf(spy)).not.toContain('["topicTodos"]');
  });

  it('deletePerson invalidates people, todo and topic views and broadcasts the deleted id', async () => {
    api.deletePerson.mockResolvedValue(undefined);
    const { spy, result } = setup();
    await mutate(() => result.current.deletePerson(7));
    const keys = keysOf(spy);
    for (const k of ['["people"]', '["personTodos"]', '["todos"]', '["todayView"]', '["topicTodos"]']) expect(keys).toContain(k);
    expect(broadcast).toHaveBeenCalledWith('PERSON_DELETED', expect.objectContaining({ id: 7 }));
  });

  it('mergePerson invalidates everything, broadcasts the source id and drops the source from the cache', async () => {
    api.mergePerson.mockResolvedValue(makePerson({ id: 8 }));
    const { client, spy, result } = setup();
    client.setQueryData(personKeys.one(7), makePerson({ id: 7 }));
    await mutate(() => result.current.mergePerson(7, 8));
    expect(api.mergePerson).toHaveBeenCalledWith(7, 8);
    const keys = keysOf(spy);
    for (const k of ['["people"]', '["personTodos"]', '["todos"]', '["topicTodos"]']) expect(keys).toContain(k);
    expect(client.getQueryData(personKeys.one(7))).toBeUndefined();
    expect(broadcast).toHaveBeenCalledWith('PERSON_MERGED', expect.objectContaining({ id: 7 }));
  });

  it('a failed mutation rejects with the ApiError, broadcasts nothing and does not retry', async () => {
    api.updatePerson.mockRejectedValue(new ApiError('nope', 'VALIDATION_ERROR', 400));
    const { spy, result } = setup();
    await act(async () => {
      await expect(result.current.updatePerson(7, { display_name: '' })).rejects.toBeInstanceOf(ApiError);
    });
    expect(api.updatePerson).toHaveBeenCalledTimes(1);
    expect(broadcast).not.toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });
});
