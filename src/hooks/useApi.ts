import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createAuthenticatedApiClient } from '../services/api';
import type TokenAwareApiClient from '../services/api';

/**
 * Hook that provides an authenticated API client integrated with the auth context.
 * The API client automatically includes the current user's Google ID token in requests.
 */
export const useApi = (): TokenAwareApiClient => {
  const { getValidToken, logout } = useAuth();

  // Create API client with auth integration
  const apiClient = useMemo(() => {
    const handleAuthError = () => {
      console.warn('Authentication error detected, logging out user');
      logout(); // Force logout on auth errors
    };

    return createAuthenticatedApiClient(getValidToken, handleAuthError);
  }, [getValidToken, logout]);

  return apiClient;
};

export default useApi;
