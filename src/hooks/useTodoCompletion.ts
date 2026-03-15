import { useState, useCallback, useRef } from 'react';
import { useApi } from './useApi';
import { useToast } from '../contexts/ToastContext';
import type { Todo } from '../types/todo';
import { logger } from '../utils/logger';
import { UNDO_TIMEOUT_MS, TOAST_APPEAR_DELAY_MS, TITLE_TRUNCATION_LENGTH } from '../constants';

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

/**
 * Manages todo completion toggling with a deferred-commit undo window.
 *
 * When a user toggles completion, the change is shown optimistically but not
 * committed to the server until after {@link UNDO_TIMEOUT_MS}. During that
 * window, toggling the same todo again cancels the pending change and reverts
 * to the original state. A toast notification is shown with a countdown.
 *
 * @param options.onUpdate - Called after a completion is committed or reverted.
 * @param options.undoTimeoutMs - Duration of the undo window (defaults to {@link UNDO_TIMEOUT_MS}).
 * @param options.optimisticUpdate - Optional callback for immediate cache updates.
 * @returns `toggleTodoCompletion`, `getTodoDisplayState`, `cleanup`, and `hasPendingCompletions`.
 */
export const useTodoCompletion = ({ onUpdate, undoTimeoutMs = UNDO_TIMEOUT_MS, optimisticUpdate }: UseTodoCompletionOptions) => {
  const [pendingCompletions, setPendingCompletions] = useState<Map<number, PendingCompletion>>(new Map());
  const { showToast, hideToast } = useToast();
  const apiClient = useApi();
  const pendingRef = useRef(pendingCompletions);
  
  // Keep ref in sync for cleanup
  pendingRef.current = pendingCompletions;

  // Sends the final completion state to the server after the undo window expires.
  const commitCompletion = useCallback(async (todoId: number, newCompleted: boolean) => {
    try {
      const response = await apiClient.updateTodo(todoId, { completed: newCompleted });
      if (response.success) {
        onUpdate();
      }
    } catch (error) {
      logger.error('Error committing todo completion:', error);
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
      // Only hide toast if it exists (might be empty if toast hasn't appeared yet)
      if (existingPending.toastId) {
        hideToast(existingPending.toastId);
      }
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

    // Create the undo toast with a brief delay for completions to avoid position clash
    const todoTitle = todo.title.length > TITLE_TRUNCATION_LENGTH ? `${todo.title.substring(0, TITLE_TRUNCATION_LENGTH)}...` : todo.title;
    const message = newCompleted ? `Completed "${todoTitle}"` : `Marked "${todoTitle}" as incomplete`;
    
    // Create the undo toast with a brief delay to separate from immediate visual feedback
    let toastId: string;
    setTimeout(() => {
      toastId = showToast({
        message: `${message} • Click checkbox again to cancel`,
        type: 'success',
        duration: undoTimeoutMs - TOAST_APPEAR_DELAY_MS // Adjust duration since it appears later
      });

      // Update the pending completion with the actual toast ID
      setPendingCompletions(prev => {
        const existing = prev.get(todo.id);
        if (existing) {
          return new Map(prev).set(todo.id, { ...existing, toastId });
        }
        return prev;
      });
    }, TOAST_APPEAR_DELAY_MS);

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

    // Add to pending completions (toast ID will be updated when toast appears)
    setPendingCompletions(prev => new Map(prev).set(todo.id, {
      todoId: todo.id,
      originalCompleted: todo.completed,
      timeoutId,
      toastId: '' // Will be updated when toast appears
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
