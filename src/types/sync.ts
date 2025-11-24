/**
 * Cross-tab synchronization types
 * 
 * Used with Broadcast Channel API to sync state changes between browser tabs
 */

/**
 * Message types for different sync events
 */
export type SyncMessageType =
  | 'TODO_CREATED'
  | 'TODO_UPDATED'
  | 'TODO_DELETED'
  | 'TODO_COMPLETED'
  | 'TODO_MOVED_TO_TODAY'
  | 'TODO_REMOVED_FROM_TODAY'
  | 'AREA_CREATED'
  | 'AREA_UPDATED'
  | 'AREA_DELETED';

/**
 * Data payload for sync messages
 */
export interface SyncMessageData {
  id: number;
  timestamp: number;
  // Optional additional data for specific message types
  completed?: boolean;
  is_today?: boolean;
}

/**
 * Complete sync message structure
 */
export interface SyncMessage {
  type: SyncMessageType;
  data: SyncMessageData;
  // Source tab identifier (to prevent self-updates)
  sourceTabId: string;
}

/**
 * Broadcast Channel configuration
 */
export const SYNC_CHANNEL_NAME = 'yeezles-todo-sync' as const;

/**
 * Generate a unique tab ID for this session
 */
export const generateTabId = (): string => {
  return `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

