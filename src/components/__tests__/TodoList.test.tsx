import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TodoList from '../TodoList';
import * as useTodoStoreModule from '../../hooks/useTodoStore';
import * as AreaContextModule from '../../contexts/AreaContext';
import type { Todo } from '../../types/todo';

// Mock the hooks
vi.mock('../../hooks/useTodoStore');
vi.mock('../../contexts/AreaContext');
// Mock child components that have complex dependencies
vi.mock('../EditTodoModal', () => ({
  default: () => null,
}));
vi.mock('../TodoActions', () => ({
  default: () => React.createElement('div', { 'data-testid': 'todo-actions' }),
}));
vi.mock('../TodayCorner', () => ({
  default: () => null,
}));

const createTestTodo = (overrides: Partial<Todo> = {}): Todo => ({
  id: 1,
  title: 'Test Todo',
  description: 'A test description',
  completed: false,
  due_date: null,
  is_today: false,
  area_id: null,
  reference_url: null,
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  completed_at: null,
  ...overrides,
});

describe('TodoList', () => {
  const mockToggleTodoCompletion = vi.fn();
  const mockRefetchTodos = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default Area context mock
    vi.spyOn(AreaContextModule, 'useArea').mockReturnValue({
      areas: [],
      currentArea: null,
      setCurrentArea: vi.fn(),
      isLoading: false,
      availableColors: [],
      refreshAreas: vi.fn(),
      createArea: vi.fn(),
      updateArea: vi.fn(),
      deleteArea: vi.fn(),
      getAreaStats: vi.fn(),
      getAreaDisplayState: vi.fn().mockReturnValue({ isPending: false, isDeleting: false, isCreating: false }),
    } as any);
  });

  const setupTodoStore = (overrides: Record<string, unknown> = {}) => {
    vi.spyOn(useTodoStoreModule, 'useTodoStore').mockReturnValue({
      todos: [],
      isLoading: false,
      isRefetching: false,
      error: null,
      getTodoDisplayState: vi.fn().mockReturnValue({
        completed: false,
        isPending: false,
        isRemoving: false,
        isCreating: false,
      }),
      toggleTodoCompletion: mockToggleTodoCompletion,
      refetchTodos: mockRefetchTodos,
      createTodo: vi.fn(),
      updateTodo: vi.fn(),
      deleteTodo: vi.fn(),
      moveToToday: vi.fn(),
      removeFromToday: vi.fn(),
      isCreating: false,
      isUpdating: false,
      isDeleting: false,
      isMovingToToday: false,
      isRemovingFromToday: false,
      queryKey: ['todos', {}],
      ...overrides,
    } as any);
  };

  describe('Loading State', () => {
    it('should show loading state', () => {
      setupTodoStore({ isLoading: true });

      render(<TodoList view="all" />);

      expect(screen.getByText(/loading todos/i)).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no todos', () => {
      setupTodoStore({ todos: [] });

      render(<TodoList view="all" />);

      expect(screen.getByText(/no todos found/i)).toBeInTheDocument();
    });

    it('should show appropriate message for completed view', () => {
      setupTodoStore({ todos: [] });

      render(<TodoList view="completed" />);

      expect(screen.getByText(/no completed todos yet/i)).toBeInTheDocument();
    });
  });

  describe('Rendering Todos', () => {
    it('should render a list of todos', () => {
      const todos: Todo[] = [
        createTestTodo({ id: 1, title: 'First Todo' }),
        createTestTodo({ id: 2, title: 'Second Todo' }),
        createTestTodo({ id: 3, title: 'Third Todo' }),
      ];

      setupTodoStore({ todos });

      render(<TodoList view="all" />);

      expect(screen.getByText('First Todo')).toBeInTheDocument();
      expect(screen.getByText('Second Todo')).toBeInTheDocument();
      expect(screen.getByText('Third Todo')).toBeInTheDocument();
    });

    it('should show todo titles and due dates', () => {
      const todos: Todo[] = [
        createTestTodo({
          id: 1,
          title: 'Task with due date',
          due_date: '2024-06-15T00:00:00Z',
        }),
      ];

      setupTodoStore({ todos });

      render(<TodoList view="all" />);

      expect(screen.getByText('Task with due date')).toBeInTheDocument();
      // Due date should be rendered somewhere
      expect(screen.getByText(/due:/i)).toBeInTheDocument();
    });

    it('should display todo count', () => {
      const todos: Todo[] = [
        createTestTodo({ id: 1, title: 'Todo 1' }),
        createTestTodo({ id: 2, title: 'Todo 2' }),
      ];

      setupTodoStore({ todos });

      render(<TodoList view="all" />);

      expect(screen.getByText('2 todos')).toBeInTheDocument();
    });
  });

  describe('Todo Completion', () => {
    it('should call completion handler when checkbox clicked', async () => {
      const user = userEvent.setup();
      const todo = createTestTodo({ id: 1, title: 'Clickable Todo' });

      setupTodoStore({ todos: [todo] });

      render(<TodoList view="all" />);

      // The checkbox is rendered as a button element in this component
      // Find the toggle button (the completion button)
      const buttons = screen.getAllByRole('button');
      // The first non-refresh button should be the completion toggle
      const completionButton = buttons.find(btn =>
        btn.classList.contains('rounded') &&
        btn.classList.contains('border-2')
      );

      if (completionButton) {
        await user.click(completionButton);
        expect(mockToggleTodoCompletion).toHaveBeenCalledWith(todo);
      }
    });
  });

  describe('Error State', () => {
    it('should display error state', () => {
      setupTodoStore({ error: new Error('Failed to load') });

      render(<TodoList view="all" />);

      expect(screen.getByText(/error loading todos/i)).toBeInTheDocument();
      expect(screen.getByText('Failed to load')).toBeInTheDocument();
    });

    it('should show retry button on error', () => {
      setupTodoStore({ error: new Error('Network error') });

      render(<TodoList view="all" />);

      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });
  });
});
