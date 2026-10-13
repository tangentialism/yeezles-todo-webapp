import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAreaOpenCounts, useTodayOpenCount } from '../useNavCounts';
import { todayViewQueryKey } from '../useTodayViewStore';
import type { TodayView, Todo } from '../../types/todo';

const getAreas = vi.fn();
vi.mock('../useApi', () => ({ useApi: () => ({ getAreas }) }));

const todo = (id: number, completed = false) => ({ id, completed }) as Todo;

const today = (overrides: Partial<TodayView['focus']> = {}): TodayView => ({
  focus: { today_tagged: [], due_today: [], overdue: [], total_today: 0, total_focus: 0, ...overrides },
  upcoming: { coming_soon: [todo(99)], total_coming_soon: 1 },
  summary: { total_today_items: 0, total_overdue: 0, total_coming_soon: 1, total_focus_items: 0, needs_attention: false },
});

const setup = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
};

describe('useTodayOpenCount', () => {
  it('is null until the Today view has loaded, and never fetches itself', () => {
    const { wrapper, client } = setup();
    const { result } = renderHook(() => useTodayOpenCount(), { wrapper });

    expect(result.current).toBeNull();
    expect(client.getQueryState(todayViewQueryKey(true, undefined))?.fetchStatus).not.toBe('fetching');
  });

  it('counts open focus todos once each from the shared Today cache', async () => {
    const { wrapper, client } = setup();
    const { result } = renderHook(() => useTodayOpenCount(), { wrapper });

    client.setQueryData(
      todayViewQueryKey(true, undefined),
      today({ overdue: [todo(1)], due_today: [todo(2), todo(1)], today_tagged: [todo(3, true), todo(4)] })
    );

    await waitFor(() => expect(result.current).toBe(3));
  });
});

describe('useAreaOpenCounts', () => {
  beforeEach(() => getAreas.mockReset());

  it('maps pending_todos per area and sums them', async () => {
    getAreas.mockResolvedValue({
      success: true,
      data: [
        { id: 1, name: 'Work', stats: { pending_todos: 5 } },
        { id: 2, name: 'Home', stats: { pending_todos: 2 } },
      ],
    });
    const { wrapper } = setup();
    const { result } = renderHook(() => useAreaOpenCounts(), { wrapper });

    await waitFor(() => expect(result.current).not.toBeNull());
    expect(getAreas).toHaveBeenCalledWith(true);
    expect(result.current?.byArea.get(1)).toBe(5);
    expect(result.current?.byArea.get(2)).toBe(2);
    expect(result.current?.total).toBe(7);
  });

  it('is null when the API returns areas without stats', async () => {
    getAreas.mockResolvedValue({ success: true, data: { areas: [{ id: 1, name: 'Work' }] } });
    const { wrapper } = setup();
    const { result } = renderHook(() => useAreaOpenCounts(), { wrapper });

    await waitFor(() => expect(getAreas).toHaveBeenCalled());
    expect(result.current).toBeNull();
  });
});
