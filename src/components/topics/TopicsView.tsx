import React from 'react';
import { ViewHeader } from '../ViewChrome';

/** Props for {@link TopicsView}. */
export interface TopicsViewProps {
  openTopicId: number | null;
  onOpenTopic: (id: number) => void;
  onCloseTopic: () => void;
}

/** The Topics tab (filled in by Task 5). */
const TopicsView: React.FC<TopicsViewProps> = () => <ViewHeader title="Topics" totals={[]} />;

export default TopicsView;
