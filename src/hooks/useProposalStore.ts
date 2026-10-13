import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from './useApi';
import { useCrossTabSync } from './useCrossTabSync';
import { invalidateTodoViews, invalidateTopicViews } from './topicInvalidation';
import { retryUnlessClientError } from '../services/apiError';
import type { TopicChangesPayload } from '../types/proposal';
import { BACKGROUND_SYNC_INTERVAL_MS } from '../constants';

export const proposalKeys = {
  pending: ['proposals', 'pending'] as const,
  one: (id: number) => ['proposal', id] as const,
};

/** Pending proposals, for the Topics badge and banner. Polled like todos. */
export const usePendingProposals = () => {
  const api = useApi();
  return useQuery({
    queryKey: proposalKeys.pending,
    queryFn: () => api.listProposals('pending'),
    staleTime: 30_000,
    refetchInterval: BACKGROUND_SYNC_INTERVAL_MS,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    retry: retryUnlessClientError,
  });
};

/**
 * One proposal resolved for review. Fetched once per visit (plan
 * discrepancy 6): a refetch would rebuild the draft under the user's edits.
 * `gcTime: 0` drops it on leaving, so the next visit fetches fresh.
 * Invalidation (409, cross-tab PROPOSAL_RESOLVED) still refetches it.
 */
export const useProposal = (id: number | null) => {
  const api = useApi();
  return useQuery({
    queryKey: proposalKeys.one(id ?? 0),
    queryFn: () => api.getProposal(id as number),
    enabled: id !== null,
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
    retry: retryUnlessClientError,
  });
};

/** Apply and reject. Both reject with ApiError and never retry. */
export const useProposalActions = () => {
  const api = useApi();
  const queryClient = useQueryClient();
  const { broadcast } = useCrossTabSync();

  const afterResolve = (id: number) => {
    queryClient.invalidateQueries({ queryKey: ['proposals'] });
    queryClient.invalidateQueries({ queryKey: proposalKeys.one(id) });
    invalidateTopicViews(queryClient);
    invalidateTodoViews(queryClient);
    broadcast('PROPOSAL_RESOLVED', { id, timestamp: Date.now() });
  };

  const apply = useMutation({
    mutationFn: ({ id, accepted }: { id: number; accepted: TopicChangesPayload }) => api.applyProposal(id, accepted),
    retry: false,
    onSuccess: (_result, { id }) => afterResolve(id),
  });

  const reject = useMutation({
    mutationFn: (id: number) => api.rejectProposal(id),
    retry: false,
    onSuccess: (_result, id) => afterResolve(id),
  });

  return {
    applyProposal: (id: number, accepted: TopicChangesPayload) => apply.mutateAsync({ id, accepted }),
    rejectProposal: reject.mutateAsync,
    isApplying: apply.isPending,
    isRejecting: reject.isPending,
  };
};
