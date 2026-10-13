import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { SyncMessage, SyncMessageType, SyncMessageData } from '../types/sync';
import { SYNC_CHANNEL_NAME, generateTabId } from '../types/sync';
import { logger } from '../utils/logger';
import { invalidateTodoViews, invalidateTopicViews } from './topicInvalidation';

/**
 * One id for the whole tab. Every store hook calls useCrossTabSync, and a
 * BroadcastChannel post reaches every other channel object of the same name,
 * including those in this tab, so a per-instance id let each instance in the
 * posting tab handle its own tab's message (the B1 refetch storm).
 */
const TAB_ID = generateTabId();

/**
 * The last message this tab handled. Each hook instance in a receiving tab
 * gets its own copy of a message; only the first one acts on it.
 */
let lastHandledKey = '';

/**
 * Cross-tab synchronization hook using Broadcast Channel API
 * 
 * This hook enables real-time state synchronization between multiple browser tabs
 * by broadcasting mutations and listening for changes from other tabs.
 * 
 * @example
 * ```typescript
 * const { broadcast } = useCrossTabSync();
 * 
 * // After a successful mutation:
 * broadcast('TODO_CREATED', { id: newTodo.id, timestamp: Date.now() });
 * ```
 */
export const useCrossTabSync = () => {
  const queryClient = useQueryClient();
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    // Check if BroadcastChannel is supported
    if (typeof BroadcastChannel === 'undefined') {
      logger.warn('BroadcastChannel API not supported in this browser. Cross-tab sync disabled.');
      return;
    }

    // Create broadcast channel
    const channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
    channelRef.current = channel;

    // Listen for messages from other tabs
    channel.onmessage = (event: MessageEvent<SyncMessage>) => {
      const message = event.data;

      // Ignore messages from the same tab (prevent self-updates)
      if (message.sourceTabId === TAB_ID) {
        return;
      }

      // Handle each message once per tab, not once per hook instance
      const key = `${message.sourceTabId}:${message.type}:${message.data?.id}:${message.data?.timestamp}`;
      if (key === lastHandledKey) {
        return;
      }
      lastHandledKey = key;

      // Handle different message types
      switch (message.type) {
        case 'TODO_CREATED':
        case 'TODO_UPDATED':
        case 'TODO_DELETED':
        case 'TODO_COMPLETED':
        case 'TODO_MOVED_TO_TODAY':
        case 'TODO_REMOVED_FROM_TODAY':
          // Todo lists, today view, and (counts move with every todo) topic views
          invalidateTodoViews(queryClient, { refetchType: 'active' });
          invalidateTopicViews(queryClient, { refetchType: 'active' });
          break;

        case 'AREA_CREATED':
        case 'AREA_UPDATED':
        case 'AREA_DELETED':
          // Invalidate areas cache
          queryClient.invalidateQueries({ 
            queryKey: ['areas'],
            refetchType: 'active'
          });
          break;

        case 'TOPIC_CREATED':
        case 'TOPIC_UPDATED':
        case 'TOPIC_DELETED':
          // Rows show topic names, so todo lists refetch too
          invalidateTopicViews(queryClient, { refetchType: 'active' });
          invalidateTodoViews(queryClient, { refetchType: 'active' });
          break;

        case 'PROPOSAL_RESOLVED':
          // Another tab applied or rejected a proposal: an open review here turns read-only
          for (const key of ['proposals', 'proposal']) {
            queryClient.invalidateQueries({ queryKey: [key], refetchType: 'active' });
          }
          invalidateTopicViews(queryClient, { refetchType: 'active' });
          invalidateTodoViews(queryClient, { refetchType: 'active' });
          break;

        default:
          logger.warn('Unknown sync message type:', message.type);
      }
    };

    // Cleanup on unmount
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [queryClient]);

  /**
   * Broadcast a state change to other tabs
   * 
   * @param type - Type of change (e.g., 'TODO_CREATED')
   * @param data - Message payload with id and timestamp
   */
  const broadcast = useCallback((type: SyncMessageType, data: SyncMessageData) => {
    // Check if channel is available
    if (!channelRef.current) {
      logger.warn('BroadcastChannel not initialized. Message not sent:', type);
      return;
    }

    const message: SyncMessage = {
      type,
      data,
      sourceTabId: TAB_ID,
    };

    try {
      channelRef.current.postMessage(message);
    } catch (error) {
      logger.error('Failed to broadcast message:', error);
    }
  }, []);

  return {
    broadcast,
    // Expose tabId for testing purposes (not used in production code)
    tabId: TAB_ID,
  };
};

export default useCrossTabSync;




