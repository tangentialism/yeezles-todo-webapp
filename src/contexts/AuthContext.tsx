import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { createAuthenticatedApiClient } from '../services/api';
import type { LoginRequest } from '../services/api';
import { setPasskeyTokenProvider } from '../services/passkeyApi';
import { logger } from '../utils/logger';
import {
  GOOGLE_SDK_POLL_INTERVAL_MS,
  GOOGLE_SDK_MAX_POLLS,
  AUTH_INIT_DELAY_MS,
  TOKEN_EXPIRY_BUFFER_SECONDS,
  SESSION_HEALTH_CHECK_INTERVAL_MS,
} from '../constants';

export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

interface AuthState {
  user: User | null;
  idToken: string | null;        // Store Google ID token for API calls
  tokenExpiry: number | null;    // Track token expiration timestamp
  isAuthenticated: boolean;
  isLoading: boolean;
  isGoogleReady: boolean;        // Track if Google OAuth script is loaded and ready
  authMethod: 'google-oauth' | 'persistent-session' | null; // Track authentication method
  hasPersistentSession: boolean; // Track if user has remember me enabled
  sessionHealth: {               // Session health information
    daysUntilExpiry: number | null;
    needsRefreshWarning: boolean;
    lastChecked: number | null;
  };
}

interface GoogleCredentialResponse {
  credential: string;
  select_by: string;
}

interface AuthContextType extends AuthState {
  login: (credentialResponse: GoogleCredentialResponse, rememberMe?: boolean) => Promise<void>;
  logout: (signOutEverywhere?: boolean) => void; // Optional param to sign out from all devices
  getValidToken: () => string | null;          // Get token if valid, null if expired
  refreshTokenIfNeeded: () => Promise<void>;   // Refresh token if expired/expiring
  checkPersistentSession: () => Promise<boolean>; // Check for valid persistent session
  checkSessionHealth: () => Promise<void>;     // Check session health and update state
}

/**
 * React context providing authentication state and actions to the component tree.
 * Supports two auth methods: Google OAuth (short-lived ID tokens) and persistent
 * sessions (httpOnly cookie validated by the backend).
 */
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Access the authentication context. Must be called within an {@link AuthProvider}.
 * @returns Auth state (user, loading, session health) and actions (login, logout, token refresh).
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Provides authentication state to the component tree.
 *
 * On mount, attempts to restore a session in this order:
 * 1. Validate persistent session cookie via the backend.
 * 2. Fall back to stored user info in localStorage (requires fresh sign-in).
 *
 * Also manages Google SDK initialization, token expiry checks, and periodic
 * session health monitoring for persistent sessions.
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    idToken: null,
    tokenExpiry: null,
    isAuthenticated: false,
    isLoading: true,
    isGoogleReady: false,
    authMethod: null,
    hasPersistentSession: false,
    sessionHealth: {
      daysUntilExpiry: null,
      needsRefreshWarning: false,
      lastChecked: null,
    },
  });

  // Initialize Google OAuth
  useEffect(() => {
    const initializeGoogleAuth = () => {
      if (window.google) {
        try {
          window.google.accounts.id.initialize({
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
            callback: handleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: false,
          });
          // ✅ Set Google as ready but keep loading until auth check completes
          setAuthState(prev => ({ ...prev, isGoogleReady: true }));
        } catch (error) {
          logger.error('Google OAuth initialization failed:', error);
          // Still set as ready and stop loading so user sees the error instead of loading forever
          setAuthState(prev => ({ ...prev, isGoogleReady: true, isLoading: false }));
        }
      }
    };

    let timeoutCount = 0;
    const maxTimeouts = GOOGLE_SDK_MAX_POLLS;

    // Wait for Google script to load
    const checkGoogleLoaded = () => {
      if (window.google) {
        initializeGoogleAuth();
      } else {
        timeoutCount++;
        if (timeoutCount < maxTimeouts) {
          setTimeout(checkGoogleLoaded, GOOGLE_SDK_POLL_INTERVAL_MS);
        } else {
          // Set as ready but keep loading until auth check completes
          setAuthState(prev => ({ ...prev, isGoogleReady: true }));
        }
      }
    };

    checkGoogleLoaded();

    // Check for persistent session after a short delay to prevent flash
    // Use a longer delay for more reliable network operations
    setTimeout(async () => {
      await checkInitialAuth();
    }, AUTH_INIT_DELAY_MS);
    
  }, []);

  // Check for persistent session or stored user info on app startup
  const checkInitialAuth = async () => {
    try {
      // First, try to validate persistent session
      const hasPersistentAuth = await checkPersistentSession();
      
      if (!hasPersistentAuth) {
        // Fall back to checking localStorage (but user will need to re-authenticate)
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const user = JSON.parse(storedUser);
            
            // Note: Backend will validate user authorization

            // Restore user info but not authentication state 
            // (user must sign in again to get fresh tokens)
            setAuthState(prev => ({
              ...prev,                // ✅ Preserve existing state (like isGoogleReady)
              user,
              idToken: null,          // Never restore tokens from storage
              tokenExpiry: null,
              isAuthenticated: false, // Require fresh authentication
              isLoading: false,
            }));
          } catch (error) {
            logger.error('Error parsing stored user:', error);
            localStorage.removeItem('user');
            setAuthState(prev => ({ ...prev, isLoading: false }));
          }
        } else {
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }
      }
    } catch (error) {
      logger.error('Error checking initial auth:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleCredentialResponse = async (response: GoogleCredentialResponse) => {
    try {
      // Decode JWT token to get user info and expiration
      const payload = JSON.parse(atob(response.credential.split('.')[1]));
      
      // Let backend handle authorization - frontend shouldn't restrict users

      const user: User = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
      };

      // Store user in localStorage for persistence (but NOT the token for security)
      localStorage.setItem('user', JSON.stringify(user));
      
      // ✅ Store the actual ID token and expiration in memory for API calls
      setAuthState(prev => ({
        ...prev,
        user,
        idToken: response.credential,     // Store the complete ID token
        tokenExpiry: payload.exp,         // Store expiration timestamp
        isAuthenticated: true,
        isLoading: false,
        isGoogleReady: true,
        authMethod: 'google-oauth',
      }));
    } catch (error) {
      logger.error('Error handling credential response:', error);
      setAuthState(prev => ({
        ...prev,
        user: null,
        idToken: null,
        tokenExpiry: null,
        isAuthenticated: false,
        isLoading: false,
        authMethod: null,
        hasPersistentSession: false,
      }));
    }
  };

  const login = async (credentialResponse: GoogleCredentialResponse, rememberMe: boolean = false) => {
    try {
      logger.log('[Frontend] Login called with rememberMe:', rememberMe);

      // First handle the Google credential response
      await handleCredentialResponse(credentialResponse);

      // If remember me is requested, create persistent session
      if (rememberMe) {
        try {
          logger.log('[Frontend] Creating persistent session...');
          const apiClient = createAuthenticatedApiClient(getValidToken, () => {});
          const loginRequest: LoginRequest = {
            googleToken: credentialResponse.credential,
            rememberMe: true
          };

          const loginResponse = await apiClient.login(loginRequest);
          logger.log('[Frontend] Login response received, sessionCreated:', loginResponse.data?.sessionCreated);

          if (loginResponse.success && loginResponse.data.sessionCreated) {
            setAuthState(prev => ({
              ...prev,
              hasPersistentSession: true,
            }));
            logger.log('[Frontend] Persistent session created successfully');
          } else {
            logger.log('[Frontend] Session creation failed');
          }
        } catch (error) {
          logger.error('[Frontend] Failed to create persistent session:', error);
          // Don't fail the entire login process if persistent session creation fails
        }
      } else {
        logger.log('[Frontend] Remember me not requested, skipping persistent session');
      }
    } catch (error) {
      logger.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async (signOutEverywhere: boolean = false) => {
    try {
      // Only revoke all sessions if explicitly requested (sign out everywhere)
      if (authState.hasPersistentSession && signOutEverywhere) {
        try {
          const apiClient = createAuthenticatedApiClient(getValidToken, () => {});
          await apiClient.revokeAllSessions();
          logger.log('All persistent sessions revoked (sign out everywhere)');
        } catch (error) {
          logger.error('Failed to revoke all persistent sessions:', error);
          // Continue with logout even if session revocation fails
        }
      } else {
        // End THIS session server-side and clear its cookie. Other devices stay
        // signed in — that distinction is why /auth/logout exists alongside
        // DELETE /auth/sessions.
        //
        // This used to clear local state ONLY. The httpOnly
        // `__Host-remember_token` cookie and its server-side session survived,
        // so the next page load silently signed the user back in: a 90-day
        // session left behind on a shared machine, and passkey enrollment made
        // unreachable, since a cookie-restored user never holds the Google ID
        // token enrollment requires and had no way to obtain one. Confirmed
        // against production during Phase 2 testing.
        //
        // Called unconditionally rather than only when hasPersistentSession is
        // true: that flag reflects what this tab believes, and the cookie can
        // outlive the belief. The endpoint is a no-op without a cookie.
        try {
          logger.log('[Frontend] Ending current session (other devices remain signed in)');
          const apiClient = createAuthenticatedApiClient(getValidToken, () => {});
          await apiClient.logout();
        } catch (error) {
          logger.error('Failed to end current session:', error);
          // Fall through: local state is cleared below regardless. A failed
          // round trip must not strand the user in a signed-in browser.
        }
      }
    } catch (error) {
      logger.error('Error during logout cleanup:', error);
    }

    localStorage.removeItem('user');
    setAuthState(prev => ({
      ...prev,
      user: null,
      idToken: null,
      tokenExpiry: null,
      isAuthenticated: false,
      isLoading: false,
      authMethod: null,
      hasPersistentSession: false,
    }));
    
    // Revoke Google session
    if (window.google && authState.user) {
      window.google.accounts.id.revoke(authState.user.email, () => {
        logger.log('Google session revoked');
      });
    }
  };

  // Token validation utility
  const isTokenValid = (token: string | null, expiry: number | null): boolean => {
    if (!token || !expiry) return false;
    // Add 5-minute buffer for network delays
    return Date.now() < (expiry - TOKEN_EXPIRY_BUFFER_SECONDS) * 1000;
  };

  // Get valid token for API calls
  const getValidToken = (): string | null => {
    if (isTokenValid(authState.idToken, authState.tokenExpiry)) {
      return authState.idToken;
    }
    return null;
  };

  // Hand the current Google ID token to the passkey client, the same way
  // createAuthenticatedApiClient receives it for the todos client.
  //
  // Without this, passkeyApi authenticates by cookie only — and passkey
  // ENROLLMENT is guarded by requireFreshAuth, which accepts solely authMethod
  // 'google-id-token'. The backend sets that value only on the Bearer path, so
  // a cookie yields 'persistent-session' and is refused. The result was that
  // enrollment could not succeed in any state: 401 without a session cookie,
  // 403 with one. Found during Phase 2 device testing.
  //
  // No dependency array, deliberately: getValidToken closes over authState, so
  // a provider registered once at mount would keep returning that first
  // render's token — null, permanently. Re-registering each render keeps it
  // current, and setPasskeyTokenProvider is a cheap assignment.
  useEffect(() => {
    setPasskeyTokenProvider(getValidToken);
  });

  // Refresh token if needed
  const refreshTokenIfNeeded = async (): Promise<void> => {
    if (!isTokenValid(authState.idToken, authState.tokenExpiry)) {
      // Trigger Google's token refresh flow
      if (window.google?.accounts?.id) {
        window.google.accounts.id.prompt();
      }
    }
  };

  // Check for valid persistent session with retry logic
  const checkPersistentSession = async (retryCount: number = 0): Promise<boolean> => {
    const maxRetries = 2;
    try {
      logger.log(`[Frontend] Checking for persistent session... (attempt ${retryCount + 1})`);

      const apiClient = createAuthenticatedApiClient(() => null, () => {}); // No token needed for this call
      const response = await apiClient.validatePersistentSession();
      
      if (response.success && response.data.user) {
        // Create user object from persistent session data
        const user: User = {
          id: response.data.user.email, // Use email as ID for persistent sessions
          email: response.data.user.email,
          name: response.data.user.name,
        };

        // Store user in localStorage for consistency
        localStorage.setItem('user', JSON.stringify(user));
        
        // Update auth state with persistent session
        setAuthState(prev => ({
          ...prev,
          user,
          idToken: null, // No Google ID token for persistent sessions
          tokenExpiry: null,
          isAuthenticated: true,
          isLoading: false, // Ensure loading is false
          authMethod: 'persistent-session',
          hasPersistentSession: true,
        }));

        logger.log('Persistent session validated successfully');
        return true;
      }
      
      // Ensure loading state is updated when no session is found
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return false;
    } catch (error) {
      logger.log(`[Frontend] Persistent session check failed (attempt ${retryCount + 1}):`, error instanceof Error ? error.message : 'Unknown error');

      // Retry on network errors or temporary failures
      if (retryCount < maxRetries &&
          (error instanceof Error &&
           (error.message.includes('Network Error') ||
            error.message.includes('timeout') ||
            error.message.includes('fetch')))) {
        logger.log(`[Frontend] Retrying persistent session check in ${(retryCount + 1) * 1000}ms...`);
        return new Promise(resolve => {
          setTimeout(async () => {
            resolve(await checkPersistentSession(retryCount + 1));
          }, (retryCount + 1) * 1000); // Exponential backoff: 1s, 2s
        });
      }

      logger.log('[Frontend] Persistent session error details:', error);
      // Ensure loading state is updated on error
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  };

  // Check session health and update state
  const checkSessionHealth = async (): Promise<void> => {
    try {
      if (!authState.hasPersistentSession || authState.authMethod !== 'persistent-session') {
        return;
      }

      logger.log('[Frontend] Checking session health...');
      const apiClient = createAuthenticatedApiClient(() => null, () => {});
      const response = await apiClient.getSessionHealth();

      if (response.success && response.data) {
        const healthData = response.data;
        setAuthState(prev => ({
          ...prev,
          sessionHealth: {
            daysUntilExpiry: healthData.daysUntilExpiry ?? null,
            needsRefreshWarning: healthData.needsRefreshWarning ?? false,
            lastChecked: Date.now(),
          },
        }));

        if (healthData.needsRefreshWarning) {
          logger.warn(`[Frontend] Session expires in ${healthData.daysUntilExpiry} days - consider refreshing`);
        }
      }
    } catch (error) {
      logger.error('[Frontend] Session health check failed:', error);
    }
  };

  // Check session health periodically for persistent sessions
  useEffect(() => {
    if (authState.isAuthenticated && authState.hasPersistentSession && authState.authMethod === 'persistent-session') {
      // Check immediately
      checkSessionHealth();

      // Then check every hour
      const interval = setInterval(checkSessionHealth, SESSION_HEALTH_CHECK_INTERVAL_MS);
      return () => clearInterval(interval);
    }
  }, [authState.isAuthenticated, authState.hasPersistentSession, authState.authMethod]);

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        logout,
        getValidToken,
        refreshTokenIfNeeded,
        checkPersistentSession,
        checkSessionHealth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
