import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from './useApi';
import { useCrossTabSync } from './useCrossTabSync';
import { invalidateTodoViews, invalidateTopicViews, topicKeys } from './topicInvalidation';
import { retryUnlessClientError } from '../services/apiError';
import type { Todo } from '../types/todo';
import type { CreateTopicRequest, Topic, TopicWithCounts, UpdateTopicRequest } from '../types/topic';
import { BACKGROUND_SYNC_INTERVAL_MS } from '../constants';

export { topicKeys, invalidateTopicViews };

const POLLING = {
  staleTime: 30_000,
  refetchInterval: BACKGROUND_SYNC_INTERVAL_MS,
  refetchOnWindowFocus: true,
  retry: retryUnlessClientError,
} as const;

/** Topics with counts; `areaId` null lists every area. Sorted by name by the backend. */
export const useTopics = ({ areaId = null, includeArchived = false }: { areaId?: number | null; includeArchived?: boolean } = {}) => {
  const api = useApi();
  return useQuery({
    queryKey: topicKeys.list(areaId, includeArchived),
    queryFn: () => api.getTopics({ areaId, includeArchived }),
    ...POLLING,
  });
};

/** One topic with counts; idle while `id` is null. */
export const useTopic = (id: number | null) => {
  const api = useApi();
  return useQuery({
    queryKey: topicKeys.one(id ?? 0),
    queryFn: () => api.getTopic(id as number),
    enabled: id !== null,
    ...POLLING,
  });
};

/** A topic's open (`completed` false) or done todos, across areas; idle while `id` is null. */
export const useTopicTodos = (id: number | null, completed: boolean) => {
  const api = useApi();
  return useQuery({
    queryKey: topicKeys.todos(id ?? 0, completed),
    queryFn: async (): Promise<Todo[]> => {
      const response = await api.getTodos({ topic_id: id as number, completed });
      if (!response.success) throw new Error(response.message || 'Failed to load todos');
      return response.data;
    },
    enabled: id !== null,
    ...POLLING,
  });
};

/**
 * Topic writes. Each rejects with an ApiError (no toast: the caller shows it
 * inline or as a toast) and never retries (plan discrepancy 7).
 */
export const useTopicMutations = () => {
  const api = useApi();
  const queryClient = useQueryClient();
  const { broadcast } = useCrossTabSync();
  const stamp = (id: number) => ({ id, timestamp: Date.now() });

  const create = useMutation({
    mutationFn: (input: CreateTopicRequest) => api.createTopic(input),
    retry: false,
    onSuccess: (topic: Topic) => {
      invalidateTopicViews(queryClient);
      broadcast('TOPIC_CREATED', stamp(topic.id));
    },
  });

  const update = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: UpdateTopicRequest }) => api.updateTopic(id, updates),
    retry: false,
    onSuccess: (topic: Topic, { updates }) => {
      invalidateTopicViews(queryClient);
      if (updates.name !== undefined) invalidateTodoViews(queryClient);
      broadcast('TOPIC_UPDATED', stamp(topic.id));
    },
  });

  const setNote = useMutation({
    mutationFn: ({ id, statusNote }: { id: number; statusNote: string | null }) => api.setTopicNote(id, statusNote),
    retry: false,
    onSuccess: (topic: Topic) => {
      queryClient.setQueryData<TopicWithCounts>(topicKeys.one(topic.id), (old) => (old ? { ...old, ...topic } : old));
      queryClient.invalidateQueries({ queryKey: ['topics'] });
      broadcast('TOPIC_UPDATED', stamp(topic.id));
    },
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.deleteTopic(id),
    retry: false,
    onSuccess: (_result, id) => {
      invalidateTopicViews(queryClient);
      invalidateTodoViews(queryClient);
      broadcast('TOPIC_DELETED', stamp(id));
    },
  });

  return {
    createTopic: create.mutateAsync,
    updateTopic: (id: number, updates: UpdateTopicRequest) => update.mutateAsync({ id, updates }),
    setTopicNote: (id: number, statusNote: string | null) => setNote.mutateAsync({ id, statusNote }),
    deleteTopic: remove.mutateAsync,
    isCreating: create.isPending,
    isUpdating: update.isPending,
    isSavingNote: setNote.isPending,
    isDeleting: remove.isPending,
  };
};
