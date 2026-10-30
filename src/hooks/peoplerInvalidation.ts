import type { QueryClient } from '@tanstack/react-query';
import { invalidatePeopleViews } from './peopleInvalidation';
import { invalidateTodoViews, invalidateTopicViews } from './topicInvalidation';

/**
 * Kept apart from usePeoplerStore so useCrossTabSync can share it without an
 * import cycle (usePeoplerStore imports useCrossTabSync).
 */
type InvalidateOptions = { refetchType?: 'active' | 'inactive' | 'all' | 'none' };

/** Query keys for the Peopler connection and its person search. */
export const peoplerKeys = {
  connection: ['peoplerConnection'] as const,
  search: (q: string) => ['peoplerSearch', q] as const,
  /** Prefix of every search key. */
  searches: ['peoplerSearch'] as const,
};

/**
 * Drop every cached Peopler search. A search result depends on which Peopler
 * account is connected and on which results are already linked, so a
 * connection or link change makes every cached one wrong.
 */
export const clearPeoplerSearches = (queryClient: QueryClient) => {
  queryClient.removeQueries({ queryKey: peoplerKeys.searches });
};

/**
 * Refetch everything a link change can move: people views, and the todo and
 * topic views, because chips on every row come from the todo's people.
 */
export const invalidateAfterLinkChange = (queryClient: QueryClient, options: InvalidateOptions = {}) => {
  clearPeoplerSearches(queryClient);
  invalidatePeopleViews(queryClient, options);
  invalidateTodoViews(queryClient, options);
  invalidateTopicViews(queryClient, options);
};
