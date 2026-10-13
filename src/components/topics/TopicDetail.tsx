import React from 'react';

/** Props for {@link TopicDetail}. */
export interface TopicDetailProps {
  topicId: number;
  onBack: () => void;
}

/** Topic detail (filled in by Task 6). */
const TopicDetail: React.FC<TopicDetailProps> = ({ topicId, onBack }) => (
  <div>
    <button type="button" onClick={onBack}>
      ← Topics
    </button>
    <div>Topic {topicId}</div>
  </div>
);

export default TopicDetail;
