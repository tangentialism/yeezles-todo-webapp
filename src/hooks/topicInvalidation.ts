import type { QueryClient } from '@tanstack/react-query';

/**
 * Kept apart from useTopicStore so useCrossTabSync and useTodoStore can share
 * it without an import cycle (useTopicStore imports useCrossTabSync).
 */
type InvalidateOptions = { refetchType?: 'active' | 'inactive' | 'all' | 'none' };

/**
 * Query keys for topics. A topic's todos live under their own `topicTodos`
 * prefix: useTodoStore patches `['todos', filters]` in place, so it
 * invalidates `topicTodos` explicitly instead (plan discrepancy 1).
 */
export const topicKeys = {
  all: ['topics'] as const,
  list: (areaId: number | null, includeArchived: boolean) => ['topics', { areaId, includeArchived }] as const,
  one: (id: number) => ['topic', id] as const,
  todos: (id: number, completed: boolean) => ['topicTodos', id, completed] as const,
};

/** Refetch every topic list, topic and topic todo list (after any write that moves counts). */
export const invalidateTopicViews = (queryClient: QueryClient, options: InvalidateOptions = {}) => {
  for (const queryKey of [topicKeys.all, ['topic'], ['topicTodos']]) {
    queryClient.invalidateQueries({ queryKey, ...options });
  }
};

/** Refetch todo lists, which show each todo's topic name. */
export const invalidateTodoViews = (queryClient: QueryClient, options: InvalidateOptions = {}) => {
  for (const queryKey of [['todos'], ['todayView']]) {
    queryClient.invalidateQueries({ queryKey, ...options });
  }
};

