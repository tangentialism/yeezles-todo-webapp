import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '../../services/apiError';

const api = vi.hoisted(() => ({
  getTopics: vi.fn(),
  getTopic: vi.fn(),
  getTodos: vi.fn(),
  createTopic: vi.fn(),
  updateTopic: vi.fn(),
  setTopicNote: vi.fn(),
  deleteTopic: vi.fn(),
}));
const broadcast = vi.hoisted(() => vi.fn());
vi.mock('../useApi', () => ({ useApi: () => api }));
vi.mock('../useCrossTabSync', () => ({ useCrossTabSync: () => ({ broadcast }) }));

import { topicKeys, useTopicMutations, useTopics, useTopicTodos } from '../useTopicStore';

const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
const wrapperFor = (client: QueryClient) =>
  ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

describe('useTopicStore', () => {
  beforeEach(() => vi.clearAllMocks());

  it('useTopics fetches with the area and archived flag under topicKeys.list', async () => {
    api.getTopics.mockResolvedValue([{ id: 1, name: 'A' }]);
    const client = makeClient();
    const { result } = renderHook(() => useTopics({ areaId: 2, includeArchived: true }), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(result.current.data).toEqual([{ id: 1, name: 'A' }]));
    expect(api.getTopics).toHaveBeenCalledWith({ areaId: 2, includeArchived: true });
    expect(client.getQueryData(topicKeys.list(2, true))).toEqual([{ id: 1, name: 'A' }]);
  });

  it('useTopicTodos asks for one topic and one completion state, with no area', async () => {
    api.getTodos.mockResolvedValue({ success: true, data: [{ id: 9 }] });
    const { result } = renderHook(() => useTopicTodos(3, true), { wrapper: wrapperFor(makeClient()) });
    await waitFor(() => expect(result.current.data).toEqual([{ id: 9 }]));
    expect(api.getTodos).toHaveBeenCalledWith({ topic_id: 3, completed: true });
  });

  it('useTopicTodos is idle without an id', () => {
    renderHook(() => useTopicTodos(null, false), { wrapper: wrapperFor(makeClient()) });
    expect(api.getTodos).not.toHaveBeenCalled();
  });

  it('createTopic invalidates topic lists and broadcasts', async () => {
    api.createTopic.mockResolvedValue({ id: 7, name: 'New' });
    const client = makeClient();
    const spy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useTopicMutations(), { wrapper: wrapperFor(client) });
    await act(async () => {
      await result.current.createTopic({ name: 'New', area_id: 2 });
    });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['topics'] });
    expect(broadcast).toHaveBeenCalledWith('TOPIC_CREATED', expect.objectContaining({ id: 7 }));
  });

  it('a rename and a delete also invalidate todo lists, because rows show the topic name', async () => {
    api.updateTopic.mockResolvedValue({ id: 7, name: 'Renamed' });
    api.deleteTopic.mockResolvedValue(undefined);
    const client = makeClient();
    const spy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useTopicMutations(), { wrapper: wrapperFor(client) });
    await act(async () => {
      await result.current.updateTopic(7, { name: 'Renamed' });
    });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['todos'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['todayView'] });
    spy.mockClear();
    await act(async () => {
      await result.current.updateTopic(7, { archived: true });
    });
    expect(spy).not.toHaveBeenCalledWith({ queryKey: ['todos'] });
    await act(async () => {
      await result.current.deleteTopic(7);
    });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['todos'] });
    expect(broadcast).toHaveBeenCalledWith('TOPIC_DELETED', expect.objectContaining({ id: 7 }));
  });

  it('setTopicNote writes the returned row into the cached topic', async () => {
    const client = makeClient();
    client.setQueryData(topicKeys.one(7), { id: 7, name: 'A', status_note: 'old', open_count: 2, done_count: 1 });
    api.setTopicNote.mockResolvedValue({ id: 7, name: 'A', status_note: 'new', status_note_updated_at: '2026-10-13T12:00:00.000Z' });
    const { result } = renderHook(() => useTopicMutations(), { wrapper: wrapperFor(client) });
    await act(async () => {
      await result.current.setTopicNote(7, 'new');
    });
    expect(client.getQueryData(topicKeys.one(7))).toMatchObject({ status_note: 'new', open_count: 2 });
  });

  it('mutations reject with the ApiError and do not retry', async () => {
    api.createTopic.mockRejectedValue(new ApiError(409, 'TOPIC_NAME_TAKEN', 'taken'));
    const client = new QueryClient({ defaultOptions: { mutations: { retry: 3 } } });
    const { result } = renderHook(() => useTopicMutations(), { wrapper: wrapperFor(client) });
    await expect(result.current.createTopic({ name: 'x', area_id: 1 })).rejects.toMatchObject({ code: 'TOPIC_NAME_TAKEN' });
    expect(api.createTopic).toHaveBeenCalledTimes(1);
  });
});
