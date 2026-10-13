import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCrossTabSync } from '../useCrossTabSync';
import type { SyncMessage } from '../../types/sync';

/**
 * A synchronous stand-in for BroadcastChannel: like the real one, a post
 * reaches every other open channel object with the same name, including
 * those in the same tab.
 */
class BusChannel {
  static open: BusChannel[] = [];
  onmessage: ((event: MessageEvent<SyncMessage>) => void) | null = null;
  constructor() { BusChannel.open.push(this); }
  postMessage(message: SyncMessage) {
    for (const channel of BusChannel.open) {
      if (channel !== this) channel.onmessage?.({ data: message } as MessageEvent<SyncMessage>);
    }
  }
  close() { BusChannel.open = BusChannel.open.filter((c) => c !== this); }
}

/** A message as another tab would post it. */
const fromOtherTab = (message: SyncMessage) => {
  for (const channel of BusChannel.open) channel.onmessage?.({ data: message } as MessageEvent<SyncMessage>);
};

describe('useCrossTabSync: several hook instances in one tab (B1)', () => {
  beforeEach(() => {
    BusChannel.open = [];
    vi.stubGlobal('BroadcastChannel', BusChannel);
  });

  const setup = () => {
    const client = new QueryClient();
    const spy = vi.spyOn(client, 'invalidateQueries');
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const a = renderHook(() => useCrossTabSync(), { wrapper });
    const b = renderHook(() => useCrossTabSync(), { wrapper });
    return { spy, a, b };
  };

  const todosInvalidations = (spy: ReturnType<typeof setup>['spy']) =>
    spy.mock.calls.filter(([filters]) => JSON.stringify(filters?.queryKey) === '["todos"]').length;

  it('shares one tab id across instances', () => {
    const { a, b } = setup();
    expect(a.result.current.tabId).toBe(b.result.current.tabId);
  });

  it('a local broadcast causes no invalidation in the same tab', () => {
    const { spy, a } = setup();
    a.result.current.broadcast('TODO_UPDATED', { id: 7, timestamp: 1000 });
    expect(spy).not.toHaveBeenCalled();
  });

  it('a message from another tab is handled once, not once per instance', () => {
    const { spy } = setup();
    fromOtherTab({ type: 'TODO_UPDATED', data: { id: 7, timestamp: 2000 }, sourceTabId: 'tab-elsewhere' });
    expect(todosInvalidations(spy)).toBe(1);
  });

  it('a second, different message from that tab is handled too', () => {
    const { spy } = setup();
    fromOtherTab({ type: 'TODO_UPDATED', data: { id: 7, timestamp: 3000 }, sourceTabId: 'tab-elsewhere' });
    fromOtherTab({ type: 'TODO_UPDATED', data: { id: 7, timestamp: 3001 }, sourceTabId: 'tab-elsewhere' });
    expect(todosInvalidations(spy)).toBe(2);
  });
});
