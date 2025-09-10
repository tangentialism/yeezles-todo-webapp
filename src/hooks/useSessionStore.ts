import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useApi } from './useApi';
import { useToast } from '../contexts/ToastContext';
import type { UserSession, SessionsResponse } from '../services/api';

// Query keys for TanStack Query
const QUERY_KEYS = {
  sessions: () => ['sessions'],
} as const;

interface UseSessionStoreOptions {
  enableBackgroundSync?: boolean;
  syncInterval?: number; // in milliseconds, default 300000 (5 minutes)
}

interface OptimisticSession extends UserSession {
  _optimistic?: boolean;
  _pendingAction?: 'revoke';
}

export const useSessionStore = (options: UseSessionStoreOptions = {}) => {
  const { 
    enableBackgroundSync = true, 
    syncInterval = 300000 // 5 minutes for sessions
  } = options;
  
  const apiClient = useApi();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // Main sessions query
  const {
    data: sessionsData,
    isLoading,
    error,
    refetch,
    isRefetching
  } = useQuery({
    queryKey: QUERY_KEYS.sessions(),
    queryFn: async () => {
      const response = await apiClient.getUserSessions();
      if (!response.success) {
        throw new Error('Failed to load sessions');
      }
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
    refetchInterval: enableBackgroundSync ? syncInterval : false,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

  // Extract sessions from data
  const sessions = sessionsData?.sessions || [];
  const totalCount = sessionsData?.totalCount || 0;

  // Optimistic update helper
  const updateSessionsOptimistically = useCallback(
    (updaterFn: (sessions: OptimisticSession[]) => OptimisticSession[]) => {
      queryClient.setQueryData(QUERY_KEYS.sessions(), (old: SessionsResponse | undefined) => {
        if (!old) return old;
        const updatedSessions = updaterFn((old as any).sessions as OptimisticSession[]);
        return {
          ...old,
          sessions: updatedSessions,
          totalCount: updatedSessions.length
        };
      });
    },
    [queryClient]
  );

  // Revoke specific session mutation
  const revokeSessionMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      const response = await apiClient.revokeSession(sessionId);
      if (!response.success) {
        throw new Error('Failed to revoke session');
      }
      return sessionId;
    },
    onMutate: async (sessionId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.sessions() });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<SessionsResponse>(QUERY_KEYS.sessions());

      // Optimistically mark session for removal
      updateSessionsOptimistically((sessions) =>
        sessions.map(session =>
          session.id === sessionId
            ? { ...session, _optimistic: true, _pendingAction: 'revoke' }
            : session
        )
      );

      return { previousData };
    },
    onError: (err, _sessionId, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(QUERY_KEYS.sessions(), context.previousData);
      }
      showToast({
        message: `Failed to revoke session: ${err.message}`,
        type: 'error'
      });
    },
    onSuccess: (revokedSessionId) => {
      // Remove session from cache with animation delay
      setTimeout(() => {
        updateSessionsOptimistically((sessions) =>
          sessions.filter(session => session.id !== revokedSessionId)
        );
      }, 300); // Small delay for any deletion animation

      showToast({
        message: 'Session revoked successfully!',
        type: 'success'
      });
    },
  });

  // Revoke all sessions mutation
  const revokeAllSessionsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.revokeAllSessions();
      if (!response.success) {
        throw new Error('Failed to revoke all sessions');
      }
      return response.data;
    },
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.sessions() });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<SessionsResponse>(QUERY_KEYS.sessions());

      // Optimistically mark all non-current sessions for removal
      updateSessionsOptimistically((sessions) =>
        sessions.map(session =>
          !session.isCurrent
            ? { ...session, _optimistic: true, _pendingAction: 'revoke' }
            : session
        )
      );

      return { previousData };
    },
    onError: (err, _variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(QUERY_KEYS.sessions(), context.previousData);
      }
      showToast({
        message: `Failed to revoke all sessions: ${err.message}`,
        type: 'error'
      });
    },
    onSuccess: (data) => {
      // Remove all non-current sessions from cache
      setTimeout(() => {
        updateSessionsOptimistically((sessions) =>
          sessions.filter(session => session.isCurrent)
        );
      }, 300);

      showToast({
        message: `${data.revokedCount} sessions revoked successfully!`,
        type: 'success'
      });
    },
  });

  // Helper to get display state for a session (handles pending states)
  const getSessionDisplayState = useCallback((session: OptimisticSession) => {
    return {
      isRevoking: session._optimistic && session._pendingAction === 'revoke'
    };
  }, []);

  // Get current session
  const currentSession = sessions.find(session => session.isCurrent) || null;

  // Get other (non-current) sessions
  const otherSessions = sessions.filter(session => !session.isCurrent);

  // Public interface
  return {
    // Data
    sessions: sessions as OptimisticSession[],
    currentSession,
    otherSessions: otherSessions as OptimisticSession[],
    totalCount,
    isLoading,
    isRefetching,
    error,

    // Actions
    revokeSession: revokeSessionMutation.mutateAsync,
    revokeAllSessions: revokeAllSessionsMutation.mutateAsync,
    refetchSessions: refetch,

    // Utilities
    getSessionDisplayState,

    // Mutation states
    isRevokingSession: revokeSessionMutation.isPending,
    isRevokingAllSessions: revokeAllSessionsMutation.isPending,

    // Query key for external cache invalidation
    queryKey: QUERY_KEYS.sessions(),
  };
};

export default useSessionStore;