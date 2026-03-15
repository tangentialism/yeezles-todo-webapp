import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSessionStore } from '../useSessionStore';
import { useApi } from '../useApi';
import { useToast } from '../../contexts/ToastContext';
import type { UserSession, SessionsResponse } from '../../services/api';
import {
  SESSION_SYNC_INTERVAL_MS,
  SESSION_STALE_TIME_MS,
} from '../../constants';

// Mock dependencies
vi.mock('../useApi');
vi.mock('../../contexts/ToastContext');

const mockUseApi = vi.mocked(useApi);
const mockUseToast = vi.mocked(useToast);

const createMockSession = (overrides: Partial<UserSession> = {}): UserSession => ({
  id: 1,
  platform: 'web',
  createdAt: '2024-01-01T00:00:00Z',
  lastUsedAt: '2024-01-15T12:00:00Z',
  expiresAt: '2024-04-01T00:00:00Z',
  userAgentHash: 'mock-hash-123',
  isCurrent: false,
  ...overrides,
});

describe('useSessionStore', () => {
  let queryClient: QueryClient;
  const mockGetUserSessions = vi.fn();
  const mockRevokeSession = vi.fn();
  const mockRevokeAllSessions = vi.fn();
  const mockShowToast = vi.fn();
  const mockHideToast = vi.fn();

  const mockApiClient = {
    getUserSessions: mockGetUserSessions,
    revokeSession: mockRevokeSession,
    revokeAllSessions: mockRevokeAllSessions,
    getTodos: vi.fn(),
    getTodo: vi.fn(),
    createTodo: vi.fn(),
    updateTodo: vi.fn(),
    deleteTodo: vi.fn(),
    getTodayView: vi.fn(),
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
    mockShowToast.mockReturnValue('toast-123');
    mockUseToast.mockReturnValue({
      showToast: mockShowToast,
      hideToast: mockHideToast,
      clearAllToasts: vi.fn(),
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  describe('Initial State', () => {
    it('should return initial loading state', () => {
      // Don't resolve the API call so we stay in loading state
      mockGetUserSessions.mockReturnValue(new Promise(() => {}));

      const { result } = renderHook(() => useSessionStore(), { wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.sessions).toEqual([]);
      expect(result.current.totalCount).toBe(0);
      expect(result.current.currentSession).toBeNull();
      expect(result.current.otherSessions).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Data Fetching', () => {
    it('should fetch session list', async () => {
      const mockSessions: UserSession[] = [
        createMockSession({ id: 1, isCurrent: true, platform: 'web' }),
        createMockSession({ id: 2, isCurrent: false, platform: 'mobile' }),
        createMockSession({ id: 3, isCurrent: false, platform: 'web' }),
      ];

      mockGetUserSessions.mockResolvedValue({
        success: true,
        data: { sessions: mockSessions, totalCount: 3 },
      });

      const { result } = renderHook(() => useSessionStore(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.sessions).toHaveLength(3);
      expect(result.current.totalCount).toBe(3);
      expect(result.current.currentSession).toBeDefined();
      expect(result.current.currentSession!.id).toBe(1);
      expect(result.current.otherSessions).toHaveLength(2);
    });

    it('should handle empty session list', async () => {
      mockGetUserSessions.mockResolvedValue({
        success: true,
        data: { sessions: [], totalCount: 0 },
      });

      const { result } = renderHook(() => useSessionStore(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.sessions).toHaveLength(0);
      expect(result.current.totalCount).toBe(0);
      expect(result.current.currentSession).toBeNull();
      expect(result.current.otherSessions).toHaveLength(0);
    });
  });

  describe('Revoke Session', () => {
    it('should expose revokeSession as a function', async () => {
      mockGetUserSessions.mockResolvedValue({
        success: true,
        data: {
          sessions: [
            createMockSession({ id: 1, isCurrent: true }),
            createMockSession({ id: 2, isCurrent: false }),
          ],
          totalCount: 2,
        },
      });

      const { result } = renderHook(() => useSessionStore(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.revokeSession).toBeInstanceOf(Function);
      expect(result.current.revokeAllSessions).toBeInstanceOf(Function);
    });
  });

  describe('Constants Usage', () => {
    it('should use correct sync interval from constants', () => {
      expect(SESSION_SYNC_INTERVAL_MS).toBe(300_000);
    });

    it('should use correct stale time from constants', () => {
      expect(SESSION_STALE_TIME_MS).toBe(2 * 60 * 1000);
    });
  });

  describe('Public Interface', () => {
    it('should expose all expected properties and functions', async () => {
      mockGetUserSessions.mockResolvedValue({
        success: true,
        data: { sessions: [], totalCount: 0 },
      });

      const { result } = renderHook(() => useSessionStore(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Data properties
      expect(result.current).toHaveProperty('sessions');
      expect(result.current).toHaveProperty('currentSession');
      expect(result.current).toHaveProperty('otherSessions');
      expect(result.current).toHaveProperty('totalCount');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('isRefetching');
      expect(result.current).toHaveProperty('error');

      // Actions
      expect(result.current.revokeSession).toBeInstanceOf(Function);
      expect(result.current.revokeAllSessions).toBeInstanceOf(Function);
      expect(result.current.refetchSessions).toBeInstanceOf(Function);

      // Utilities
      expect(result.current.getSessionDisplayState).toBeInstanceOf(Function);

      // Mutation states
      expect(result.current).toHaveProperty('isRevokingSession');
      expect(result.current).toHaveProperty('isRevokingAllSessions');

      // Query key
      expect(result.current.queryKey).toEqual(['sessions']);
    });
  });
});
