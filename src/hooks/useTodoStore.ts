import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { useApi } from './useApi';
import { useToast } from '../contexts/ToastContext';
import { useArea } from '../contexts/AreaContext';
import type { Todo, TodoFilters, CreateTodoRequest, UpdateTodoRequest } from '../types/todo';

// Query keys for TanStack Query
const QUERY_KEYS = {
  todos: (filters?: TodoFilters) => ['todos', filters],
  todo: (id: number) => ['todo', id],
} as const;

interface UseTodoStoreOptions {
  view?: string;
  refreshTrigger?: number;
  enableBackgroundSync?: boolean;
  syncInterval?: number; // in milliseconds, default 60000 (1 minute)
}

interface OptimisticTodo extends Todo {
  _optimistic?: boolean;
  _pendingAction?: 'create' | 'update' | 'delete' | 'toggle';
}

export const useTodoStore = (options: UseTodoStoreOptions = {}) => {
  const { 
    view = 'all', 
    enableBackgroundSync = true, 
    syncInterval = 60000 
  } = options;
  
  const apiClient = useApi();
  const queryClient = useQueryClient();
  const { showToast, hideToast } = useToast();
  const { currentArea } = useArea();

  // Build filters based on view and current area
  const filters = useMemo((): TodoFilters => {
    const baseFilters: TodoFilters = {};
    
    // Add view-based filters
    switch (view) {
      case 'completed':
        baseFilters.completed = true;
        break;
      case 'all':
      default:
        // No completion filters for all todos
        break;
    }

    // Add area-based filters
    if (currentArea) {
      baseFilters.area_id = currentArea.id;
    } else {
      baseFilters.include_all_areas = true;
    }

    return baseFilters;
  }, [view, currentArea]);

  // Main todos query
  const {
    data: todos = [],
    isLoading,
    error,
    refetch,
    isRefetching
  } = useQuery({
    queryKey: QUERY_KEYS.todos(filters),
    queryFn: async () => {
      const response = await apiClient.getTodos(filters);
      if (!response.success) {
        throw new Error(response.message || 'Failed to load todos');
      }
      return response.data;
    },
    staleTime: 30000, // Consider data stale after 30 seconds
    refetchInterval: enableBackgroundSync ? syncInterval : false,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

  // Optimistic update helper
  const updateTodosOptimistically = useCallback(
    (updaterFn: (todos: OptimisticTodo[]) => OptimisticTodo[]) => {
      queryClient.setQueryData(QUERY_KEYS.todos(filters), (old: Todo[] = []) => {
        return updaterFn(old as OptimisticTodo[]);
      });
    },
    [queryClient, filters]
  );

  // Create todo mutation
  const createTodoMutation = useMutation({
    mutationFn: async (newTodo: CreateTodoRequest) => {
      const response = await apiClient.createTodo(newTodo);
      if (!response.success) {
        throw new Error(response.message || 'Failed to create todo');
      }
      return response.data;
    },
    onMutate: async (newTodo) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.todos(filters) });

      // Snapshot previous value
      const previousTodos = queryClient.getQueryData<Todo[]>(QUERY_KEYS.todos(filters));

      // Optimistically update with temporary ID
      const optimisticTodo: OptimisticTodo = {
        id: Date.now(), // Temporary ID
        title: newTodo.title,
        description: newTodo.description || '',
        completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        due_date: newTodo.due_date || null,
        completed_at: null,
        area_id: newTodo.area_id || null,
        _optimistic: true,
        _pendingAction: 'create'
      };

      updateTodosOptimistically((todos) => [optimisticTodo, ...todos]);

      return { previousTodos, optimisticTodo };
    },
    onError: (err, _newTodo, context) => {
      // Rollback on error
      if (context?.previousTodos) {
        queryClient.setQueryData(QUERY_KEYS.todos(filters), context.previousTodos);
      }
      showToast({
        message: `Failed to create todo: ${err.message}`,
        type: 'error'
      });
    },
    onSuccess: (data, _variables, context) => {
      // Replace optimistic todo with real data
      updateTodosOptimistically((todos) =>
        todos.map(todo =>
          todo.id === context?.optimisticTodo.id ? data : todo
        )
      );
      showToast({
        message: 'Todo created successfully!',
        type: 'success'
      });
    },
  });

  // Update todo mutation
  const updateTodoMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: UpdateTodoRequest }) => {
      const response = await apiClient.updateTodo(id, updates);
      if (!response.success) {
        throw new Error(response.message || 'Failed to update todo');
      }
      return response.data;
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.todos(filters) });

      const previousTodos = queryClient.getQueryData<Todo[]>(QUERY_KEYS.todos(filters));

      // Optimistically update
      updateTodosOptimistically((todos) =>
        todos.map(todo =>
          todo.id === id
            ? { 
                ...todo, 
                ...updates, 
                updated_at: new Date().toISOString(),
                _optimistic: true,
                _pendingAction: 'update'
              }
            : todo
        )
      );

      return { previousTodos };
    },
    onError: (err, _variables, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(QUERY_KEYS.todos(filters), context.previousTodos);
      }
      showToast({
        message: `Failed to update todo: ${err.message}`,
        type: 'error'
      });
    },
    onSuccess: (data) => {
      // Replace optimistic update with server data
      updateTodosOptimistically((todos) =>
        todos.map(todo => todo.id === data.id ? { ...data, _optimistic: false } : todo)
      );
      
      // Handle removal animation for completed todos in "all" view
      if (data.completed && view === 'all') {
        // Mark todo for removal animation
        setTimeout(() => {
          updateTodosOptimistically((todos) =>
            todos.map(todo =>
              todo.id === data.id
                ? { ...todo, _optimistic: true, _pendingAction: 'delete' }
                : todo
            )
          );
          
          // Remove from cache after animation completes
          setTimeout(() => {
            updateTodosOptimistically((todos) =>
              todos.filter(todo => todo.id !== data.id)
            );
          }, 450); // Match animation duration
        }, 100); // Small delay to let optimistic update settle
      }
    },
  });

  // Delete todo mutation
  const deleteTodoMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.deleteTodo(id);
      if (!response.success) {
        throw new Error(response.message || 'Failed to delete todo');
      }
      return id;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.todos(filters) });

      const previousTodos = queryClient.getQueryData<Todo[]>(QUERY_KEYS.todos(filters));

      // Optimistically remove
      updateTodosOptimistically((todos) =>
        todos.map(todo =>
          todo.id === id
            ? { ...todo, _optimistic: true, _pendingAction: 'delete' }
            : todo
        )
      );

      return { previousTodos };
    },
    onError: (err, _id, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(QUERY_KEYS.todos(filters), context.previousTodos);
      }
      showToast({
        message: `Failed to delete todo: ${err.message}`,
        type: 'error'
      });
    },
    onSuccess: (deletedId) => {
      // Remove from cache
      updateTodosOptimistically((todos) =>
        todos.filter(todo => todo.id !== deletedId)
      );
      showToast({
        message: 'Todo deleted successfully!',
        type: 'success'
      });
    },
  });

  // Toggle completion with optimistic updates and undo functionality
  const toggleTodoCompletion = useCallback(
    async (todo: Todo): Promise<{ canUndo: boolean; undoId?: string }> => {
      const newCompleted = !todo.completed;

      // Start optimistic update (note: completed_at is handled by server)
      updateTodoMutation.mutate({
        id: todo.id,
        updates: { 
          completed: newCompleted
        }
      });

      // Show undo toast for completions
      let undoToastId: string | undefined;
      if (newCompleted) {
        const todoTitle = todo.title.length > 30 ? `${todo.title.substring(0, 30)}...` : todo.title;
        undoToastId = showToast({
          message: `Completed "${todoTitle}" • Click to undo`,
          type: 'success',
          duration: 5000,
          action: {
            label: 'Undo',
            onClick: () => {
              // Revert the completion and cancel any pending removal
              updateTodoMutation.mutate({
                id: todo.id,
                updates: { completed: false }
              });
              
              // If todo was marked for removal, restore it immediately
              updateTodosOptimistically((todos) =>
                todos.map(t =>
                  t.id === todo.id && t._pendingAction === 'delete'
                    ? { ...t, _optimistic: false, _pendingAction: undefined }
                    : t
                )
              );
              
              hideToast(undoToastId!);
            }
          }
        });
      }

      return { canUndo: newCompleted, undoId: undoToastId };
    },
    [updateTodoMutation, showToast, hideToast, updateTodosOptimistically]
  );

  // Helper to get display state for a todo (handles pending states)
  const getTodoDisplayState = useCallback((todo: OptimisticTodo) => {
    return {
      completed: todo.completed,
      isPending: todo._optimistic && todo._pendingAction === 'update',
      isRemoving: todo._optimistic && todo._pendingAction === 'delete',
      isCreating: todo._optimistic && todo._pendingAction === 'create'
    };
  }, []);

  // Public interface
  return {
    // Data
    todos: todos as OptimisticTodo[],
    isLoading,
    isRefetching,
    error,

    // Actions
    createTodo: createTodoMutation.mutateAsync,
    updateTodo: (id: number, updates: UpdateTodoRequest) => 
      updateTodoMutation.mutateAsync({ id, updates }),
    deleteTodo: deleteTodoMutation.mutateAsync,
    toggleTodoCompletion,
    refetchTodos: refetch,

    // Utilities
    getTodoDisplayState,

    // Mutation states
    isCreating: createTodoMutation.isPending,
    isUpdating: updateTodoMutation.isPending,
    isDeleting: deleteTodoMutation.isPending,

    // Query key for external cache invalidation
    queryKey: QUERY_KEYS.todos(filters),
  };
};

export default useTodoStore;