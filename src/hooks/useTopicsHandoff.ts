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
