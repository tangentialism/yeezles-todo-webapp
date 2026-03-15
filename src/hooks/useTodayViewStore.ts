import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useApi } from './useApi';
import { useTodoStore } from './useTodoStore';
import type { TodayView as TodayViewData, Todo, UpdateTodoRequest } from '../types/todo';
import { TODAY_VIEW_SYNC_INTERVAL_MS, TODAY_VIEW_STALE_TIME_MS, MUTATION_SETTLE_DELAY_MS } from '../constants';

// Query keys for TanStack Query
const QUERY_KEYS = {
  todayView: (includeDueToday?: boolean, daysAhead?: number) => 
    ['todayView', { includeDueToday, daysAhead }],
} as const;

interface UseTodayViewStoreOptions {
  includeDueToday?: boolean;
  daysAhead?: number;
  enableBackgroundSync?: boolean;
  syncInterval?: number; // in milliseconds, default 120000 (2 minutes)
}

interface OptimisticTodayData extends TodayViewData {
  _lastUpdated?: string;
}

/**
 * TanStack Query-based store for the Today focus view.
 *
 * Wraps the `GET /todos/today` endpoint and layers optimistic updates on top
 * so that toggling completion, editing, or deleting a todo feels instantaneous.
 * Mutations delegate to {@link useTodoStore} for the actual API calls, then
 * mark the today-view query as stale after a short settle delay to reconcile.
 *
 * @param options - Controls due-date inclusion, look-ahead days, and sync interval.
 * @returns Today view data, optimistic mutation wrappers, and loading/error states.
 */
export const useTodayViewStore = (options: UseTodayViewStoreOptions = {}) => {
  const { 
    includeDueToday = true,
    daysAhead,
    enableBackgroundSync = true, 
    syncInterval = TODAY_VIEW_SYNC_INTERVAL_MS
  } = options;
  
  const apiClient = useApi();
  const queryClient = useQueryClient();
  
  // Get todo store for shared operations
  const { toggleTodoCompletion, updateTodo, deleteTodo } = useTodoStore();

  // Main today view query
  const {
    data: todayData,
    isLoading,
    error,
    refetch,
    isRefetching
  } = useQuery({
    queryKey: QUERY_KEYS.todayView(includeDueToday, daysAhead),
    queryFn: async () => {
      const response = await apiClient.getTodayView(includeDueToday, daysAhead);
      if (!response.success) {
        throw new Error(response.message || 'Failed to load today view');
      }
      return {
        ...response.data,
        _lastUpdated: new Date().toISOString()
      } as OptimisticTodayData;
    },
    staleTime: TODAY_VIEW_STALE_TIME_MS,
    refetchInterval: enableBackgroundSync ? syncInterval : false,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

  // Optimistic update helper for today view data
  const updateTodayDataOptimistically = useCallback(
    (updaterFn: (data: OptimisticTodayData) => OptimisticTodayData) => {
      queryClient.setQueryData(QUERY_KEYS.todayView(includeDueToday, daysAhead), (old: OptimisticTodayData) => {
        if (!old) return old;
        return updaterFn(old);
      });
    },
    [queryClient, includeDueToday, daysAhead]
  );

  // Apply a partial update to a todo across all sections (focus + upcoming) of the today view.
  // This keeps the UI responsive while the real API call is in flight via the main todo store.
  const updateTodoInTodayView = useCallback((todoId: number, updates: Partial<Todo>) => {
    updateTodayDataOptimistically((data) => {
      const updateTodos = (todos: Todo[]) => 
        todos.map(todo => todo.id === todoId ? { ...todo, ...updates } : todo);
      
      return {
        ...data,
        focus: {
          ...data.focus,
          today_tagged: updateTodos(data.focus.today_tagged),
          due_today: updateTodos(data.focus.due_today),
          overdue: updateTodos(data.focus.overdue)
        },
        upcoming: {
          ...data.upcoming,
          coming_soon: updateTodos(data.upcoming.coming_soon)
        },
        _lastUpdated: new Date().toISOString()
      };
    });
  }, [updateTodayDataOptimistically]);

  // Toggle todo completion with today view optimistic updates
  const toggleTodoCompletionInTodayView = useCallback(async (todo: Todo) => {
    const newCompleted = !todo.completed;
    
    // Optimistically update in today view
    updateTodoInTodayView(todo.id, { 
      completed: newCompleted,
      completed_at: newCompleted ? new Date().toISOString() : null
    });
    
    // Use the main todo store for the actual API call and shared state
    const result = await toggleTodoCompletion(todo);
    
    // Invalidate today view to ensure consistency with main todo cache
    setTimeout(() => {
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.todayView(includeDueToday, daysAhead),
        refetchType: 'none' // Don't refetch immediately, just mark as stale
      });
    }, MUTATION_SETTLE_DELAY_MS);
    
    return result;
  }, [toggleTodoCompletion, updateTodoInTodayView, queryClient, includeDueToday, daysAhead]);

  // Update todo with today view optimistic updates
  const updateTodoInTodayViewStore = useCallback(async (id: number, updates: Partial<Todo>) => {
    // Optimistically update in today view
    updateTodoInTodayView(id, updates);
    
    // Use the main todo store for the actual API call
    const result = await updateTodo(id, updates as UpdateTodoRequest);
    
    // Invalidate today view to ensure consistency
    setTimeout(() => {
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.todayView(includeDueToday, daysAhead),
        refetchType: 'none'
      });
    }, MUTATION_SETTLE_DELAY_MS);
    
    return result;
  }, [updateTodo, updateTodoInTodayView, queryClient, includeDueToday, daysAhead]);

  // Delete todo with today view optimistic updates
  const deleteTodoFromTodayView = useCallback(async (id: number) => {
    // Optimistically remove from today view
    updateTodayDataOptimistically((data) => {
      const filterTodos = (todos: Todo[]) => todos.filter(todo => todo.id !== id);
      
      return {
        ...data,
        focus: {
          ...data.focus,
          today_tagged: filterTodos(data.focus.today_tagged),
          due_today: filterTodos(data.focus.due_today),
          overdue: filterTodos(data.focus.overdue)
        },
        upcoming: {
          ...data.upcoming,
          coming_soon: filterTodos(data.upcoming.coming_soon)
        },
        _lastUpdated: new Date().toISOString()
      };
    });
    
    // Use the main todo store for the actual API call
    const result = await deleteTodo(id);
    
    // Invalidate today view to ensure consistency
    setTimeout(() => {
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.todayView(includeDueToday, daysAhead),
        refetchType: 'none'
      });
    }, MUTATION_SETTLE_DELAY_MS);
    
    return result;
  }, [deleteTodo, updateTodayDataOptimistically, queryClient, includeDueToday, daysAhead]);

  // Helper to get all todos from today view as a flat array
  const getAllTodosFromTodayView = useCallback((): Todo[] => {
    if (!todayData) return [];
    
    return [
      ...todayData.focus.today_tagged,
      ...todayData.focus.due_today,
      ...todayData.focus.overdue,
      ...todayData.upcoming.coming_soon
    ];
  }, [todayData]);

  // Helper to get todo display state (for compatibility with existing code)
  const getTodoDisplayState = useCallback((todo: Todo) => {
    // For today view, we assume todos are not in pending states
    // since optimistic updates are handled through the main todo store
    return {
      completed: todo.completed,
      isPending: false,
      isRemoving: false,
      isCreating: false
    };
  }, []);

  // Sync with main todo store cache when it updates
  const syncWithMainTodoStore = useCallback(() => {
    queryClient.invalidateQueries({ 
      queryKey: QUERY_KEYS.todayView(includeDueToday, daysAhead) 
    });
  }, [queryClient, includeDueToday, daysAhead]);

  // Public interface
  return {
    // Data
    todayData: todayData as OptimisticTodayData | undefined,
    allTodos: getAllTodosFromTodayView(),
    isLoading,
    isRefetching,
    error,

    // Actions - optimized for today view
    toggleTodoCompletion: toggleTodoCompletionInTodayView,
    updateTodo: updateTodoInTodayViewStore,
    deleteTodo: deleteTodoFromTodayView,
    refetchTodayView: refetch,

    // Utilities
    getTodoDisplayState,
    syncWithMainTodoStore,

    // Query key for external cache invalidation
    queryKey: QUERY_KEYS.todayView(includeDueToday, daysAhead),
  };
};

export default useTodayViewStore;