import React from 'react';
import type { TopicWithCounts } from '../../types/topic';
import { isStale } from '../../utils/topicStaleness';
import { formatRelative } from '../../utils/date';

/** Props for {@link TopicCard}. */
interface TopicCardProps {
  topic: TopicWithCounts;
  /** The topic's area colour. */
  color?: string;
  /** Reference time for the age and the stale marker. */
  now: Date;
  /** Play the new-item highlight (topics just created by a proposal). */
  highlighted?: boolean;
  onOpen: (id: number) => void;
}

/**
 * One topic in the Topics tab: name, open/done counts, the first two lines of
 * the status note and its age, with a quiet "stale" marker (spec §5.1).
 */
const TopicCard: React.FC<TopicCardProps> = ({ topic, color, now, highlighted = false, onOpen }) => {
  const stale = isStale(topic, now);
  return (
    <button
      type="button"
      onClick={() => onOpen(topic.id)}
      className={`w-full text-left rounded-[14px] border border-line bg-surface px-4 py-3.5 hover:border-ink-faint transition-colors ${
        highlighted ? 'bg-accent-soft' : ''
      }`}
    >
      <span className="flex items-baseline gap-2">
        {color && <span aria-hidden="true" className="w-2 h-2 rounded-full flex-none self-center" style={{ backgroundColor: color }} />}
        <span className="flex-1 min-w-0 font-medium text-[15.5px] text-ink truncate">{topic.name}</span>
        {stale && (
          <span className="inline-flex items-center gap-1 text-[12px] text-accent-ink">
            <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-accent" />
            stale
          </span>
        )}
      </span>
      <span className="mt-0.5 block font-mono text-xs text-ink-muted">
        {topic.open_count} open · {topic.done_count} done
      </span>
      {topic.status_note ? (
        <span className="mt-2 block text-sm leading-5 text-ink-2 line-clamp-2 break-words">{topic.status_note}</span>
      ) : (
        <span className="mt-2 block text-sm leading-5 text-ink-faint">No status note yet</span>
      )}
      {topic.status_note && topic.status_note_updated_at && (
        <span className="mt-1.5 block text-[12px] text-ink-faint">
          Note updated {formatRelative(topic.status_note_updated_at, now)}
        </span>
      )}
    </button>
  );
};

export default TopicCard;
