import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTodoSearch, todoSearchKey, SEARCH_RESULT_LIMIT } from '../useTodoSearch';
import { SEARCH_DEBOUNCE_MS } from '../useDebouncedValue';
import type { Todo } from '../../types/todo';

const getTodos = vi.fn();
vi.mock('../useApi', () => ({ useApi: () => ({ getTodos }) }));

const makeWrapper = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
};

// The pop-up opens with an empty box, so tests start blank and then type.
const typing = (initial: string, typed: string) => {
  const hook = renderHook(({ q }) => useTodoSearch(q), { wrapper: makeWrapper(), initialProps: { q: initial } });
  hook.rerender({ q: typed });
  return hook;
};

const todo = (id: number, title: string) => ({ id, title }) as Todo;

describe('useTodoSearch', () => {
  beforeEach(() => {
    getTodos.mockReset();
    getTodos.mockResolvedValue({ success: true, data: [todo(1, 'Budget review')] });
  });

  it('exposes the key and limit', () => {
    expect(todoSearchKey('budg')).toEqual(['todoSearch', 'budg']);
    expect(SEARCH_RESULT_LIMIT).toBe(30);
  });

  it('searches all areas, open and done, by relevance, with the trimmed debounced query', async () => {
    const { result } = typing('', '  budg ');

    expect(getTodos).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.results).toHaveLength(1), { timeout: SEARCH_DEBOUNCE_MS + 1500 });

    expect(getTodos).toHaveBeenCalledTimes(1);
    expect(getTodos).toHaveBeenCalledWith({ search: 'budg', completed: 'all', sort_by: 'relevance', limit: 30 });
    expect(result.current.query).toBe('budg');
  });

  it('never calls the API for a blank query', async () => {
    const { result } = typing('', '   ');

    await new Promise((r) => setTimeout(r, SEARCH_DEBOUNCE_MS + 100));

    expect(getTodos).not.toHaveBeenCalled();
    expect(result.current.results).toEqual([]);
    expect(result.current.query).toBe('');
  });

  it('surfaces a failed response as an error', async () => {
    getTodos.mockResolvedValue({ success: false, data: [], message: 'boom' });
    const { result } = typing('', 'x');

    await waitFor(() => expect(result.current.error?.message).toBe('boom'), { timeout: SEARCH_DEBOUNCE_MS + 1500 });
  });

  it('refetches when the same query is searched again after a remount', async () => {
    // Mirror the app-wide defaults (App.tsx): a 5 minute staleTime must not serve stale rows.
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 5 * 60 * 1000 } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const first = renderHook(({ q }) => useTodoSearch(q), { wrapper, initialProps: { q: '' } });
    first.rerender({ q: 'budg' });
    await waitFor(() => expect(first.result.current.results).toHaveLength(1), { timeout: SEARCH_DEBOUNCE_MS + 1500 });
    first.unmount();

    const second = renderHook(({ q }) => useTodoSearch(q), { wrapper, initialProps: { q: '' } });
    second.rerender({ q: 'budg' });
    await waitFor(() => expect(getTodos).toHaveBeenCalledTimes(2), { timeout: SEARCH_DEBOUNCE_MS + 1500 });
  });
});
