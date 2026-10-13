import { useQuery } from '@tanstack/react-query';
import { useApi } from './useApi';
import { fetchTodayView, todayViewQueryKey } from './useTodayViewStore';
import { countOpenFocusTodos } from '../utils/todayFocus';
import type { TodayView } from '../types/todo';
import type { Area, AreaWithStats } from '../types/area';

/**
 * Open todos in today's focus, for the count beside the Today tab.
 *
 * A passive observer of the Today view query that `TodayView` (always mounted
 * by `ViewContainer`) already fetches and keeps fresh, including its
 * optimistic updates. It never fetches itself (`enabled: false`), so the
 * count costs no extra request. It still carries the real query function:
 * observers share one query, and with `skipToken` an invalidation refetch
 * could run with this observer's options and fail with "Missing queryFn"
 * (B2). The key must match the Today view's defaults (`includeDueToday:
 * true`, no `daysAhead`).
 *
 * @returns The open count, or `null` until the Today view has loaded.
 */
export const useTodayOpenCount = (): number | null => {
  const apiClient = useApi();
  const { data } = useQuery<TodayView>({
    queryKey: todayViewQueryKey(true, undefined),
    queryFn: () => fetchTodayView(apiClient, true, undefined),
    enabled: false,
  });
  return data ? countOpenFocusTodos(data) : null;
};

/** Open-todo counts per area id, plus their sum for "All areas". */
export interface AreaOpenCounts {
  byArea: Map<number, number>;
  total: number;
}

/**
 * Open-todo counts per area from `GET /areas?include_stats=true`
 * (`stats.pending_todos`). Call it from the area menu only while the menu is
 * open: it fetches once per opening and shows the cached figures meanwhile,
 * so counts reflect todos completed since the last look without polling.
 * Shares the `['areas', …]` key prefix, so area create/edit/delete
 * invalidations refresh it too.
 *
 * @returns The counts, or `null` before the first response or when the API
 *   returns no stats.
 */
export const useAreaOpenCounts = (): AreaOpenCounts | null => {
  const apiClient = useApi();
  const { data } = useQuery({
    queryKey: ['areas', { includeStats: true }],
    queryFn: async () => {
      const response = await apiClient.getAreas(true);
      if (!response.success) {
        throw new Error(response.message || 'Failed to load area counts');
      }
      const payload = response.data as Area[] | AreaWithStats[] | { areas: AreaWithStats[] };
      const list = Array.isArray(payload) ? payload : payload?.areas;
      return Array.isArray(list) ? (list as AreaWithStats[]) : [];
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  if (!data) return null;
  const byArea = new Map<number, number>();
  for (const area of data) {
    const open = area.stats?.pending_todos;
    if (typeof open === 'number') byArea.set(area.id, open);
  }
  if (byArea.size === 0) return null;
  let total = 0;
  byArea.forEach((n) => {
    total += n;
  });
  return { byArea, total };
};
