import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useArea } from '../contexts/AreaContext';

/**
 * The review page hands back to the dashboard through router state
 * (addendum §4.3): which view, which area, which new topics to highlight.
 */
export interface TopicsHandoff {
  view: 'topics';
  /** The proposal's area; null when it no longer exists. */
  areaId: number | null;
  highlightTopicIds?: number[];
}

export const isTopicsHandoff = (state: unknown): state is TopicsHandoff =>
  typeof state === 'object' && state !== null && (state as { view?: unknown }).view === 'topics';

/**
 * Reads a hand-back from the review page once: selects its area (if it still
 * exists), reports it, and replaces the history entry so a reload does not
 * replay it. `onArrive` must be stable (useCallback).
 */
export const useTopicsHandoff = (onArrive: (handoff: TopicsHandoff) => void) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { areas, setCurrentArea } = useArea();
  const state: unknown = location.state;

  useEffect(() => {
    if (!isTopicsHandoff(state)) return;
    if (state.areaId !== null && areas.length === 0) return; // areas still loading
    const area = areas.find((a) => a.id === state.areaId);
    if (area) setCurrentArea(area);
    onArrive(state);
    navigate(location.pathname, { replace: true, state: null });
  }, [state, areas, setCurrentArea, onArrive, navigate, location.pathname]);
};
