import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useApi } from './useApi';
import { useTodoStore } from './useTodoStore';
import type { TodayView as TodayViewData, Todo } from '../types/todo';

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

export const useTodayViewStore = (options: UseTodayViewStoreOptions = {}) => {
  const { 
    includeDueToday = true,
    daysAhead,
    enableBackgroundSync = true, 
    syncInterval = 120000 // 2 minutes for today view
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
    staleTime: 60000, // Consider data stale after 1 minute for today view
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

  // Optimistically update a todo within the today view structure
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
    }, 100);
    
    return result;
  }, [toggleTodoCompletion, updateTodoInTodayView, queryClient, includeDueToday, daysAhead]);

  // Update todo with today view optimistic updates
  const updateTodoInTodayViewStore = useCallback(async (id: number, updates: any) => {
    // Optimistically update in today view
    updateTodoInTodayView(id, updates);
    
    // Use the main todo store for the actual API call
    const result = await updateTodo(id, updates);
    
    // Invalidate today view to ensure consistency
    setTimeout(() => {
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.todayView(includeDueToday, daysAhead),
        refetchType: 'none'
      });
    }, 100);
    
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
    }, 100);
    
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