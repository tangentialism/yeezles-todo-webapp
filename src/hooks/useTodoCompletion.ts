import { useState, useCallback, useRef } from 'react';
import { useApi } from './useApi';
import { useToast } from '../contexts/ToastContext';
import type { Todo } from '../types/todo';

interface PendingCompletion {
  todoId: number;
  originalCompleted: boolean;
  timeoutId: NodeJS.Timeout;
  toastId: string;
}

interface UseTodoCompletionOptions {
  onUpdate: () => void;
  undoTimeoutMs?: number;
  optimisticUpdate?: (todoId: number, newCompleted: boolean) => void;
}

export const useTodoCompletion = ({ onUpdate, undoTimeoutMs = 1500, optimisticUpdate }: UseTodoCompletionOptions) => {
  const [pendingCompletions, setPendingCompletions] = useState<Map<number, PendingCompletion>>(new Map());
  const { showToast, hideToast } = useToast();
  const apiClient = useApi();
  const pendingRef = useRef(pendingCompletions);
  
  // Keep ref in sync for cleanup
  pendingRef.current = pendingCompletions;

  const commitCompletion = useCallback(async (todoId: number, newCompleted: boolean) => {
    try {
      const response = await apiClient.updateTodo(todoId, { completed: newCompleted });
      if (response.success) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error committing todo completion:', error);
      // If commit fails, we should revert the optimistic update
      onUpdate();
    }
  }, [apiClient, onUpdate]);



  const toggleTodoCompletion = useCallback(async (todo: Todo) => {
    // Check if there's already a pending completion for this todo
    const existingPending = pendingCompletions.get(todo.id);
    
    if (existingPending) {
      // There's a pending operation - cancel it
      clearTimeout(existingPending.timeoutId);
      hideToast(existingPending.toastId);
      setPendingCompletions(prev => {
        const next = new Map(prev);
        next.delete(todo.id);
        return next;
      });
      
      // Always return to original state when canceling a pending operation
      return;
    }
    
    // No pending operation - create a new one
    const newCompleted = !todo.completed;

    // Create the undo toast
    const todoTitle = todo.title.length > 30 ? `${todo.title.substring(0, 30)}...` : todo.title;
    const message = newCompleted ? `Completed "${todoTitle}"` : `Marked "${todoTitle}" as incomplete`;
    
    const toastId = showToast({
      message: `${message} • Click checkbox again to cancel`,
      type: 'success',
      duration: undoTimeoutMs
    });

    // Set up the auto-commit timeout
    const timeoutId = setTimeout(() => {
      // Commit the change to the server
      commitCompletion(todo.id, newCompleted);
      
      // Remove from pending completions
      setPendingCompletions(prev => {
        const next = new Map(prev);
        next.delete(todo.id);
        return next;
      });

      // If optimistic update is provided, use it; otherwise fall back to full reload
      if (optimisticUpdate) {
        optimisticUpdate(todo.id, newCompleted);
      } else {
        // Fallback to refresh UI for views that need full reload
        onUpdate();
      }
    }, undoTimeoutMs);

    // Add to pending completions
    setPendingCompletions(prev => new Map(prev).set(todo.id, {
      todoId: todo.id,
      originalCompleted: todo.completed,
      timeoutId,
      toastId
    }));

    // No immediate UI update - let the pending state handle the visual changes
  }, [pendingCompletions, showToast, hideToast, commitCompletion, undoTimeoutMs]);

  const getTodoDisplayState = useCallback((todo: Todo): { completed: boolean; isPending: boolean } => {
    const pending = pendingCompletions.get(todo.id);
    if (pending) {
      return {
        completed: !pending.originalCompleted, // Show the new state
        isPending: true
      };
    }
    return {
      completed: todo.completed,
      isPending: false
    };
  }, [pendingCompletions]);

  const cleanup = useCallback(() => {
    // Clear all pending timeouts and toasts
    pendingRef.current.forEach((pending) => {
      clearTimeout(pending.timeoutId);
      hideToast(pending.toastId);
    });
    setPendingCompletions(new Map());
  }, [hideToast]);

  return {
    toggleTodoCompletion,
    getTodoDisplayState,
    cleanup,
    hasPendingCompletions: pendingCompletions.size > 0
  };
};
