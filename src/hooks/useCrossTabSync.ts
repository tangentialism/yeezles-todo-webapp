import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { SyncMessage, SyncMessageType, SyncMessageData } from '../types/sync';
import { SYNC_CHANNEL_NAME, generateTabId } from '../types/sync';

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
  const tabIdRef = useRef<string>(generateTabId());
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    // Check if BroadcastChannel is supported
    if (typeof BroadcastChannel === 'undefined') {
      console.warn('BroadcastChannel API not supported in this browser. Cross-tab sync disabled.');
      return;
    }

    // Create broadcast channel
    const channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
    channelRef.current = channel;

    // Listen for messages from other tabs
    channel.onmessage = (event: MessageEvent<SyncMessage>) => {
      const message = event.data;

      // Ignore messages from the same tab (prevent self-updates)
      if (message.sourceTabId === tabIdRef.current) {
        return;
      }

      // Handle different message types
      switch (message.type) {
        case 'TODO_CREATED':
        case 'TODO_UPDATED':
        case 'TODO_DELETED':
        case 'TODO_COMPLETED':
        case 'TODO_MOVED_TO_TODAY':
        case 'TODO_REMOVED_FROM_TODAY':
          // Invalidate todos cache to trigger refetch
          queryClient.invalidateQueries({ 
            queryKey: ['todos'],
            refetchType: 'active' // Only refetch active queries
          });
          
          // Also invalidate today view since todos changed
          queryClient.invalidateQueries({ 
            queryKey: ['todayView'],
            refetchType: 'active'
          });
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

        default:
          console.warn('Unknown sync message type:', message.type);
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
      console.warn('BroadcastChannel not initialized. Message not sent:', type);
      return;
    }

    const message: SyncMessage = {
      type,
      data,
      sourceTabId: tabIdRef.current,
    };

    try {
      channelRef.current.postMessage(message);
    } catch (error) {
      console.error('Failed to broadcast message:', error);
    }
  }, []);

  return {
    broadcast,
    // Expose tabId for testing purposes (not used in production code)
    tabId: tabIdRef.current,
  };
};

export default useCrossTabSync;

