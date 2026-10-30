import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from './useApi';
import { useCrossTabSync } from './useCrossTabSync';
import { invalidatePeopleViews, personKeys } from './peopleInvalidation';
import { invalidateTodoViews, invalidateTopicViews } from './topicInvalidation';
import { clearPeoplerSearches } from './peoplerInvalidation';
import { retryUnlessClientError } from '../services/apiError';
import type { Todo } from '../types/todo';
import type { CreatePersonRequest, Person, UpdatePersonRequest } from '../types/person';
import { BACKGROUND_SYNC_INTERVAL_MS } from '../constants';

export { personKeys, invalidatePeopleViews };

const POLLING = {
  staleTime: 30_000,
  refetchInterval: BACKGROUND_SYNC_INTERVAL_MS,
  refetchOnWindowFocus: true,
  retry: retryUnlessClientError,
} as const;

/** People with counts, most recently tagged first. The typeahead passes `q` and a small `limit`. */
export const usePeople = ({ q = '', limit = 100, enabled = true }: { q?: string; limit?: number; enabled?: boolean } = {}) => {
  const api = useApi();
  return useQuery({
    queryKey: personKeys.list(q, limit),
    queryFn: () => api.getPeople({ q, limit }),
    enabled,
    ...POLLING,
  });
};

/** One person with counts; idle while `id` is null. */
export const usePerson = (id: number | null) => {
  const api = useApi();
  return useQuery({
    queryKey: personKeys.one(id ?? 0),
    queryFn: () => api.getPerson(id as number),
    enabled: id !== null,
    ...POLLING,
  });
};

/** A person's open (`completed` false) or done todos, across areas; idle while `id` is null or `enabled` is false. */
export const usePersonTodos = (id: number | null, completed: boolean, enabled = true) => {
  const api = useApi();
  return useQuery({
    queryKey: personKeys.todos(id ?? 0, completed),
    queryFn: async (): Promise<Todo[]> => {
      const response = await api.getTodos({ person_id: id as number, completed });
      if (!response.success) throw new Error(response.message || 'Failed to load todos');
      return response.data;
    },
    enabled: id !== null && enabled,
    ...POLLING,
  });
};

/**
 * Person writes. Each rejects with an ApiError (no toast: the caller shows it
 * inline) and never retries. Renames, deletes and merges also refresh todo and
 * topic views, because rows show the person's name.
 */
export const usePeopleMutations = () => {
  const api = useApi();
  const queryClient = useQueryClient();
  const { broadcast } = useCrossTabSync();
  const stamp = (id: number) => ({ id, timestamp: Date.now() });
  const invalidateEverywhere = () => {
    invalidatePeopleViews(queryClient);
    invalidateTodoViews(queryClient);
    invalidateTopicViews(queryClient);
  };

  const create = useMutation({
    mutationFn: (input: CreatePersonRequest) => api.createPerson(input),
    retry: false,
    onSuccess: (person: Person) => {
      invalidatePeopleViews(queryClient);
      broadcast('PERSON_CREATED', stamp(person.id));
    },
  });

  const update = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: UpdatePersonRequest }) => api.updatePerson(id, updates),
    retry: false,
    onSuccess: (person: Person, { updates }) => {
      // A rename moves names on every row; a link change moves the chips' link state
      if (updates.display_name !== undefined || 'peopler_id' in updates) {
        invalidateEverywhere();
        // A link change moves "already linked" on every cached Peopler search
        if ('peopler_id' in updates) clearPeoplerSearches(queryClient);
      } else {
        invalidatePeopleViews(queryClient);
      }
      broadcast('PERSON_UPDATED', stamp(person.id));
    },
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.deletePerson(id),
    retry: false,
    onSuccess: (_result, id) => {
      invalidateEverywhere();
      broadcast('PERSON_DELETED', stamp(id));
    },
  });

  const merge = useMutation({
    mutationFn: ({ id, intoId }: { id: number; intoId: number }) => api.mergePerson(id, intoId),
    retry: false,
    onSuccess: (_survivor, { id }) => {
      queryClient.removeQueries({ queryKey: personKeys.one(id) });
      invalidateEverywhere();
      broadcast('PERSON_MERGED', stamp(id));
    },
  });

  return {
    createPerson: create.mutateAsync,
    updatePerson: (id: number, updates: UpdatePersonRequest) => update.mutateAsync({ id, updates }),
    deletePerson: remove.mutateAsync,
    mergePerson: (id: number, intoId: number) => merge.mutateAsync({ id, intoId }),
    isCreating: create.isPending,
    isUpdating: update.isPending,
    isDeleting: remove.isPending,
    isMerging: merge.isPending,
  };
};
