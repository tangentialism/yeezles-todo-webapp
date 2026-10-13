import React from 'react';
import { extractTags, stripTags } from '../utils/todoText';
import { CheckIcon } from './ui/Icons';
import TopicChip from './topics/TopicChip';
import type { Todo } from '../types/todo';
import type { Area } from '../types/area';

/** Props for {@link DoneItem}. */
interface DoneItemProps {
  todo: Todo;
  /** The todo's area, shown as a dot and name. */
  area?: Area;
  /** Show the topic chip (off in topic detail, where every row has that topic). */
  showTopic?: boolean;
}

/**
 * A single completed todo: tick, title, area, topic and tags, completion time.
 * Static: unlike {@link TodoRow} it has no in-progress "Completing…" state, so
 * it suits lists of todos that are already done (the Done view, topic detail).
 */
const DoneItem: React.FC<DoneItemProps> = ({ todo, area, showTopic = true }) => {
  const completedTime = todo.completed_at
    ? new Date(todo.completed_at).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : '';
  const topic = showTopic ? (todo.topic ?? null) : null;
  const tags = todo.tags && todo.tags.length > 0 ? todo.tags : extractTags(todo.title);

  return (
    <li className="flex items-start gap-3 py-[7px]">
      <span
        className="mt-0.5 w-[18px] h-[18px] rounded-full bg-accent text-white flex items-center justify-center flex-none"
        aria-hidden="true"
      >
        <CheckIcon className="w-2.5 h-2.5" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] leading-[22px] text-ink-2 break-words">{stripTags(todo.title)}</p>
        {todo.description && (
          <p className="text-[13px] text-ink-muted line-clamp-2">{todo.description}</p>
        )}
        {(area || topic || tags.length > 0) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12.5px] text-ink-muted">
            {area && (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full flex-none" style={{ backgroundColor: area.color }} />
                {area.name}
              </span>
            )}
            {topic && <TopicChip topic={topic} color={area?.color} />}
            {tags.map((tag) => (
              <span key={tag} className="font-mono text-xs text-accent-ink">@{tag.replace(/^@/, '')}</span>
            ))}
          </div>
        )}
      </div>
      <span className="flex-none pt-0.5 font-mono text-xs text-ink-faint">{completedTime}</span>
    </li>
  );
};

export default DoneItem;
