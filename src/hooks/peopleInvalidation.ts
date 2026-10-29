import type { QueryClient } from '@tanstack/react-query';

/**
 * Kept apart from usePeopleStore so useCrossTabSync and useTodoStore can share
 * it without an import cycle (usePeopleStore imports useCrossTabSync).
 */
type InvalidateOptions = { refetchType?: 'active' | 'inactive' | 'all' | 'none' };

/**
 * Query keys for people. A person's todos live under their own `personTodos`
 * prefix: useTodoStore patches `['todos', filters]` in place, so it
 * invalidates `personTodos` explicitly instead (plan discrepancy 5).
 */
export const personKeys = {
  all: ['people'] as const,
  list: (q: string, limit: number) => ['people', { q, limit }] as const,
  one: (id: number) => ['person', id] as const,
  todos: (id: number, completed: boolean) => ['personTodos', id, completed] as const,
};

/** Refetch every people list, person and person todo list (after any write that moves counts or names). */
export const invalidatePeopleViews = (queryClient: QueryClient, options: InvalidateOptions = {}) => {
  for (const queryKey of [personKeys.all, ['person'], ['personTodos']]) {
    queryClient.invalidateQueries({ queryKey, ...options });
  }
};
