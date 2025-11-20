import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import AccomplishmentsView from '../AccomplishmentsView';
import * as useTodoStoreModule from '../../hooks/useTodoStore';
import type { Todo } from '../../types/todo';

// Mock the useTodoStore hook
vi.mock('../../hooks/useTodoStore');

describe('AccomplishmentsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state', () => {
    vi.spyOn(useTodoStoreModule, 'useTodoStore').mockReturnValue({
      todos: [],
      isLoading: true,
      isRefetching: false,
      error: null,
      getTodoDisplayState: vi.fn(),
      toggleTodoCompletion: vi.fn(),
      refetchTodos: vi.fn(),
      updateTodo: vi.fn(),
      deleteTodo: vi.fn(),
      createTodo: vi.fn(),
    } as any);

    render(<AccomplishmentsView />);
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should render empty state when no completed todos', () => {
    vi.spyOn(useTodoStoreModule, 'useTodoStore').mockReturnValue({
      todos: [],
      isLoading: false,
      isRefetching: false,
      error: null,
      getTodoDisplayState: vi.fn(),
      toggleTodoCompletion: vi.fn(),
      refetchTodos: vi.fn(),
      updateTodo: vi.fn(),
      deleteTodo: vi.fn(),
      createTodo: vi.fn(),
    } as any);

    render(<AccomplishmentsView />);
    
    expect(screen.getByText(/no accomplishments yet/i)).toBeInTheDocument();
  });

  it('should group and display completed todos by date', () => {
    const mockTodos: Todo[] = [
      {
        id: 1,
        title: 'Todo Today 1',
        description: '',
        completed: true,
        completed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        due_date: null,
        is_today: false,
        tags: [],
        area_id: null,
        reference_url: null
      },
      {
        id: 2,
        title: 'Todo Today 2',
        description: '',
        completed: true,
        completed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        due_date: null,
        is_today: false,
        tags: [],
        area_id: null,
        reference_url: null
      }
    ];

    vi.spyOn(useTodoStoreModule, 'useTodoStore').mockReturnValue({
      todos: mockTodos,
      isLoading: false,
      isRefetching: false,
      error: null,
      getTodoDisplayState: vi.fn(),
      toggleTodoCompletion: vi.fn(),
      refetchTodos: vi.fn(),
      updateTodo: vi.fn(),
      deleteTodo: vi.fn(),
      createTodo: vi.fn(),
    } as any);

    render(<AccomplishmentsView />);
    
    // Should show "Today" as the date group
    expect(screen.getByText('Today')).toBeInTheDocument();
    
    // Should show both todos
    expect(screen.getByText('Todo Today 1')).toBeInTheDocument();
    expect(screen.getByText('Todo Today 2')).toBeInTheDocument();
    
    // Should show stats
    expect(screen.getByText(/2.*completed/i)).toBeInTheDocument();
  });

  it('should display error state', () => {
    vi.spyOn(useTodoStoreModule, 'useTodoStore').mockReturnValue({
      todos: [],
      isLoading: false,
      isRefetching: false,
      error: new Error('Failed to load'),
      getTodoDisplayState: vi.fn(),
      toggleTodoCompletion: vi.fn(),
      refetchTodos: vi.fn(),
      updateTodo: vi.fn(),
      deleteTodo: vi.fn(),
      createTodo: vi.fn(),
    } as any);

    render(<AccomplishmentsView />);
    
    expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
  });
});

