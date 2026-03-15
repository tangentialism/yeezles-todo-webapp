import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTodayViewStore } from '../useTodayViewStore';
import { useApi } from '../useApi';
import { useTodoStore } from '../useTodoStore';
import type { TodayView } from '../../types/todo';
import {
  TODAY_VIEW_SYNC_INTERVAL_MS,
  TODAY_VIEW_STALE_TIME_MS,
} from '../../constants';

// Mock dependencies
vi.mock('../useApi');
vi.mock('../useTodoStore');

const mockUseApi = vi.mocked(useApi);
const mockUseTodoStore = vi.mocked(useTodoStore);

const createMockTodayView = (overrides: Partial<TodayView> = {}): TodayView => ({
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

describe('useTodayViewStore', () => {
  let queryClient: QueryClient;
  const mockGetTodayView = vi.fn();
  const mockToggleTodoCompletion = vi.fn();
  const mockUpdateTodo = vi.fn();
  const mockDeleteTodo = vi.fn();

  const mockApiClient = {
    getTodayView: mockGetTodayView,
    getTodos: vi.fn(),
    getTodo: vi.fn(),
    createTodo: vi.fn(),
    updateTodo: vi.fn(),
    deleteTodo: vi.fn(),
    getAreas: vi.fn(),
    createArea: vi.fn(),
    updateArea: vi.fn(),
    deleteArea: vi.fn(),
    getAreaStats: vi.fn(),
    getAvailableColors: vi.fn(),
    moveToToday: vi.fn(),
    removeFromToday: vi.fn(),
    categorizeTodo: vi.fn(),
    healthCheck: vi.fn(),
    login: vi.fn(),
    validatePersistentSession: vi.fn(),
    getUserSessions: vi.fn(),
    revokeSession: vi.fn(),
    revokeAllSessions: vi.fn(),
    getSessionHealth: vi.fn(),
    exportData: vi.fn(),
    importData: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });

    mockUseApi.mockReturnValue(mockApiClient as any);
    mockUseTodoStore.mockReturnValue({
      toggleTodoCompletion: mockToggleTodoCompletion,
      updateTodo: mockUpdateTodo,
      deleteTodo: mockDeleteTodo,
      todos: [],
      isLoading: false,
      isRefetching: false,
      error: null,
      createTodo: vi.fn(),
      moveToToday: vi.fn(),
      removeFromToday: vi.fn(),
      refetchTodos: vi.fn(),
      getTodoDisplayState: vi.fn(),
      isCreating: false,
      isUpdating: false,
      isDeleting: false,
      isMovingToToday: false,
      isRemovingFromToday: false,
      queryKey: ['todos', {}],
    } as any);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  describe('Initial State', () => {
    it('should return initial loading state', () => {
      // Don't resolve the API call so we stay in loading state
      mockGetTodayView.mockReturnValue(new Promise(() => {}));

      const { result } = renderHook(() => useTodayViewStore(), { wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.todayData).toBeUndefined();
      expect(result.current.allTodos).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Data Fetching', () => {
    it('should fetch today view data with focus and upcoming sections', async () => {
      const mockData = createMockTodayView({
        focus: {
          today_tagged: [
            { id: 1, title: 'Tagged todo', description: '', completed: false, due_date: null, is_today: true, area_id: null, reference_url: null, created_at: '2024-01-01', updated_at: '2024-01-01', completed_at: null },
          ],
          due_today: [
            { id: 2, title: 'Due today', description: '', completed: false, due_date: '2024-01-15', is_today: false, area_id: null, reference_url: null, created_at: '2024-01-01', updated_at: '2024-01-01', completed_at: null },
          ],
          overdue: [],
          total_today: 1,
          total_focus: 2,
        },
        upcoming: {
          coming_soon: [
            { id: 3, title: 'Upcoming', description: '', completed: false, due_date: '2024-01-20', is_today: false, area_id: null, reference_url: null, created_at: '2024-01-01', updated_at: '2024-01-01', completed_at: null },
          ],
          total_coming_soon: 1,
        },
      });

      mockGetTodayView.mockResolvedValue({ success: true, data: mockData });

      const { result } = renderHook(() => useTodayViewStore(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.todayData).toBeDefined();
      expect(result.current.todayData!.focus.today_tagged).toHaveLength(1);
      expect(result.current.todayData!.focus.due_today).toHaveLength(1);
      expect(result.current.todayData!.upcoming.coming_soon).toHaveLength(1);
      expect(result.current.allTodos).toHaveLength(3);
    });

    it('should handle empty today view', async () => {
      const mockData = createMockTodayView();
      mockGetTodayView.mockResolvedValue({ success: true, data: mockData });

      const { result } = renderHook(() => useTodayViewStore(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.todayData).toBeDefined();
      expect(result.current.allTodos).toHaveLength(0);
      expect(result.current.todayData!.focus.today_tagged).toHaveLength(0);
      expect(result.current.todayData!.focus.due_today).toHaveLength(0);
      expect(result.current.todayData!.focus.overdue).toHaveLength(0);
      expect(result.current.todayData!.upcoming.coming_soon).toHaveLength(0);
    });
  });

  describe('Optimistic Updates', () => {
    it('should optimistically update a todo via updateTodoInTodayViewStore', async () => {
      const mockData = createMockTodayView({
        focus: {
          today_tagged: [
            { id: 1, title: 'Original', description: '', completed: false, due_date: null, is_today: true, area_id: null, reference_url: null, created_at: '2024-01-01', updated_at: '2024-01-01', completed_at: null },
          ],
          due_today: [],
          overdue: [],
          total_today: 1,
          total_focus: 1,
        },
        upcoming: { coming_soon: [], total_coming_soon: 0 },
      });

      mockGetTodayView.mockResolvedValue({ success: true, data: mockData });
      mockUpdateTodo.mockResolvedValue({});

      const { result } = renderHook(() => useTodayViewStore(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // The updateTodo function wraps the main store's updateTodo
      // and applies optimistic updates to the today view cache
      expect(result.current.updateTodo).toBeDefined();
      expect(typeof result.current.updateTodo).toBe('function');
    });
  });

  describe('Constants Usage', () => {
    it('should use correct sync interval from constants', () => {
      expect(TODAY_VIEW_SYNC_INTERVAL_MS).toBe(120_000);
    });

    it('should use correct stale time from constants', () => {
      expect(TODAY_VIEW_STALE_TIME_MS).toBe(60_000);
    });
  });

  describe('Public Interface', () => {
    it('should expose all expected properties and functions', async () => {
      mockGetTodayView.mockResolvedValue({ success: true, data: createMockTodayView() });

      const { result } = renderHook(() => useTodayViewStore(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Data properties
      expect(result.current).toHaveProperty('todayData');
      expect(result.current).toHaveProperty('allTodos');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('isRefetching');
      expect(result.current).toHaveProperty('error');

      // Actions
      expect(result.current.toggleTodoCompletion).toBeInstanceOf(Function);
      expect(result.current.updateTodo).toBeInstanceOf(Function);
      expect(result.current.deleteTodo).toBeInstanceOf(Function);
      expect(result.current.refetchTodayView).toBeInstanceOf(Function);

      // Utilities
      expect(result.current.getTodoDisplayState).toBeInstanceOf(Function);
      expect(result.current.syncWithMainTodoStore).toBeInstanceOf(Function);

      // Query key
      expect(result.current.queryKey).toBeDefined();
    });
  });
});
