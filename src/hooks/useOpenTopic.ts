import { createContext, useContext } from 'react';

/**
 * Opens a topic in the Topics tab. Provided by Dashboard; absent elsewhere
 * (external-create pages, tests), where chips render as plain text
 * (plan discrepancy 3).
 */
export const TopicNavigationContext = createContext<((topicId: number) => void) | null>(null);

/** The dashboard's "open this topic" action, or null outside the dashboard. */
export const useOpenTopic = () => useContext(TopicNavigationContext);
