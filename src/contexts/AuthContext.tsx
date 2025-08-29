import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface User {
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
}

interface GoogleCredentialResponse {
  credential: string;
  select_by: string;
}

interface AuthContextType extends AuthState {
  login: (credentialResponse: GoogleCredentialResponse) => Promise<void>;
  logout: () => void;
  getValidToken: () => string | null;          // Get token if valid, null if expired
  refreshTokenIfNeeded: () => Promise<void>;   // Refresh token if expired/expiring
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
  });

  // Initialize Google OAuth
  useEffect(() => {
    const initializeGoogleAuth = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: false,
        });
      }
    };

    // Wait for Google script to load
    const checkGoogleLoaded = () => {
      if (window.google) {
        initializeGoogleAuth();
      } else {
        setTimeout(checkGoogleLoaded, 100);
      }
    };

    checkGoogleLoaded();

    // Check for existing user info (but tokens are never stored for security)
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
        setAuthState({
          user,
          idToken: null,          // Never restore tokens from storage
          tokenExpiry: null,
          isAuthenticated: false, // Require fresh authentication
          isLoading: false,
          isGoogleReady: false,
        });
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('user');
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    } else {
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const handleCredentialResponse = async (response: GoogleCredentialResponse) => {
    try {
      // Decode JWT token to get user info and expiration
      const payload = JSON.parse(atob(response.credential.split('.')[1]));
      
      // Security: Only allow tangentialism@gmail.com
      if (payload.email !== 'tangentialism@gmail.com') {
        console.warn('Unauthorized access attempt:', payload.email);
        setAuthState({
          user: null,
          idToken: null,
          tokenExpiry: null,
          isAuthenticated: false,
          isLoading: false,
          isGoogleReady: false,
        });
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
      setAuthState({
        user,
        idToken: response.credential,     // Store the complete ID token
        tokenExpiry: payload.exp,         // Store expiration timestamp
        isAuthenticated: true,
        isLoading: false,
        isGoogleReady: true,
      });
    } catch (error) {
      console.error('Error handling credential response:', error);
      setAuthState({
        user: null,
        idToken: null,
        tokenExpiry: null,
        isAuthenticated: false,
        isLoading: false,
        isGoogleReady: false,
      });
    }
  };

  const login = async (credentialResponse: GoogleCredentialResponse) => {
    await handleCredentialResponse(credentialResponse);
  };

  const logout = () => {
    localStorage.removeItem('user');
    setAuthState({
      user: null,
      idToken: null,
      tokenExpiry: null,
      isAuthenticated: false,
      isLoading: false,
      isGoogleReady: true,
    });
    
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

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        logout,
        getValidToken,
        refreshTokenIfNeeded,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
