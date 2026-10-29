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

describe('useCrossTabSync: people', () => {
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
    return { spy, deliver, tabId: result.current.tabId };
  };

  const expectActive = (spy: ReturnType<typeof setup>['spy'], keys: string[]) => {
    for (const key of keys) {
      expect(spy).toHaveBeenCalledWith({ queryKey: [key], refetchType: 'active' });
    }
  };

  it('PERSON_UPDATED from another tab refreshes people, todo and topic views', () => {
    const { spy, deliver } = setup();
    deliver('PERSON_UPDATED');
    expectActive(spy, ['people', 'person', 'personTodos', 'todos', 'todayView', 'topicTodos', 'topics']);
  });

  it('PERSON_DELETED and PERSON_MERGED refresh the same views', () => {
    for (const type of ['PERSON_DELETED', 'PERSON_MERGED'] as const) {
      const { spy, deliver } = setup();
      deliver(type);
      expectActive(spy, ['people', 'personTodos', 'todos', 'topicTodos']);
    }
  });

  it('PERSON_CREATED refreshes people views only', () => {
    const { spy, deliver } = setup();
    deliver('PERSON_CREATED');
    expectActive(spy, ['people', 'person', 'personTodos']);
    expect(spy).not.toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['todos'] }));
    expect(spy).not.toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['topicTodos'] }));
  });

  it('a person message from this tab is ignored', () => {
    const { spy, deliver, tabId } = setup();
    deliver('PERSON_UPDATED', tabId);
    expect(spy).not.toHaveBeenCalled();
  });

  it('TODO_COMPLETED from another tab refreshes people counts and person todo lists', () => {
    const { spy, deliver } = setup();
    deliver('TODO_COMPLETED');
    expectActive(spy, ['people', 'personTodos']);
  });

  it('topic messages and PROPOSAL_RESOLVED from another tab also refresh people views', () => {
    for (const type of ['TOPIC_CREATED', 'TOPIC_UPDATED', 'TOPIC_DELETED', 'PROPOSAL_RESOLVED'] as const) {
      const { spy, deliver } = setup();
      deliver(type);
      expectActive(spy, ['people', 'person', 'personTodos']);
    }
  });
});
