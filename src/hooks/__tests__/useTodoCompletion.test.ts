import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTodoCompletion } from '../useTodoCompletion';
import { useApi } from '../useApi';
import { useToast } from '../../contexts/ToastContext';
import { createMockTodo, resetFactoryCounters } from '../../test/factories';
import type { Todo } from '../../types/todo';

// Mock the dependencies
vi.mock('../useApi');
vi.mock('../../contexts/ToastContext');

const mockUseApi = vi.mocked(useApi);
const mockUseToast = vi.mocked(useToast);

describe('useTodoCompletion', () => {
  const mockUpdateTodo = vi.fn();
  const mockShowToast = vi.fn();
  const mockHideToast = vi.fn();
  const mockOnUpdate = vi.fn();
  const mockOptimisticUpdate = vi.fn();

  const mockApiClient = {
    updateTodo: mockUpdateTodo,
    getTodos: vi.fn(),
    getTodo: vi.fn(),
    createTodo: vi.fn(),
    deleteTodo: vi.fn(),
    getTodayView: vi.fn(),
    getAreas: vi.fn(),
    createArea: vi.fn(),
    updateArea: vi.fn(),
    deleteArea: vi.fn(),
    getAreaStats: vi.fn(),
    getAvailableColors: vi.fn(),
  };

  beforeEach(() => {
    resetFactoryCounters();
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useFakeTimers();

    // Setup API mock
    mockUseApi.mockReturnValue(mockApiClient as any);

    // Setup Toast mock
    mockUseToast.mockReturnValue({
      showToast: mockShowToast,
      hideToast: mockHideToast,
      clearAllToasts: vi.fn(),
    });

    // Setup default successful API response
    mockUpdateTodo.mockResolvedValue({
      success: true,
      data: createMockTodo({ id: 1, completed: true }),
    });

    // Setup toast ID generation
    mockShowToast.mockReturnValue('toast-123');
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('Initialization', () => {
    it('should initialize with no pending completions', () => {
      const { result } = renderHook(() =>
        useTodoCompletion({ onUpdate: mockOnUpdate })
      );

      expect(result.current.hasPendingCompletions).toBe(false);
      expect(result.current.toggleTodoCompletion).toBeInstanceOf(Function);
      expect(result.current.getTodoDisplayState).toBeInstanceOf(Function);
      expect(result.current.cleanup).toBeInstanceOf(Function);
    });

    it('should accept custom undo timeout', () => {
      const { result } = renderHook(() =>
        useTodoCompletion({ 
          onUpdate: mockOnUpdate, 
          undoTimeoutMs: 3000 
        })
      );

      expect(result.current).toBeDefined();
    });

    it('should accept optimistic update callback', () => {
      const { result } = renderHook(() =>
        useTodoCompletion({ 
          onUpdate: mockOnUpdate,
          optimisticUpdate: mockOptimisticUpdate
        })
      );

      expect(result.current).toBeDefined();
    });
  });

  describe('Todo Completion Toggle', () => {
    it('should toggle todo from incomplete to complete', async () => {
      const { result } = renderHook(() =>
        useTodoCompletion({ onUpdate: mockOnUpdate })
      );

      const todo = createMockTodo({ id: 1, completed: false, title: 'Test Todo' });

      await act(async () => {
        result.current.toggleTodoCompletion(todo);
      });

      // Should have pending completion
      expect(result.current.hasPendingCompletions).toBe(true);

      // Should show optimistic state
      const displayState = result.current.getTodoDisplayState(todo);
      expect(displayState.completed).toBe(true);
      expect(displayState.isPending).toBe(true);
    });

    it('should toggle todo from complete to incomplete', async () => {
      const { result } = renderHook(() =>
        useTodoCompletion({ onUpdate: mockOnUpdate })
      );

      const todo = createMockTodo({ id: 1, completed: true, title: 'Test Todo' });

      await act(async () => {
        result.current.toggleTodoCompletion(todo);
      });

      // Should show optimistic state
      const displayState = result.current.getTodoDisplayState(todo);
      expect(displayState.completed).toBe(false);
      expect(displayState.isPending).toBe(true);
    });

    it('should show toast notification with undo message', async () => {
      const { result } = renderHook(() =>
        useTodoCompletion({ onUpdate: mockOnUpdate })
      );

      const todo = createMockTodo({ 
        id: 1, 
        completed: false, 
        title: 'Test Todo' 
      });

      await act(async () => {
        result.current.toggleTodoCompletion(todo);
      });

      // Fast-forward past the toast delay
      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith({
          message: 'Completed "Test Todo" • Click checkbox again to cancel',
          type: 'success',
          duration: 1300, // undoTimeoutMs (1500) - 200
        });
      });
    });

    it('should truncate long todo titles in toast', async () => {
      const { result } = renderHook(() =>
        useTodoCompletion({ onUpdate: mockOnUpdate })
      );

      const longTitle = 'This is a very long todo title that should be truncated';
      const todo = createMockTodo({ 
        id: 1, 
        completed: false, 
        title: longTitle 
      });

      await act(async () => {
        result.current.toggleTodoCompletion(todo);
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith({
          message: 'Completed "This is a very long todo title..." • Click checkbox again to cancel',
          type: 'success',
          duration: 1300,
        });
      });
    });
  });

  describe('Undo Functionality', () => {
    it('should cancel pending completion when toggled again', async () => {
      const { result } = renderHook(() =>
        useTodoCompletion({ onUpdate: mockOnUpdate })
      );

      const todo = createMockTodo({ id: 1, completed: false });

      // First toggle
      await act(async () => {
        result.current.toggleTodoCompletion(todo);
      });

      expect(result.current.hasPendingCompletions).toBe(true);

      // Second toggle (undo)
      await act(async () => {
        result.current.toggleTodoCompletion(todo);
      });

      expect(result.current.hasPendingCompletions).toBe(false);

      // Should return to original state
      const displayState = result.current.getTodoDisplayState(todo);
      expect(displayState.completed).toBe(false);
      expect(displayState.isPending).toBe(false);
    });

    it('should hide toast when undoing', async () => {
      const { result } = renderHook(() =>
        useTodoCompletion({ onUpdate: mockOnUpdate })
      );

      const todo = createMockTodo({ id: 1, completed: false });

      // First toggle
      await act(async () => {
        result.current.toggleTodoCompletion(todo);
      });

      // Let toast appear
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Second toggle (undo)
      await act(async () => {
        result.current.toggleTodoCompletion(todo);
      });

      expect(mockHideToast).toHaveBeenCalledWith('toast-123');
    });

    it('should not commit to server when undone before timeout', async () => {
      const { result } = renderHook(() =>
        useTodoCompletion({ onUpdate: mockOnUpdate })
      );

      const todo = createMockTodo({ id: 1, completed: false });

      // First toggle
      await act(async () => {
        result.current.toggleTodoCompletion(todo);
      });

      // Undo before timeout
      await act(async () => {
        result.current.toggleTodoCompletion(todo);
      });

      // Fast-forward past original timeout
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(mockUpdateTodo).not.toHaveBeenCalled();
    });
  });

  describe('Auto-commit Functionality', () => {
    it('should commit to server after timeout', async () => {
      const { result } = renderHook(() =>
        useTodoCompletion({ onUpdate: mockOnUpdate })
      );

      const todo = createMockTodo({ id: 1, completed: false });

      await act(async () => {
        result.current.toggleTodoCompletion(todo);
      });

      // Fast-forward past timeout
      act(() => {
        vi.advanceTimersByTime(1600);
      });

      await waitFor(() => {
        expect(mockUpdateTodo).toHaveBeenCalledWith(1, { completed: true });
      });
    });

    it('should call onUpdate after successful commit', async () => {
      const { result } = renderHook(() =>
        useTodoCompletion({ onUpdate: mockOnUpdate })
      );

      const todo = createMockTodo({ id: 1, completed: false });

      await act(async () => {
        result.current.toggleTodoCompletion(todo);
      });

      act(() => {
        vi.advanceTimersByTime(1600);
      });

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalled();
      });
    });

    it('should use optimistic update when provided', async () => {
      const { result } = renderHook(() =>
        useTodoCompletion({ 
          onUpdate: mockOnUpdate,
          optimisticUpdate: mockOptimisticUpdate
        })
      );

      const todo = createMockTodo({ id: 1, completed: false });

      await act(async () => {
        result.current.toggleTodoCompletion(todo);
      });

      act(() => {
        vi.advanceTimersByTime(1600);
      });

      await waitFor(() => {
        expect(mockOptimisticUpdate).toHaveBeenCalledWith(1, true);
        expect(mockOnUpdate).not.toHaveBeenCalled();
      });
    });

    it('should clear pending state after commit', async () => {
      const { result } = renderHook(() =>
        useTodoCompletion({ onUpdate: mockOnUpdate })
      );

      const todo = createMockTodo({ id: 1, completed: false });

      await act(async () => {
        result.current.toggleTodoCompletion(todo);
      });

      expect(result.current.hasPendingCompletions).toBe(true);

      act(() => {
        vi.advanceTimersByTime(1600);
      });

      await waitFor(() => {
        expect(result.current.hasPendingCompletions).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockUpdateTodo.mockRejectedValue(new Error('Network error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() =>
        useTodoCompletion({ onUpdate: mockOnUpdate })
      );

      const todo = createMockTodo({ id: 1, completed: false });

      await act(async () => {
        result.current.toggleTodoCompletion(todo);
      });

      act(() => {
        vi.advanceTimersByTime(1600);
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error committing todo completion:',
          expect.any(Error)
        );
        expect(mockOnUpdate).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });

    it('should handle failed API response', async () => {
      mockUpdateTodo.mockResolvedValue({ success: false, error: 'Server error' });

      const { result } = renderHook(() =>
        useTodoCompletion({ onUpdate: mockOnUpdate })
      );

      const todo = createMockTodo({ id: 1, completed: false });

      await act(async () => {
        result.current.toggleTodoCompletion(todo);
      });

      act(() => {
        vi.advanceTimersByTime(1600);
      });

      await waitFor(() => {
        expect(mockOnUpdate).not.toHaveBeenCalled();
      });
    });
  });

  describe('Multiple Todos', () => {
    it('should handle multiple pending completions', async () => {
      const { result } = renderHook(() =>
        useTodoCompletion({ onUpdate: mockOnUpdate })
      );

      const todo1 = createMockTodo({ id: 1, completed: false });
      const todo2 = createMockTodo({ id: 2, completed: false });

      await act(async () => {
        result.current.toggleTodoCompletion(todo1);
        result.current.toggleTodoCompletion(todo2);
      });

      expect(result.current.hasPendingCompletions).toBe(true);

      // Both should show pending state
      const state1 = result.current.getTodoDisplayState(todo1);
      const state2 = result.current.getTodoDisplayState(todo2);

      expect(state1.completed).toBe(true);
      expect(state1.isPending).toBe(true);
      expect(state2.completed).toBe(true);
      expect(state2.isPending).toBe(true);
    });

    it('should handle independent undo operations', async () => {
      const { result } = renderHook(() =>
        useTodoCompletion({ onUpdate: mockOnUpdate })
      );

      const todo1 = createMockTodo({ id: 1, completed: false });
      const todo2 = createMockTodo({ id: 2, completed: false });

      // Toggle both
      await act(async () => {
        result.current.toggleTodoCompletion(todo1);
        result.current.toggleTodoCompletion(todo2);
      });

      // Undo only todo1
      await act(async () => {
        result.current.toggleTodoCompletion(todo1);
      });

      // Todo1 should be back to original state
      const state1 = result.current.getTodoDisplayState(todo1);
      expect(state1.completed).toBe(false);
      expect(state1.isPending).toBe(false);

      // Todo2 should still be pending
      const state2 = result.current.getTodoDisplayState(todo2);
      expect(state2.completed).toBe(true);
      expect(state2.isPending).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup all pending operations', async () => {
      const { result } = renderHook(() =>
        useTodoCompletion({ onUpdate: mockOnUpdate })
      );

      const todo1 = createMockTodo({ id: 1, completed: false });
      const todo2 = createMockTodo({ id: 2, completed: false });

      await act(async () => {
        result.current.toggleTodoCompletion(todo1);
        result.current.toggleTodoCompletion(todo2);
      });

      expect(result.current.hasPendingCompletions).toBe(true);

      await act(async () => {
        result.current.cleanup();
      });

      expect(result.current.hasPendingCompletions).toBe(false);
      expect(mockHideToast).toHaveBeenCalledTimes(2);
    });

    it('should prevent commits after cleanup', async () => {
      const { result } = renderHook(() =>
        useTodoCompletion({ onUpdate: mockOnUpdate })
      );

      const todo = createMockTodo({ id: 1, completed: false });

      await act(async () => {
        result.current.toggleTodoCompletion(todo);
      });

      await act(async () => {
        result.current.cleanup();
      });

      // Fast-forward past original timeout
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(mockUpdateTodo).not.toHaveBeenCalled();
    });
  });

  describe('Display State', () => {
    it('should return correct state for non-pending todo', () => {
      const { result } = renderHook(() =>
        useTodoCompletion({ onUpdate: mockOnUpdate })
      );

      const completedTodo = createMockTodo({ id: 1, completed: true });
      const incompleteTodo = createMockTodo({ id: 2, completed: false });

      const completedState = result.current.getTodoDisplayState(completedTodo);
      const incompleteState = result.current.getTodoDisplayState(incompleteTodo);

      expect(completedState.completed).toBe(true);
      expect(completedState.isPending).toBe(false);
      expect(incompleteState.completed).toBe(false);
      expect(incompleteState.isPending).toBe(false);
    });

    it('should return correct state for pending todo', async () => {
      const { result } = renderHook(() =>
        useTodoCompletion({ onUpdate: mockOnUpdate })
      );

      const todo = createMockTodo({ id: 1, completed: false });

      await act(async () => {
        result.current.toggleTodoCompletion(todo);
      });

      const state = result.current.getTodoDisplayState(todo);
      expect(state.completed).toBe(true); // Opposite of original
      expect(state.isPending).toBe(true);
    });
  });
});
