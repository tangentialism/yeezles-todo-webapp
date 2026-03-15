import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createAuthenticatedApiClient } from '../services/api';
import type TokenAwareApiClient from '../services/api';
import { logger } from '../utils/logger';

/**
 * Provides an authenticated {@link TokenAwareApiClient} bound to the current user's session.
 *
 * The client automatically attaches the Google ID token to every request and
 * triggers a logout when the backend returns a 401.
 *
 * @returns A memoized API client instance that stays stable across re-renders.
 */
export const useApi = (): TokenAwareApiClient => {
  const { getValidToken, logout } = useAuth();

  // Create API client with auth integration
  const apiClient = useMemo(() => {
    const handleAuthError = () => {
      logger.warn('Authentication error detected, logging out user');
      logout(); // Force logout on auth errors
    };

    return createAuthenticatedApiClient(getValidToken, handleAuthError);
  }, [getValidToken, logout]);

  return apiClient;
};

export default useApi;
