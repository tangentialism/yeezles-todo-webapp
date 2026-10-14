import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCrossTabSync } from '../useCrossTabSync';
import type { SyncMessage } from '../../types/sync';

class FakeChannel {
  static last: FakeChannel | null = null;
  onmessage: ((event: MessageEvent<SyncMessage>) => void) | null = null;
  constructor() { FakeChannel.last = this; }
  postMessage() {}
  close() {}
}

describe('useCrossTabSync: proposals', () => {
  it('PROPOSAL_RESOLVED refreshes proposals, the open proposal, topics and todos', () => {
    vi.stubGlobal('BroadcastChannel', FakeChannel);
    const client = new QueryClient();
    const spy = vi.spyOn(client, 'invalidateQueries');
    renderHook(() => useCrossTabSync(), {
      wrapper: ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
    });
    FakeChannel.last!.onmessage!({ data: { type: 'PROPOSAL_RESOLVED', data: { id: 7, timestamp: 1 }, sourceTabId: 'other' } } as MessageEvent<SyncMessage>);
    for (const key of ['proposals', 'proposal', 'topics', 'topic', 'topicTodos', 'todos', 'todayView']) {
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: [key], refetchType: 'active' }));
    }
  });
});
