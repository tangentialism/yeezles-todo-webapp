import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import TodayView from '../TodayView';
import * as useTodayViewStoreModule from '../../hooks/useTodayViewStore';
import * as useTodoStoreModule from '../../hooks/useTodoStore';
import * as AreaContextModule from '../../contexts/AreaContext';
import type { Todo, TodayView as TodayViewData } from '../../types/todo';

// Mock the hooks
vi.mock('../../hooks/useTodayViewStore');
vi.mock('../../hooks/useTodoStore');
vi.mock('../../contexts/AreaContext');
// Mock child components that have complex dependencies
vi.mock('../EditTodoModal', () => ({
  default: () => null,
}));
vi.mock('../TodoActions', () => ({
  default: () => React.createElement('div', { 'data-testid': 'todo-actions' }),
}));
vi.mock('../TodayToggle', () => ({
  default: () => null,
}));

/** Text of one item in the header's totals line, e.g. "2 overdue". */
const totalsItem = (text: string) =>
  within(screen.getByRole('group', { name: 'Totals' })).getByText((_, el) => el?.textContent === text);

const createMockTodayData = (overrides: Partial<TodayViewData> = {}): TodayViewData => ({
  focus: {
    today_tagged: [],
    due_today: [],
    overdue: [],
    total_today: 0,
    total_focus: 0,
  },
  upcoming: {
    coming_soon: [],
    total_coming_soon: 0,
  },
  summary: {
    total_today_items: 0,
    total_overdue: 0,
    total_coming_soon: 0,
    total_focus_items: 0,
    needs_attention: false,
  },
  ...overrides,
});

describe('TodayView', () => {
  let completedTodos: Todo[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    completedTodos = [];

    vi.spyOn(AreaContextModule, 'useArea').mockReturnValue({
      areas: [
        { id: 7, name: 'Work', color: '#1E88E5', user_id: 'test', reference_code: 'work', description: null, is_default: true, created_at: '', updated_at: '' },
      ],
      currentArea: null,
    } as unknown as ReturnType<typeof AreaContextModule.useArea>);

    // TodayView reads completed todos for today's progress
    vi.spyOn(useTodoStoreModule, 'useTodoStore').mockImplementation(
      () => ({ todos: completedTodos }) as unknown as ReturnType<typeof useTodoStoreModule.useTodoStore>
    );
  });

  const setupTodayViewStore = (overrides: Record<string, unknown> = {}) => {
    vi.spyOn(useTodayViewStoreModule, 'useTodayViewStore').mockReturnValue({
      todayData: undefined,
      allTodos: [],
      isLoading: false,
      isRefetching: false,
      error: null,
      toggleTodoCompletion: vi.fn(),
      updateTodo: vi.fn(),
      deleteTodo: vi.fn(),
      refetchTodayView: vi.fn(),
      getTodoDisplayState: vi.fn().mockReturnValue({
        completed: false,
        isPending: false,
        isRemoving: false,
        isCreating: false,
      }),
      syncWithMainTodoStore: vi.fn(),
      queryKey: ['todayView', {}],
      ...overrides,
    } as any);
  };

  describe('Loading State', () => {
    it('should show loading state', () => {
      setupTodayViewStore({ isLoading: true });

      render(<TodayView />);

      expect(screen.getByText(/loading today's focus/i)).toBeInTheDocument();
    });
  });

  describe('Empty / No Data State', () => {
    it('should show no data message when todayData is null', () => {
      setupTodayViewStore({ todayData: undefined });

      render(<TodayView />);

      expect(screen.getByText(/no data available/i)).toBeInTheDocument();
    });

    it('should show "all caught up" when no focus items', () => {
      const todayData = createMockTodayData({
        focus: {
          today_tagged: [],
          due_today: [],
          overdue: [],
          total_today: 0,
          total_focus: 0,
        },
        summary: {
          total_today_items: 0,
          total_overdue: 0,
          total_coming_soon: 0,
          total_focus_items: 0,
          needs_attention: false,
        },
      });

      setupTodayViewStore({ todayData });

      render(<TodayView />);

      expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
    });
  });

  describe('Rendering the focus list', () => {
    it('should list overdue first, then due today, then tagged for today', () => {
      const todayData = createMockTodayData({
        focus: {
          today_tagged: [
            { id: 1, title: 'Tagged for today', description: '', completed: false, due_date: null, is_today: true, area_id: null, reference_url: null, created_at: '2024-01-01', updated_at: '2024-01-01', completed_at: null },
          ],
          due_today: [
            { id: 2, title: 'Due today item', description: '', completed: false, due_date: '2024-01-15', is_today: false, area_id: null, reference_url: null, created_at: '2024-01-01', updated_at: '2024-01-01', completed_at: null },
          ],
          overdue: [
            { id: 3, title: 'Overdue item', description: '', completed: false, due_date: '2024-01-10', is_today: false, area_id: null, reference_url: null, created_at: '2024-01-01', updated_at: '2024-01-01', completed_at: null },
          ],
          total_today: 1,
          total_focus: 3,
        },
        summary: {
          total_today_items: 1,
          total_overdue: 1,
          total_coming_soon: 0,
          total_focus_items: 3,
          needs_attention: true,
        },
      });

      setupTodayViewStore({ todayData });

      render(<TodayView />);

      const rows = screen.getAllByRole('listitem');
      expect(rows.map((row) => row.textContent)).toEqual([
        expect.stringContaining('Overdue item'),
        expect.stringContaining('Due today item'),
        expect.stringContaining('Tagged for today'),
      ]);
    });

    it('should show each todo once even if it is both tagged and due today', () => {
      const todo = { id: 9, title: 'Both', description: '', completed: false, due_date: null, is_today: true, area_id: 7, reference_url: null, created_at: '2024-01-01', updated_at: '2024-01-01', completed_at: null };
      const todayData = createMockTodayData({
        focus: { today_tagged: [todo], due_today: [todo], overdue: [], total_today: 1, total_focus: 1 },
      });

      setupTodayViewStore({ todayData });

      render(<TodayView />);

      expect(screen.getAllByText('Both')).toHaveLength(1);
      // Area is shown on each row in the Today view
      expect(screen.getByText('Work')).toBeInTheDocument();
    });

    it('should list todos completed today, struck through', () => {
      completedTodos = [
        { id: 4, title: 'Finished it', description: '', completed: true, due_date: null, is_today: true, area_id: null, reference_url: null, created_at: '2024-01-01', updated_at: '2024-01-01', completed_at: new Date().toISOString() },
      ];
      setupTodayViewStore({ todayData: createMockTodayData() });

      render(<TodayView />);

      expect(screen.getByText('Finished it')).toBeInTheDocument();
      expect(totalsItem('1 done')).toBeInTheDocument();
      expect(screen.getByRole('img', { name: '1 of 1 done today' })).toBeInTheDocument();
    });

    it('should show a totals line with counts', () => {
      const todayData = createMockTodayData({
        focus: {
          today_tagged: [
            { id: 1, title: 'Todo 1', description: '', completed: false, due_date: null, is_today: true, area_id: null, reference_url: null, created_at: '2024-01-01', updated_at: '2024-01-01', completed_at: null },
          ],
          due_today: [],
          overdue: [],
          total_today: 1,
          total_focus: 1,
        },
        summary: {
          total_today_items: 1,
          total_overdue: 2,
          total_coming_soon: 3,
          total_focus_items: 4,
          needs_attention: false,
        },
      });

      setupTodayViewStore({ todayData });

      render(<TodayView />);

      expect(totalsItem('1 today')).toBeInTheDocument();
      expect(totalsItem('2 overdue')).toBeInTheDocument();
      expect(totalsItem('3 coming up')).toBeInTheDocument();
    });

    it('should show overdue items with their lateness', () => {
      const todayData = createMockTodayData({
        focus: {
          today_tagged: [],
          due_today: [],
          overdue: [
            { id: 1, title: 'Urgent', description: '', completed: false, due_date: '2024-01-01', is_today: false, area_id: null, reference_url: null, created_at: '2024-01-01', updated_at: '2024-01-01', completed_at: null },
          ],
          total_today: 0,
          total_focus: 1,
        },
        summary: {
          total_today_items: 0,
          total_overdue: 1,
          total_coming_soon: 0,
          total_focus_items: 1,
          needs_attention: true,
        },
      });

      setupTodayViewStore({ todayData });

      render(<TodayView />);

      expect(screen.getByText('Urgent')).toBeInTheDocument();
      expect(screen.getByText(/^−\d+ days$/)).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should display error state', () => {
      setupTodayViewStore({ error: new Error('Failed to load today view') });

      render(<TodayView />);

      expect(screen.getByText(/error loading today view/i)).toBeInTheDocument();
      expect(screen.getByText('Failed to load today view')).toBeInTheDocument();
    });
  });
});
