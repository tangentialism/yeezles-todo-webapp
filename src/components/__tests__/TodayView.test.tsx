import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import TodayView from '../TodayView';
import * as useTodayViewStoreModule from '../../hooks/useTodayViewStore';
import type { TodayView as TodayViewData } from '../../types/todo';

// Mock the hooks
vi.mock('../../hooks/useTodayViewStore');
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
  beforeEach(() => {
    vi.clearAllMocks();
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

  describe('Rendering Sections', () => {
    it('should render overdue, due today, and tagged sections', () => {
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

      // Should render all three section headers
      expect(screen.getByText(/for today/i, { selector: 'h3' })).toBeInTheDocument();
      expect(screen.getByText(/due today/i, { selector: 'h3' })).toBeInTheDocument();
      expect(screen.getByText(/overdue/i, { selector: 'h3' })).toBeInTheDocument();

      // Should render todo titles
      expect(screen.getByText('Tagged for today')).toBeInTheDocument();
      expect(screen.getByText('Due today item')).toBeInTheDocument();
      expect(screen.getByText('Overdue item')).toBeInTheDocument();
    });

    it('should show summary cards with counts', () => {
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

      // Summary card labels
      expect(screen.getByText('Focus Items')).toBeInTheDocument();
      expect(screen.getByText('Overdue')).toBeInTheDocument();
      expect(screen.getByText('Coming Soon')).toBeInTheDocument();
    });

    it('should show needs attention banner when overdue items exist', () => {
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

      expect(screen.getByText(/needs attention/i)).toBeInTheDocument();
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
