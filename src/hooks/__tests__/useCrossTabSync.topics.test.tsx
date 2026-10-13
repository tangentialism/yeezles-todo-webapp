import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCrossTabSync } from '../useCrossTabSync';
import type { SyncMessage } from '../../types/sync';

/** Captures the channel the hook opens so the test can deliver a message to it. */
class FakeChannel {
  static last: FakeChannel | null = null;
  onmessage: ((event: MessageEvent<SyncMessage>) => void) | null = null;
  constructor() { FakeChannel.last = this; }
  postMessage() {}
  close() {}
}

describe('useCrossTabSync: topics', () => {
  beforeEach(() => {
    vi.stubGlobal('BroadcastChannel', FakeChannel);
  });

  const setup = () => {
    const client = new QueryClient();
    const spy = vi.spyOn(client, 'invalidateQueries');
    renderHook(() => useCrossTabSync(), {
      wrapper: ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
    });
    const deliver = (type: SyncMessage['type']) =>
      FakeChannel.last!.onmessage!({ data: { type, data: { id: 1, timestamp: 1 }, sourceTabId: 'other-tab' } } as MessageEvent<SyncMessage>);
    return { spy, deliver };
  };

  it('a topic message refreshes topics, topic todos and todo lists', () => {
    const { spy, deliver } = setup();
    deliver('TOPIC_UPDATED');
    for (const key of ['topics', 'topic', 'topicTodos', 'todos', 'todayView']) {
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: [key] }));
    }
  });

  it('a todo message also refreshes topic counts and topic todo lists', () => {
    const { spy, deliver } = setup();
    deliver('TODO_UPDATED');
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['topics'] }));
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['topic'] }));
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['topicTodos'] }));
  });
});
