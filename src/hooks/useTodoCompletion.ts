import { useState, useCallback, useRef } from 'react';
import { todoApi } from '../services/api';
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
}

export const useTodoCompletion = ({ onUpdate, undoTimeoutMs = 4000 }: UseTodoCompletionOptions) => {
  const [pendingCompletions, setPendingCompletions] = useState<Map<number, PendingCompletion>>(new Map());
  const { showToast, hideToast } = useToast();
  const pendingRef = useRef(pendingCompletions);
  
  // Keep ref in sync for cleanup
  pendingRef.current = pendingCompletions;

  const commitCompletion = useCallback(async (todoId: number, newCompleted: boolean) => {
    try {
      const response = await todoApi.updateTodo(todoId, { completed: newCompleted });
      if (response.success) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error committing todo completion:', error);
      // If commit fails, we should revert the optimistic update
      onUpdate();
    }
  }, [onUpdate]);

  const undoCompletion = useCallback((todoId: number) => {
    const pending = pendingCompletions.get(todoId);
    if (!pending) return;

    // Clear the timeout and hide the toast
    clearTimeout(pending.timeoutId);
    hideToast(pending.toastId);
    
    // Remove from pending completions
    setPendingCompletions(prev => {
      const next = new Map(prev);
      next.delete(todoId);
      return next;
    });

    // No UI refresh needed - removing from pending state will show original state
  }, [pendingCompletions, hideToast]);

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
      duration: undoTimeoutMs,
      action: {
        label: 'Undo',
        onClick: () => undoCompletion(todo.id)
      }
    });

    // Set up the auto-commit timeout
    const timeoutId = setTimeout(() => {
      // Commit the change to the server
      commitCompletion(todo.id, newCompleted);
      
      // Remove from pending completions and refresh UI
      setPendingCompletions(prev => {
        const next = new Map(prev);
        next.delete(todo.id);
        return next;
      });
    }, undoTimeoutMs);

    // Add to pending completions
    setPendingCompletions(prev => new Map(prev).set(todo.id, {
      todoId: todo.id,
      originalCompleted: todo.completed,
      timeoutId,
      toastId
    }));

    // No immediate UI update - let the pending state handle the visual changes
  }, [pendingCompletions, showToast, hideToast, undoCompletion, commitCompletion, undoTimeoutMs]);

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
