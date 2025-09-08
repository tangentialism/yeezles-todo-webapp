import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useApi } from '../useApi';
import { useAuth } from '../../contexts/AuthContext';
import { createAuthenticatedApiClient } from '../../services/api';

// Mock the dependencies
vi.mock('../../contexts/AuthContext');
vi.mock('../../services/api');

const mockUseAuth = vi.mocked(useAuth);
const mockCreateAuthenticatedApiClient = vi.mocked(createAuthenticatedApiClient);

describe('useApi', () => {
  const mockGetValidToken = vi.fn();
  const mockLogout = vi.fn();
  const mockApiClient = {
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
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default auth context mock
    mockUseAuth.mockReturnValue({
      user: null,
      idToken: null,
      tokenExpiry: null,
      isAuthenticated: false,
      isLoading: false,
      isGoogleReady: true,
      login: vi.fn(),
      logout: mockLogout,
      getValidToken: mockGetValidToken,
      refreshTokenIfNeeded: vi.fn(),
    });

    // Setup API client mock
    mockCreateAuthenticatedApiClient.mockReturnValue(mockApiClient as any);
  });

  describe('API Client Creation', () => {
    it('should create API client with auth integration', () => {
      const { result } = renderHook(() => useApi());

      expect(mockCreateAuthenticatedApiClient).toHaveBeenCalledWith(
        mockGetValidToken,
        expect.any(Function) // handleAuthError function
      );
      expect(result.current).toBe(mockApiClient);
    });

    it('should pass getValidToken function to API client', () => {
      renderHook(() => useApi());

      const [getTokenFn] = mockCreateAuthenticatedApiClient.mock.calls[0];
      expect(getTokenFn).toBe(mockGetValidToken);
    });

    it('should create auth error handler that calls logout', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      renderHook(() => useApi());

      // Get the handleAuthError function that was passed to createAuthenticatedApiClient
      const [, handleAuthError] = mockCreateAuthenticatedApiClient.mock.calls[0];
      
      // Call the auth error handler
      handleAuthError();

      expect(consoleSpy).toHaveBeenCalledWith('Authentication error detected, logging out user');
      expect(mockLogout).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Memoization', () => {
    it('should memoize API client when auth functions remain the same', () => {
      const { result, rerender } = renderHook(() => useApi());
      const firstApiClient = result.current;

      // Rerender with same auth context
      rerender();
      const secondApiClient = result.current;

      expect(firstApiClient).toBe(secondApiClient);
      expect(mockCreateAuthenticatedApiClient).toHaveBeenCalledTimes(1);
    });

    it('should recreate API client when getValidToken changes', () => {
      const { result, rerender } = renderHook(() => useApi());
      const firstApiClient = result.current;

      // Change the getValidToken function
      const newGetValidToken = vi.fn();
      mockUseAuth.mockReturnValue({
        user: null,
        idToken: null,
        tokenExpiry: null,
        isAuthenticated: false,
        isLoading: false,
        isGoogleReady: true,
        login: vi.fn(),
        logout: mockLogout,
        getValidToken: newGetValidToken, // Changed
        refreshTokenIfNeeded: vi.fn(),
      });

      rerender();
      const secondApiClient = result.current;

      expect(firstApiClient).toBe(mockApiClient); // First call result
      expect(secondApiClient).toBe(mockApiClient); // Second call result (same mock, but different instance)
      expect(mockCreateAuthenticatedApiClient).toHaveBeenCalledTimes(2);
      
      // Verify second call used new function
      const [secondCallGetToken] = mockCreateAuthenticatedApiClient.mock.calls[1];
      expect(secondCallGetToken).toBe(newGetValidToken);
    });

    it('should recreate API client when logout function changes', () => {
      const { result, rerender } = renderHook(() => useApi());
      const firstApiClient = result.current;

      // Change the logout function
      const newLogout = vi.fn();
      mockUseAuth.mockReturnValue({
        user: null,
        idToken: null,
        tokenExpiry: null,
        isAuthenticated: false,
        isLoading: false,
        isGoogleReady: true,
        login: vi.fn(),
        logout: newLogout, // Changed
        getValidToken: mockGetValidToken,
        refreshTokenIfNeeded: vi.fn(),
      });

      rerender();
      const secondApiClient = result.current;

      expect(firstApiClient).toBe(mockApiClient);
      expect(secondApiClient).toBe(mockApiClient);
      expect(mockCreateAuthenticatedApiClient).toHaveBeenCalledTimes(2);
    });
  });

  describe('API Client Interface', () => {
    it('should provide all expected API methods', () => {
      const { result } = renderHook(() => useApi());
      const apiClient = result.current;

      // Todo methods
      expect(apiClient.getTodos).toBeDefined();
      expect(apiClient.getTodo).toBeDefined();
      expect(apiClient.createTodo).toBeDefined();
      expect(apiClient.updateTodo).toBeDefined();
      expect(apiClient.deleteTodo).toBeDefined();
      expect(apiClient.getTodayView).toBeDefined();

      // Area methods
      expect(apiClient.getAreas).toBeDefined();
      expect(apiClient.createArea).toBeDefined();
      expect(apiClient.updateArea).toBeDefined();
      expect(apiClient.deleteArea).toBeDefined();
      expect(apiClient.getAreaStats).toBeDefined();
      expect(apiClient.getAvailableColors).toBeDefined();
    });

    it('should return the same API client instance from createAuthenticatedApiClient', () => {
      const { result } = renderHook(() => useApi());
      
      expect(result.current).toBe(mockApiClient);
    });
  });

  describe('Error Handling', () => {
    it('should handle auth context errors gracefully', () => {
      // Mock useAuth to throw an error
      mockUseAuth.mockImplementation(() => {
        throw new Error('useAuth must be used within an AuthProvider');
      });

      expect(() => {
        renderHook(() => useApi());
      }).toThrow('useAuth must be used within an AuthProvider');
    });
  });

  describe('Integration Behavior', () => {
    it('should work with authenticated user context', () => {
      const mockUser = {
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg',
      };

      mockUseAuth.mockReturnValue({
        user: mockUser,
        idToken: 'valid-token',
        tokenExpiry: Date.now() + 3600000,
        isAuthenticated: true,
        isLoading: false,
        isGoogleReady: true,
        login: vi.fn(),
        logout: mockLogout,
        getValidToken: mockGetValidToken,
        refreshTokenIfNeeded: vi.fn(),
      });

      const { result } = renderHook(() => useApi());

      expect(mockCreateAuthenticatedApiClient).toHaveBeenCalledWith(
        mockGetValidToken,
        expect.any(Function)
      );
      expect(result.current).toBe(mockApiClient);
    });

    it('should work with unauthenticated user context', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        idToken: null,
        tokenExpiry: null,
        isAuthenticated: false,
        isLoading: false,
        isGoogleReady: true,
        login: vi.fn(),
        logout: mockLogout,
        getValidToken: mockGetValidToken,
        refreshTokenIfNeeded: vi.fn(),
      });

      const { result } = renderHook(() => useApi());

      expect(mockCreateAuthenticatedApiClient).toHaveBeenCalledWith(
        mockGetValidToken,
        expect.any(Function)
      );
      expect(result.current).toBe(mockApiClient);
    });
  });
});
