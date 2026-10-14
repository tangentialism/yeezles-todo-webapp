import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const api = vi.hoisted(() => ({ listProposals: vi.fn(), getProposal: vi.fn(), applyProposal: vi.fn(), rejectProposal: vi.fn() }));
const broadcast = vi.hoisted(() => vi.fn());
vi.mock('../useApi', () => ({ useApi: () => api }));
vi.mock('../useCrossTabSync', () => ({ useCrossTabSync: () => ({ broadcast }) }));

import { proposalKeys, usePendingProposals, useProposal, useProposalActions } from '../useProposalStore';

const setup = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: 3 } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, wrapper };
};

describe('useProposalStore', () => {
  beforeEach(() => vi.clearAllMocks());

  it('usePendingProposals lists pending proposals', async () => {
    api.listProposals.mockResolvedValue([{ id: 7 }]);
    const { wrapper, client } = setup();
    const { result } = renderHook(() => usePendingProposals(), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual([{ id: 7 }]));
    expect(api.listProposals).toHaveBeenCalledWith('pending');
    expect(client.getQueryData(proposalKeys.pending)).toEqual([{ id: 7 }]);
  });

  it('useProposal fetches once and is idle without an id', async () => {
    api.getProposal.mockResolvedValue({ proposal: { id: 7 } });
    const { wrapper } = setup();
    renderHook(() => useProposal(null), { wrapper });
    expect(api.getProposal).not.toHaveBeenCalled();
    const { result } = renderHook(() => useProposal(7), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual({ proposal: { id: 7 } }));
  });

  it('useProposal does not keep a resolved proposal around after the visit (gcTime 0)', async () => {
    api.getProposal.mockResolvedValue({ proposal: { id: 7 } });
    const { wrapper, client } = setup();
    const { result } = renderHook(() => useProposal(7), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(client.getQueryCache().find({ queryKey: proposalKeys.one(7) })?.gcTime).toBe(0);
  });

  it('apply refreshes proposals, topics and todos, and broadcasts', async () => {
    api.applyProposal.mockResolvedValue({ proposal: { id: 7 }, created_topics: [] });
    const { wrapper, client } = setup();
    const spy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useProposalActions(), { wrapper });
    await act(async () => {
      await result.current.applyProposal(7, { area_id: 2, new_topics: [], assignments: [], note_edits: [] });
    });
    for (const key of [['proposals'], ['proposal', 7], ['topics'], ['topic'], ['topicTodos'], ['todos'], ['todayView']]) {
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: key }));
    }
    expect(broadcast).toHaveBeenCalledWith('PROPOSAL_RESOLVED', expect.objectContaining({ id: 7 }));
  });

  it('markResolvedElsewhere refreshes the pending list (final review M2)', () => {
    const { wrapper, client } = setup();
    const spy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useProposalActions(), { wrapper });
    act(() => {
      void result.current.markResolvedElsewhere();
    });
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['proposals'] }));
  });

  it('a rejected apply is called once (no retry) and rejects', async () => {
    api.applyProposal.mockRejectedValue(new Error('boom'));
    const { wrapper } = setup();
    const { result } = renderHook(() => useProposalActions(), { wrapper });
    await expect(result.current.applyProposal(7, { area_id: 2, new_topics: [], assignments: [], note_edits: [] })).rejects.toThrow('boom');
    expect(api.applyProposal).toHaveBeenCalledTimes(1);
  });

  it('a rejected reject is called once (no retry) and rejects', async () => {
    api.rejectProposal.mockRejectedValue(new Error('boom'));
    const { wrapper } = setup();
    const { result } = renderHook(() => useProposalActions(), { wrapper });
    await expect(result.current.rejectProposal(7)).rejects.toThrow('boom');
    expect(api.rejectProposal).toHaveBeenCalledTimes(1);
  });
});
