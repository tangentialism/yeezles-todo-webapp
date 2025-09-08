import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { createAuthenticatedApiClient } from '../services/api';
import type { LoginRequest } from '../services/api';

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
}

interface GoogleCredentialResponse {
  credential: string;
  select_by: string;
}

interface AuthContextType extends AuthState {
  login: (credentialResponse: GoogleCredentialResponse, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
  getValidToken: () => string | null;          // Get token if valid, null if expired
  refreshTokenIfNeeded: () => Promise<void>;   // Refresh token if expired/expiring
  checkPersistentSession: () => Promise<boolean>; // Check for valid persistent session
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
          // ✅ Set Google as ready and stop loading after successful initialization
          setAuthState(prev => ({ ...prev, isGoogleReady: true, isLoading: false }));
        } catch (error) {
          console.error('❌ Google OAuth initialization failed:', error);
          // Still set as ready and stop loading so user sees the error instead of loading forever
          setAuthState(prev => ({ ...prev, isGoogleReady: true, isLoading: false }));
        }
      }
    };

    let timeoutCount = 0;
    const maxTimeouts = 50; // 5 seconds maximum wait

    // Wait for Google script to load
    const checkGoogleLoaded = () => {
      if (window.google) {
        initializeGoogleAuth();
      } else {
        timeoutCount++;
        if (timeoutCount < maxTimeouts) {
          setTimeout(checkGoogleLoaded, 100);
        } else {
          // Set as ready and stop loading to show error state after timeout
          setAuthState(prev => ({ ...prev, isGoogleReady: true, isLoading: false }));
        }
      }
    };

    checkGoogleLoaded();

    // Check for persistent session first, then fall back to stored user
    checkInitialAuth();
    
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
            
            // Security: Validate stored user email
            if (user.email !== 'tangentialism@gmail.com') {
              console.warn('Invalid stored user email:', user.email);
              localStorage.removeItem('user');
              setAuthState(prev => ({ ...prev, isLoading: false }));
              return;
            }

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
            console.error('Error parsing stored user:', error);
            localStorage.removeItem('user');
            setAuthState(prev => ({ ...prev, isLoading: false }));
          }
        } else {
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }
      }
    } catch (error) {
      console.error('Error checking initial auth:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleCredentialResponse = async (response: GoogleCredentialResponse) => {
    try {
      // Decode JWT token to get user info and expiration
      const payload = JSON.parse(atob(response.credential.split('.')[1]));
      
      // Security: Only allow tangentialism@gmail.com
      if (payload.email !== 'tangentialism@gmail.com') {
        console.warn('Unauthorized access attempt:', payload.email);
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
        alert('Access denied. This application is restricted to authorized users only.');
        return;
      }

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
      console.error('Error handling credential response:', error);
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
      console.log('🔍 [Frontend] Login called with rememberMe:', rememberMe);
      
      // First handle the Google credential response
      await handleCredentialResponse(credentialResponse);
      
      // If remember me is requested, create persistent session
      if (rememberMe) {
        try {
          console.log('🔍 [Frontend] Creating persistent session...');
          const apiClient = createAuthenticatedApiClient(getValidToken, () => {});
          const loginRequest: LoginRequest = {
            googleToken: credentialResponse.credential,
            rememberMe: true
          };
          
          console.log('🔍 [Frontend] Sending login request:', loginRequest);
          const loginResponse = await apiClient.login(loginRequest);
          console.log('🔍 [Frontend] Login response:', loginResponse);
          
          if (loginResponse.success && loginResponse.data.sessionCreated) {
            setAuthState(prev => ({
              ...prev,
              hasPersistentSession: true,
            }));
            console.log('✅ [Frontend] Persistent session created successfully');
            console.log('🔍 [Frontend] Cookies after login:', document.cookie);
          } else {
            console.log('❌ [Frontend] Session creation failed:', loginResponse);
          }
        } catch (error) {
          console.error('❌ [Frontend] Failed to create persistent session:', error);
          // Don't fail the entire login process if persistent session creation fails
        }
      } else {
        console.log('🔍 [Frontend] Remember me not requested, skipping persistent session');
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // If user has persistent session, revoke all sessions
      if (authState.hasPersistentSession) {
        try {
          const apiClient = createAuthenticatedApiClient(getValidToken, () => {});
          await apiClient.revokeAllSessions();
          console.log('✅ All persistent sessions revoked');
        } catch (error) {
          console.error('Failed to revoke persistent sessions:', error);
          // Continue with logout even if session revocation fails
        }
      }
    } catch (error) {
      console.error('Error during logout cleanup:', error);
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
        console.log('Google session revoked');
      });
    }
  };

  // Token validation utility
  const isTokenValid = (token: string | null, expiry: number | null): boolean => {
    if (!token || !expiry) return false;
    // Add 5-minute buffer for network delays
    return Date.now() < (expiry - 300) * 1000;
  };

  // Get valid token for API calls
  const getValidToken = (): string | null => {
    if (isTokenValid(authState.idToken, authState.tokenExpiry)) {
      return authState.idToken;
    }
    return null;
  };

  // Refresh token if needed
  const refreshTokenIfNeeded = async (): Promise<void> => {
    if (!isTokenValid(authState.idToken, authState.tokenExpiry)) {
      // Trigger Google's token refresh flow
      if (window.google?.accounts?.id) {
        window.google.accounts.id.prompt();
      }
    }
  };

  // Check for valid persistent session
  const checkPersistentSession = async (): Promise<boolean> => {
    try {
      console.log('🔍 [Frontend] Checking for persistent session...');
      console.log('🔍 [Frontend] Current cookies:', document.cookie);
      
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

        console.log('✅ Persistent session validated successfully');
        return true;
      }
      
      // Ensure loading state is updated when no session is found
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return false;
    } catch (error) {
      console.log('❌ [Frontend] No valid persistent session found:', error instanceof Error ? error.message : 'Unknown error');
      console.log('🔍 [Frontend] Error details:', error);
      // Ensure loading state is updated on error
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        logout,
        getValidToken,
        refreshTokenIfNeeded,
        checkPersistentSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
