import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import { createMockUser, resetFactoryCounters } from '../../test/factories';

// Mock JWT decode
vi.mock('jwt-decode', () => ({
  default: vi.fn(),
}));

// Simple test component to verify auth context behavior
const AuthTestComponent: React.FC = () => {
  const { isAuthenticated, isLoading, user, logout } = useAuth();

  return (
    <div>
      <div data-testid="auth-state">
        <span data-testid="is-authenticated">{isAuthenticated.toString()}</span>
        <span data-testid="is-loading">{isLoading.toString()}</span>
        <span data-testid="user-email">{user?.email || 'none'}</span>
      </div>
      <button data-testid="logout-button" onClick={logout}>
        Logout
      </button>
    </div>
  );
};

describe('AuthContext - Core Functionality', () => {
  beforeEach(async () => {
    resetFactoryCounters();
    vi.clearAllMocks();
    
    // Clear localStorage
    localStorage.clear();
    
    // Setup comprehensive Google OAuth mock
    Object.defineProperty(window, 'google', {
      value: {
        accounts: {
          id: {
            initialize: vi.fn(),
            renderButton: vi.fn(),
            prompt: vi.fn(),
            revoke: vi.fn((email, callback) => callback?.()),
          },
        },
      },
      writable: true,
      configurable: true,
    });

    // Mock jwt-decode with default valid token
    const jwtDecode = await import('jwt-decode');
    vi.mocked(jwtDecode.default).mockReturnValue({
      sub: 'test-user-123',
      email: 'tangentialism@gmail.com', // Valid email for this app
      name: 'Test User',
      picture: 'https://example.com/avatar.jpg',
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    });
  });

  describe('Provider Setup', () => {
    it('should provide auth context without throwing', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      // Should have auth context functions
      expect(result.current.login).toBeInstanceOf(Function);
      expect(result.current.logout).toBeInstanceOf(Function);
      expect(result.current.getValidToken).toBeInstanceOf(Function);
      expect(result.current.refreshTokenIfNeeded).toBeInstanceOf(Function);
    });

    it('should throw error when useAuth used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('Google OAuth Integration', () => {
    it('should initialize Google OAuth on mount', async () => {
      renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      // Wait for initialization
      await waitFor(() => {
        expect(window.google.accounts.id.initialize).toHaveBeenCalledWith({
          client_id: 'test-google-client-id',
          callback: expect.any(Function),
          auto_select: false,
          cancel_on_tap_outside: false,
        });
      });
    });

    it('should handle Google OAuth initialization gracefully', async () => {
      // Mock Google initialization to throw error
      window.google.accounts.id.initialize = vi.fn().mockImplementation(() => {
        throw new Error('Google OAuth failed');
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          '❌ Google OAuth initialization failed:',
          expect.any(Error)
        );
        // Should still be ready even after error
        expect(result.current.isGoogleReady).toBe(true);
        expect(result.current.isLoading).toBe(false);
      });

      consoleSpy.mockRestore();
    });
  });

  describe('User Persistence', () => {
    it('should restore valid user from localStorage', async () => {
      const mockUser = createMockUser({
        email: 'tangentialism@gmail.com', // Valid email for this app
      });
      
      localStorage.setItem('user', JSON.stringify(mockUser));

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.user?.email).toBe(mockUser.email);
        expect(result.current.user?.name).toBe(mockUser.name);
      });
    });

    it('should reject invalid stored user email', async () => {
      const mockUser = createMockUser({
        email: 'invalid@example.com', // Invalid email
      });
      
      localStorage.setItem('user', JSON.stringify(mockUser));
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      await waitFor(() => {
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'Invalid stored user email:',
          'invalid@example.com'
        );
        expect(result.current.isAuthenticated).toBe(false);
        expect(localStorage.getItem('user')).toBeNull();
      });

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Token Management', () => {
    it('should validate token expiry correctly', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // With no user logged in, should return null token
      expect(result.current.getValidToken()).toBeNull();
    });

    it('should handle token refresh', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should not throw when calling refresh
      await act(async () => {
        await result.current.refreshTokenIfNeeded();
      });

      // If no valid token, should trigger prompt
      expect(window.google.accounts.id.prompt).toHaveBeenCalled();
    });
  });

  describe('Logout Functionality', () => {
    it('should handle logout correctly', async () => {
      // Setup authenticated state
      const mockUser = createMockUser({
        email: 'tangentialism@gmail.com',
      });
      localStorage.setItem('user', JSON.stringify(mockUser));

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      // Wait for user to be restored
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      // Trigger logout
      await act(async () => {
        result.current.logout();
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.user).toBeNull();
        expect(localStorage.getItem('user')).toBeNull();
      });

      // Verify Google session revoked
      expect(window.google.accounts.id.revoke).toHaveBeenCalledWith(
        mockUser.email,
        expect.any(Function)
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle corrupted localStorage data', async () => {
      localStorage.setItem('user', 'invalid-json');
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error parsing stored user:',
          expect.any(SyntaxError)
        );
        expect(result.current.isAuthenticated).toBe(false);
        expect(localStorage.getItem('user')).toBeNull();
      });

      consoleErrorSpy.mockRestore();
    });

    it('should handle missing Google script gracefully', async () => {
      // Remove Google from window
      Object.defineProperty(window, 'google', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      // Should eventually timeout and set ready state
      await waitFor(() => {
        expect(result.current.isGoogleReady).toBe(true);
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 6000 });
    });
  });
});
