import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, waitFor, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import { createMockUser, createMockGoogleCredentialResponse, resetFactoryCounters } from '../../test/factories';
import { renderWithProviders } from '../../test/test-utils';

// Mock JWT decode
vi.mock('jwt-decode', () => ({
  default: vi.fn(),
}));

// Test component to verify auth context behavior
const AuthTestComponent: React.FC = () => {
  const { 
    user, 
    isAuthenticated, 
    isLoading, 
    isGoogleReady,
    login, 
    logout, 
    getValidToken,
    refreshTokenIfNeeded 
  } = useAuth();

  return (
    <div>
      <div data-testid="auth-state">
        <span data-testid="is-authenticated">{isAuthenticated.toString()}</span>
        <span data-testid="is-loading">{isLoading.toString()}</span>
        <span data-testid="is-google-ready">{isGoogleReady.toString()}</span>
        <span data-testid="user-email">{user?.email || 'none'}</span>
        <span data-testid="user-name">{user?.name || 'none'}</span>
      </div>
      <button 
        data-testid="login-button" 
        onClick={() => login(createMockGoogleCredentialResponse())}
      >
        Login
      </button>
      <button data-testid="logout-button" onClick={logout}>
        Logout
      </button>
      <button 
        data-testid="get-token-button" 
        onClick={() => {
          const token = getValidToken();
          const element = document.createElement('div');
          element.setAttribute('data-testid', 'token-result');
          element.textContent = token || 'null';
          document.body.appendChild(element);
        }}
      >
        Get Token
      </button>
      <button 
        data-testid="refresh-token-button" 
        onClick={() => refreshTokenIfNeeded()}
      >
        Refresh Token
      </button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(async () => {
    resetFactoryCounters();
    vi.clearAllMocks();
    
    // Clear localStorage
    localStorage.clear();
    
    // Reset Google OAuth mock
    window.google = {
      accounts: {
        id: {
          initialize: vi.fn(),
          renderButton: vi.fn(),
          prompt: vi.fn(),
          revoke: vi.fn((email, callback) => callback?.()),
        },
      },
    };

    // Mock jwt-decode
    const jwtDecode = await import('jwt-decode');
    vi.mocked(jwtDecode.default).mockReturnValue({
      sub: 'test-user-123',
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://example.com/avatar.jpg',
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    });
  });

  afterEach(() => {
    // Clean up any DOM elements created during tests
    document.querySelectorAll('[data-testid="token-result"]').forEach(el => el.remove());
  });

  describe('Initial State', () => {
    it('should start with unauthenticated state', async () => {
      renderWithProviders(<AuthTestComponent />, {
        includeAuth: false, // We're testing AuthProvider directly
        includeToast: false,
        includeArea: false,
      });

      // Wrap in AuthProvider manually
      const { rerender } = renderWithProviders(<div />, { includeAuth: false });
      rerender(
        <AuthProvider>
          <AuthTestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false');
        expect(screen.getByTestId('user-email')).toHaveTextContent('none');
        expect(screen.getByTestId('user-name')).toHaveTextContent('none');
      });
    });

    it('should initialize Google OAuth on mount', async () => {
      renderWithProviders(
        <AuthProvider>
          <AuthTestComponent />
        </AuthProvider>,
        { includeAuth: false, includeToast: false, includeArea: false }
      );

      await waitFor(() => {
        expect(window.google.accounts.id.initialize).toHaveBeenCalledWith({
          client_id: 'test-google-client-id',
          callback: expect.any(Function),
          auto_select: false,
          cancel_on_tap_outside: false,
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('is-google-ready')).toHaveTextContent('true');
        expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
      });
    });

    it('should handle Google OAuth initialization failure gracefully', async () => {
      // Mock Google initialization to throw error
      window.google.accounts.id.initialize = vi.fn().mockImplementation(() => {
        throw new Error('Google OAuth failed');
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      renderWithProviders(
        <AuthProvider>
          <AuthTestComponent />
        </AuthProvider>,
        { includeAuth: false, includeToast: false, includeArea: false }
      );

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          '❌ Google OAuth initialization failed:',
          expect.any(Error)
        );
        expect(screen.getByTestId('is-google-ready')).toHaveTextContent('true');
        expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
      });

      consoleSpy.mockRestore();
    });

    it('should timeout if Google script never loads', async () => {
      // Remove Google from window to simulate script not loading
      delete (window as any).google;

      renderWithProviders(
        <AuthProvider>
          <AuthTestComponent />
        </AuthProvider>,
        { includeAuth: false, includeToast: false, includeArea: false }
      );

      // Fast-forward time to trigger timeout
      vi.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(screen.getByTestId('is-google-ready')).toHaveTextContent('true');
        expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
      });
    }, { timeout: 10000 });
  });

  describe('User Persistence', () => {
    it('should restore user from localStorage on mount', async () => {
      const mockUser = createMockUser({
        email: 'tangentialism@gmail.com', // Valid email for this app
      });
      
      localStorage.setItem('user', JSON.stringify(mockUser));

      renderWithProviders(
        <AuthProvider>
          <AuthTestComponent />
        </AuthProvider>,
        { includeAuth: false, includeToast: false, includeArea: false }
      );

      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent(mockUser.email);
        expect(screen.getByTestId('user-name')).toHaveTextContent(mockUser.name);
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');
      });
    });

    it('should reject invalid stored user email', async () => {
      const mockUser = createMockUser({
        email: 'invalid@example.com', // Invalid email
      });
      
      localStorage.setItem('user', JSON.stringify(mockUser));
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      renderWithProviders(
        <AuthProvider>
          <AuthTestComponent />
        </AuthProvider>,
        { includeAuth: false, includeToast: false, includeArea: false }
      );

      await waitFor(() => {
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'Invalid stored user email:',
          'invalid@example.com'
        );
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false');
        expect(localStorage.getItem('user')).toBeNull();
      });

      consoleWarnSpy.mockRestore();
    });

    it('should handle corrupted localStorage data', async () => {
      localStorage.setItem('user', 'invalid-json');
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      renderWithProviders(
        <AuthProvider>
          <AuthTestComponent />
        </AuthProvider>,
        { includeAuth: false, includeToast: false, includeArea: false }
      );

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error parsing stored user:',
          expect.any(SyntaxError)
        );
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false');
        expect(localStorage.getItem('user')).toBeNull();
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Login Flow', () => {
    it('should handle successful Google login', async () => {
      const mockCredentialResponse = createMockGoogleCredentialResponse();
      
      renderWithProviders(
        <AuthProvider>
          <AuthTestComponent />
        </AuthProvider>,
        { includeAuth: false, includeToast: false, includeArea: false }
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
      });

      // Trigger login
      await act(async () => {
        screen.getByTestId('login-button').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');
        expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com');
        expect(screen.getByTestId('user-name')).toHaveTextContent('Test User');
      });

      // Verify user stored in localStorage
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      expect(storedUser.email).toBe('test@example.com');
    });

    it('should handle login with invalid JWT token', async () => {
      const jwtDecode = await import('jwt-decode');
      vi.mocked(jwtDecode.default).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockCredentialResponse = createMockGoogleCredentialResponse();
      
      renderWithProviders(
        <AuthProvider>
          <AuthTestComponent />
        </AuthProvider>,
        { includeAuth: false, includeToast: false, includeArea: false }
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
      });

      await act(async () => {
        screen.getByTestId('login-button').click();
      });

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error handling credential response:',
          expect.any(Error)
        );
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false');
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Logout Flow', () => {
    it('should handle logout correctly', async () => {
      // Setup authenticated state
      const mockUser = createMockUser({
        email: 'tangentialism@gmail.com',
      });
      localStorage.setItem('user', JSON.stringify(mockUser));

      renderWithProviders(
        <AuthProvider>
          <AuthTestComponent />
        </AuthProvider>,
        { includeAuth: false, includeToast: false, includeArea: false }
      );

      // Wait for user to be restored
      await waitFor(() => {
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');
      });

      // Trigger logout
      await act(async () => {
        screen.getByTestId('logout-button').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false');
        expect(screen.getByTestId('user-email')).toHaveTextContent('none');
        expect(localStorage.getItem('user')).toBeNull();
      });

      // Verify Google session revoked
      expect(window.google.accounts.id.revoke).toHaveBeenCalledWith(
        mockUser.email,
        expect.any(Function)
      );
    });
  });

  describe('Token Management', () => {
    it('should return valid token when not expired', async () => {
      const mockCredentialResponse = createMockGoogleCredentialResponse();
      
      renderWithProviders(
        <AuthProvider>
          <AuthTestComponent />
        </AuthProvider>,
        { includeAuth: false, includeToast: false, includeArea: false }
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
      });

      // Login first
      await act(async () => {
        screen.getByTestId('login-button').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');
      });

      // Get token
      await act(async () => {
        screen.getByTestId('get-token-button').click();
      });

      await waitFor(() => {
        const tokenResult = document.querySelector('[data-testid="token-result"]');
        expect(tokenResult).toHaveTextContent(mockCredentialResponse.credential);
      });
    });

    it('should return null for expired token', async () => {
      // Mock expired token
      const jwtDecode = await import('jwt-decode');
      vi.mocked(jwtDecode.default).mockReturnValue({
        sub: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg',
        exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago (expired)
      });

      const mockCredentialResponse = createMockGoogleCredentialResponse();
      
      renderWithProviders(
        <AuthProvider>
          <AuthTestComponent />
        </AuthProvider>,
        { includeAuth: false, includeToast: false, includeArea: false }
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
      });

      // Login with expired token
      await act(async () => {
        screen.getByTestId('login-button').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');
      });

      // Try to get token
      await act(async () => {
        screen.getByTestId('get-token-button').click();
      });

      await waitFor(() => {
        const tokenResult = document.querySelector('[data-testid="token-result"]');
        expect(tokenResult).toHaveTextContent('null');
      });
    });

    it('should trigger token refresh when needed', async () => {
      // Mock expired token
      const jwtDecode = await import('jwt-decode');
      vi.mocked(jwtDecode.default).mockReturnValue({
        sub: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg',
        exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago (expired)
      });

      const mockCredentialResponse = createMockGoogleCredentialResponse();
      
      renderWithProviders(
        <AuthProvider>
          <AuthTestComponent />
        </AuthProvider>,
        { includeAuth: false, includeToast: false, includeArea: false }
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
      });

      // Login with expired token
      await act(async () => {
        screen.getByTestId('login-button').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');
      });

      // Trigger token refresh
      await act(async () => {
        screen.getByTestId('refresh-token-button').click();
      });

      await waitFor(() => {
        expect(window.google.accounts.id.prompt).toHaveBeenCalled();
      });
    });
  });

  describe('Hook Usage', () => {
    it('should throw error when useAuth used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });

    it('should provide auth context when used within provider', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      expect(result.current).toEqual({
        user: null,
        idToken: null,
        tokenExpiry: null,
        isAuthenticated: false,
        isLoading: true,
        isGoogleReady: false,
        login: expect.any(Function),
        logout: expect.any(Function),
        getValidToken: expect.any(Function),
        refreshTokenIfNeeded: expect.any(Function),
      });
    });
  });
});
