import React from 'react';
import type { TopicRef } from '../../types/topic';
import { useOpenTopic } from '../../hooks/useOpenTopic';

/** Props for {@link TopicChip}. */
interface TopicChipProps {
  topic: TopicRef;
  /** The topic's area colour, used for the outline. */
  color?: string;
}

const CHIP =
  'inline-flex items-center h-[22px] px-2 rounded-full border border-line-strong text-[12.5px] leading-none text-ink-2';

/**
 * A todo's topic, outlined in its area's colour. Inside the dashboard it is a
 * button that opens the topic in the Topics tab.
 */
const TopicChip: React.FC<TopicChipProps> = ({ topic, color }) => {
  const openTopic = useOpenTopic();
  const style = color ? { borderColor: color } : undefined;

  if (!openTopic) {
    return (
      <span className={CHIP} style={style}>
        {topic.name}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        openTopic(topic.id);
      }}
      aria-label={`Open topic ${topic.name}`}
      className={`${CHIP} hover:bg-hover hover:text-ink transition-colors`}
      style={style}
    >
      {topic.name}
    </button>
  );
};

export default TopicChip;
