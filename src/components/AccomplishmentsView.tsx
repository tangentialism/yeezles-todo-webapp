import React, { useMemo } from 'react';
import { useTodoStore } from '../hooks/useTodoStore';
import { useArea } from '../contexts/AreaContext';
import { groupTodosByCompletionDate, formatCompletionDateGroup, calculateCompletionStats } from '../utils/todoGrouping';
import { extractTags, stripTags } from '../utils/todoText';
import { ViewEmpty, ViewError, ViewHeader, ViewLoading } from './ViewChrome';
import { CheckIcon } from './ui/Icons';
import type { Todo } from '../types/todo';
import type { Area } from '../types/area';

/** "MON 12" for a YYYY-MM-DD group key. */
const formatGroupDate = (dateKey: string) => {
  const date = new Date(`${dateKey}T00:00:00Z`);
  const weekday = date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }).toUpperCase();
  return `${weekday} ${date.getUTCDate()}`;
};

/**
 * The Done view: completed todos grouped by completion day (newest first),
 * headed by a totals line for today, this week and all time. Uses the
 * "completed" view of {@link useTodoStore}, grouped via
 * {@link groupTodosByCompletionDate}.
 */
const AccomplishmentsView: React.FC = () => {
  const { todos, isLoading, error } = useTodoStore({ view: 'completed' });
  const { areas } = useArea();

  const groupedTodos = useMemo(() => groupTodosByCompletionDate(todos), [todos]);
  const stats = useMemo(() => calculateCompletionStats(todos), [todos]);
  const areaById = useMemo(
    () => new Map((Array.isArray(areas) ? areas : []).map((area) => [area.id, area])),
    [areas]
  );

  if (isLoading) {
    return <ViewLoading label="Loading accomplishments..." />;
  }

  if (error) {
    return <ViewError title="Failed to load accomplishments" message="Please try again." />;
  }

  return (
    <div>
      <ViewHeader
        title="Done"
        totals={[
          { value: stats.completedToday, label: 'today', tone: 'accent' },
          { value: stats.completedThisWeek, label: 'this week' },
          { value: stats.totalCompleted, label: 'all time' },
        ]}
      />

      {todos.length === 0 ? (
        <ViewEmpty title="No accomplishments yet" message="Completed todos will collect here." />
      ) : (
        Object.entries(groupedTodos).map(([dateKey, todosForDate], index) => (
          <section
            key={dateKey}
            aria-label={formatCompletionDateGroup(dateKey)}
            className={`grid grid-cols-1 sm:grid-cols-[150px_minmax(0,1fr)] gap-x-6 gap-y-1.5 pt-[18px] pb-2.5 ${
              index > 0 ? 'border-t border-line' : ''
            }`}
          >
            <div>
              <h2 className="text-sm font-semibold text-ink">{formatCompletionDateGroup(dateKey)}</h2>
              <p className="mt-[3px] font-mono text-[11.5px] text-ink-faint">
                {formatGroupDate(dateKey)} · {todosForDate.length}
              </p>
            </div>
            <ul>
              {todosForDate.map((todo) => (
                <DoneItem
                  key={todo.id}
                  todo={todo}
                  area={todo.area_id !== null ? areaById.get(todo.area_id) : undefined}
                />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
};

/** A single completed todo: tick, title, area and tags, completion time. */
const DoneItem: React.FC<{ todo: Todo; area?: Area }> = ({ todo, area }) => {
  const completedTime = todo.completed_at
    ? new Date(todo.completed_at).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : '';
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
        {(area || tags.length > 0) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12.5px] text-ink-muted">
            {area && (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full flex-none" style={{ backgroundColor: area.color }} />
                {area.name}
              </span>
            )}
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

export default AccomplishmentsView;
