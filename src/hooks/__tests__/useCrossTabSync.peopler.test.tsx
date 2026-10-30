import { describe, it, expect, vi, beforeEach } from 'vitest';
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

describe('useCrossTabSync: peopler', () => {
  let stamp = 0;
  beforeEach(() => {
    vi.stubGlobal('BroadcastChannel', FakeChannel);
  });

  const setup = () => {
    const client = new QueryClient();
    const spy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useCrossTabSync(), {
      wrapper: ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
    });
    // A fresh timestamp each time, so the once-per-tab dedupe never swallows a delivery
    const deliver = (type: SyncMessage['type'], sourceTabId = 'other-tab') =>
      FakeChannel.last!.onmessage!({ data: { type, data: { id: 1, timestamp: ++stamp }, sourceTabId } } as MessageEvent<SyncMessage>);
    return { client, spy, deliver, tabId: result.current.tabId };
  };

  const expectActive = (spy: ReturnType<typeof setup>['spy'], keys: string[]) => {
    for (const key of keys) {
      expect(spy).toHaveBeenCalledWith({ queryKey: [key], refetchType: 'active' });
    }
  };

  it('PEOPLER_CONNECTION_CHANGED from another tab refreshes the connection, people, todo and topic views', () => {
    const { spy, deliver } = setup();
    deliver('PEOPLER_CONNECTION_CHANGED');
    expectActive(spy, ['peoplerConnection', 'people', 'person', 'personTodos', 'todos', 'todayView', 'topicTodos', 'topics']);
  });

  it('PEOPLER_CONNECTION_CHANGED from another tab drops cached Peopler searches', () => {
    const { client, deliver } = setup();
    client.setQueryData(['peoplerSearch', 'Avery'], [{ id: 1 }]);
    deliver('PEOPLER_CONNECTION_CHANGED');
    expect(client.getQueryCache().findAll({ queryKey: ['peoplerSearch'] })).toHaveLength(0);
  });

  it('a PEOPLER_CONNECTION_CHANGED from this tab is ignored', () => {
    const { spy, deliver, tabId } = setup();
    deliver('PEOPLER_CONNECTION_CHANGED', tabId);
    expect(spy).not.toHaveBeenCalled();
  });
});
