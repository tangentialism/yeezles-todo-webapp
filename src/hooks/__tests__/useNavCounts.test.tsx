import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { useAreaOpenCounts, usePendingProposalCount, useTodayOpenCount } from '../useNavCounts';
import { todayViewQueryKey } from '../useTodayViewStore';
import * as ProposalStore from '../useProposalStore';
import type { TodayView, Todo } from '../../types/todo';

const getAreas = vi.fn();
const getTodayView = vi.fn();
vi.mock('../useApi', () => ({ useApi: () => ({ getAreas, getTodayView }) }));
vi.mock('../useProposalStore');

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

  // B2: the count observer shares the Today view's query. Its options are
  // written to that query after the view's (effects run in order), so an
  // invalidation refetch must still find a real queryFn there.
  it('lets an invalidation refetch the Today view without a missing-queryFn error', async () => {
    getTodayView.mockReset();
    getTodayView.mockResolvedValue({ success: true, data: today({ overdue: [todo(1)] }) });
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { wrapper, client } = setup();
    const { result } = renderHook(
      () => {
        // Stand-in for TodayView's own observer, mounted first
        useQuery({
          queryKey: todayViewQueryKey(true, undefined),
          queryFn: async () => (await getTodayView(true, undefined)).data as TodayView,
        });
        return useTodayOpenCount();
      },
      { wrapper }
    );
    await waitFor(() => expect(result.current).toBe(1));
    expect(getTodayView).toHaveBeenCalledTimes(1);

    await act(async () => {
      await client.invalidateQueries({ queryKey: ['todayView'] });
    });

    expect(getTodayView).toHaveBeenCalledTimes(2);
    expect(client.getQueryState(todayViewQueryKey(true, undefined))?.status).toBe('success');
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
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

describe('usePendingProposalCount', () => {
  const pending = (data: unknown) =>
    vi.mocked(ProposalStore.usePendingProposals).mockReturnValue({ data } as unknown as ReturnType<typeof ProposalStore.usePendingProposals>);

  it('is null while the pending list is unknown, so the badge stays hidden', () => {
    pending(undefined);
    const { result } = renderHook(() => usePendingProposalCount());
    expect(result.current).toBeNull();
  });

  it('counts pending proposals across all areas', () => {
    pending([{ id: 1 }, { id: 2 }]);
    const { result } = renderHook(() => usePendingProposalCount());
    expect(result.current).toBe(2);
  });
});
