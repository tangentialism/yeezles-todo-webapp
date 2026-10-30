import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from './useApi';
import { useCrossTabSync } from './useCrossTabSync';
import { personKeys } from './peopleInvalidation';
import { invalidateAfterLinkChange, peoplerKeys } from './peoplerInvalidation';
import { retryUnlessClientError } from '../services/apiError';
import type { PeoplerConnection, PeoplerSearchResult } from '../types/peopler';
import type { PersonWithCounts } from '../types/person';

export { peoplerKeys, invalidateAfterLinkChange };

/** The signed-in user's Peopler connection. */
export const usePeoplerConnection = () => {
  const api = useApi();
  return useQuery<PeoplerConnection>({
    queryKey: peoplerKeys.connection,
    queryFn: () => api.getPeoplerConnection(),
    staleTime: 30_000,
    retry: retryUnlessClientError,
  });
};

/**
 * Connect and disconnect. These call the api directly, not through
 * useMutation: a mutation keeps its variables in the mutation cache, and the
 * variables of `connect` are the Peopler token, which must live nowhere but
 * the modal's own state. Both reject with the ApiError (the caller shows it).
 */
export const usePeoplerConnectionActions = () => {
  const api = useApi();
  const queryClient = useQueryClient();
  const { broadcast } = useCrossTabSync();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const changed = (connection: PeoplerConnection) => {
    queryClient.setQueryData(peoplerKeys.connection, connection);
    invalidateAfterLinkChange(queryClient);
    // Never carries the token: only a stamp
    broadcast('PEOPLER_CONNECTION_CHANGED', { id: 0, timestamp: Date.now() });
  };

  const connect = async (token: string): Promise<PeoplerConnection> => {
    setIsConnecting(true);
    try {
      const connection = await api.connectPeopler(token);
      changed(connection);
      return connection;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async (): Promise<void> => {
    setIsDisconnecting(true);
    try {
      await api.disconnectPeopler();
      changed({ connected: false });
    } finally {
      setIsDisconnecting(false);
    }
  };

  return { connect, disconnect, isConnecting, isDisconnecting };
};

/** Search the user's Peopler; idle while the trimmed query is empty (the backend 400s on an empty `q`). */
export const usePeoplerSearch = (q: string) => {
  const api = useApi();
  return useQuery<PeoplerSearchResult[]>({
    queryKey: peoplerKeys.search(q),
    queryFn: () => api.searchPeopler(q),
    enabled: q.trim() !== '',
    retry: retryUnlessClientError,
  });
};

/**
 * Check a linked person's Peopler link once per person per mounted instance,
 * after the person loads. Never blocks rendering; a failed check is silent.
 * The result is merged into the cached person; views refetch and other tabs
 * hear of it only when the link itself changed.
 */
export const usePeoplerCheckOnOpen = (person: PersonWithCounts | undefined): void => {
  const api = useApi();
  const queryClient = useQueryClient();
  const { broadcast } = useCrossTabSync();
  const checkedRef = useRef<Set<number>>(new Set());
  const personId = person?.id;
  const shouldCheck = person !== undefined && person.peopler_link !== 'none';

  useEffect(() => {
    if (personId === undefined || !shouldCheck) return;
    if (checkedRef.current.has(personId)) return;
    checkedRef.current.add(personId);

    api
      .checkPeoplerLink(personId)
      .then((result) => {
        const key = personKeys.one(result.id);
        const before = queryClient.getQueryData<PersonWithCounts>(key);
        queryClient.setQueryData<PersonWithCounts>(key, (old) => ({ ...(old as PersonWithCounts), ...result }));
        const linkChanged =
          !before ||
          before.peopler_link !== result.peopler_link ||
          before.peopler_id !== result.peopler_id ||
          before.peopler_url !== result.peopler_url;
        if (linkChanged) {
          invalidateAfterLinkChange(queryClient);
          broadcast('PERSON_UPDATED', { id: result.id, timestamp: Date.now() });
        }
        if (result.peopler_link === 'dormant') {
          const connection = queryClient.getQueryData<PeoplerConnection>(peoplerKeys.connection);
          if (connection?.connected && connection.status === 'ok') {
            // The check hit a 401 and the server marked the connection broken
            queryClient.invalidateQueries({ queryKey: peoplerKeys.connection });
          }
        }
      })
      .catch(() => {
        // Silent by design: a failed check changes nothing visible
      });
  }, [api, queryClient, broadcast, personId, shouldCheck]);
};
