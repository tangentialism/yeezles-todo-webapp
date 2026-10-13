import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import AccomplishmentsView from '../AccomplishmentsView';
import * as useTodoStoreModule from '../../hooks/useTodoStore';
import * as AreaContextModule from '../../contexts/AreaContext';
import userEvent from '@testing-library/user-event';
import { TopicNavigationContext } from '../../hooks/useOpenTopic';
import type { Todo } from '../../types/todo';

// Mock the useTodoStore hook and the area context (for area names)
vi.mock('../../hooks/useTodoStore');
vi.mock('../../contexts/AreaContext');

describe('AccomplishmentsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AreaContextModule, 'useArea').mockReturnValue({ areas: [], currentArea: null } as unknown as ReturnType<typeof AreaContextModule.useArea>);
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
    } as never);

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
    } as never);

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
    } as never);

    render(<AccomplishmentsView />);
    
    // Should group both todos under "Today"
    const group = screen.getByRole('region', { name: 'Today' });
    expect(within(group).getByText('Todo Today 1')).toBeInTheDocument();
    expect(within(group).getByText('Todo Today 2')).toBeInTheDocument();

    // Should show stats in the totals line
    const totals = screen.getByRole('group', { name: 'Totals' });
    expect(within(totals).getByText((_, el) => el?.textContent === '2 all time')).toBeInTheDocument();
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
    } as never);

    render(<AccomplishmentsView />);
    
    expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
  });

  it('shows the topic chip on a done todo and opens the topic through the context', async () => {
    const openTopic = vi.fn();
    const done: Todo = {
      id: 9, title: 'Order tiles', description: '', completed: true,
      completed_at: new Date().toISOString(), created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(), due_date: null, is_today: false, tags: [],
      area_id: null, reference_url: null, topic_id: 3, topic: { id: 3, name: 'Kitchen reno' },
    };
    vi.spyOn(useTodoStoreModule, 'useTodoStore').mockReturnValue({
      todos: [done, { ...done, id: 10, title: 'No topic here', topic_id: null, topic: null }],
      isLoading: false, isRefetching: false, error: null,
    } as never);

    render(
      <TopicNavigationContext.Provider value={openTopic}>
        <AccomplishmentsView />
      </TopicNavigationContext.Provider>
    );

    const chips = screen.getAllByRole('button', { name: 'Open topic Kitchen reno' });
    expect(chips).toHaveLength(1);
    await userEvent.click(chips[0]);
    expect(openTopic).toHaveBeenCalledWith(3);
  });
});


