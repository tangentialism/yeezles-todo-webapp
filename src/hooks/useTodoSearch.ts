import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useApi } from './useApi';
import { useDebouncedValue } from './useDebouncedValue';
import type { Todo } from '../types/todo';

/** How many hits the search pop-up asks for. */
export const SEARCH_RESULT_LIMIT = 30;

/**
 * Cache key for one search. Deliberately not part of the todo store's
 * invalidations: results must not re-sort under the user's cursor.
 */
export const todoSearchKey = (q: string) => ['todoSearch', q] as const;

const EMPTY: Todo[] = [];

/**
 * Search todos across every area, open and done, ranked by relevance.
 * Waits for typing to pause; a blank query runs nothing. `query` is the
 * debounced, trimmed string the current `results` belong to.
 */
export const useTodoSearch = (rawQuery: string) => {
  const api = useApi();
  const query = useDebouncedValue(rawQuery.trim());

  const { data, isFetching, error, refetch } = useQuery({
    queryKey: todoSearchKey(query),
    queryFn: async (): Promise<Todo[]> => {
      const response = await api.getTodos({
        search: query,
        completed: 'all',
        sort_by: 'relevance',
        limit: SEARCH_RESULT_LIMIT,
      });
      if (!response.success) throw new Error(response.message || 'Search failed');
      return response.data;
    },
    enabled: query !== '',
    placeholderData: keepPreviousData,
  });

  return {
    results: query === '' ? EMPTY : (data ?? EMPTY),
    query,
    isFetching,
    error: error as Error | null,
    refetch: () => {
      void refetch();
    },
  };
};
