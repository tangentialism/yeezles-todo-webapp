import React from 'react';
import type { Todo } from '../types/todo';
import type { Area } from '../types/area';
import { extractTags, stripTags } from '../utils/todoText';
import { getDueInfo } from '../utils/dueDate';
import type { DueKind } from '../utils/dueDate';
import TodoActions from './TodoActions';
import TodayToggle from './TodayToggle';
import TopicChip from './topics/TopicChip';
import { CheckIcon, ExternalLinkIcon } from './ui/Icons';

/** Display flags supplied by the owning store's `getTodoDisplayState`. */
interface RowDisplayState {
  completed: boolean;
  isPending?: boolean;
  isRemoving?: boolean;
}

/** Props for {@link TodoRow}. */
interface TodoRowProps {
  todo: Todo;
  displayState: RowDisplayState;
  /** The todo's area, shown as a dot and name when `showArea` is set. */
  area?: Area | null;
  showArea?: boolean;
  /** Show the topic chip (off in topic detail, where every row has that topic). */
  showTopic?: boolean;
  /** "today" says "Due" instead of "Today" and hides empty date cells. */
  variant?: 'all' | 'today';
  /** Show the sun toggle; when false a spacer keeps columns aligned. */
  showTodayToggle?: boolean;
  /** Play the entrance highlight (newly created todo). */
  isNew?: boolean;
  onToggleComplete: (todo: Todo) => void;
  onEdit: (todo: Todo) => void;
  onUpdate: () => void;
}

const WHEN_COLOR: Record<DueKind, string> = {
  none: 'text-ink-2',
  overdue: 'text-danger font-medium',
  today: 'text-accent font-medium',
  soon: 'text-ink-2',
  later: 'text-ink-2',
};

/**
 * One todo in a list: round completion tick, title with @tags pulled out
 * below it, area, reference link and notes, a due-date column, the Today sun
 * and the actions menu. A just-completed todo shows struck through with an
 * inline Undo until the list removes it.
 */
const TodoRow: React.FC<TodoRowProps> = ({
  todo,
  displayState,
  area,
  showArea = false,
  showTopic = true,
  variant = 'all',
  showTodayToggle = true,
  isNew = false,
  onToggleComplete,
  onEdit,
  onUpdate,
}) => {
  const { completed, isRemoving } = displayState;
  const title = stripTags(todo.title);
  const tags = extractTags(todo.title);
  const due = getDueInfo(todo.due_date);
  const whenLabel = variant === 'today' && due.kind === 'today' ? 'Due' : due.label;
  const topic = showTopic ? (todo.topic ?? null) : null;
  const hasMeta = (showArea && !!area) || !!topic || tags.length > 0 || !!todo.reference_url;

  return (
    <div
      role="listitem"
      aria-hidden={isRemoving || undefined}
      className={`group relative flex items-start gap-4 border-b border-line transition-all duration-300 ${
        isRemoving ? 'max-h-0 py-0 opacity-0 overflow-hidden pointer-events-none border-transparent' : 'max-h-[480px] py-[15px]'
      } ${completed ? 'bg-gradient-to-r from-transparent via-accent-soft to-transparent' : ''} ${
        isNew ? 'animate-row-fresh' : ''
      }`}
    >
      <button
        type="button"
        onClick={() => onToggleComplete(todo)}
        aria-label={completed ? `Mark "${title}" incomplete` : `Complete "${title}"`}
        aria-pressed={completed}
        className="group/check -my-2.5 -ml-3 -mr-2 w-11 h-11 flex-none inline-flex items-center justify-center rounded-full"
      >
        <span
          className={`w-[22px] h-[22px] rounded-full border-[1.5px] flex items-center justify-center text-white transition-colors ${
            completed
              ? 'bg-accent border-accent'
              : due.kind === 'overdue'
                ? 'border-danger group-hover/check:bg-accent-soft'
                : 'border-[#A2ACB8] group-hover/check:border-accent group-hover/check:bg-accent-soft'
          }`}
        >
          <CheckIcon
            className={`w-3 h-3 transition-all duration-200 ${completed ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
          />
        </span>
      </button>

      <div className="flex-1 min-w-0">
        <div
          className={`text-[16.5px] leading-6 font-medium break-words transition-colors ${
            completed ? 'text-ink-faint line-through decoration-line-strong font-normal' : 'text-ink'
          }`}
        >
          {title}
        </div>
        {hasMeta && (
          <div className="mt-[3px] flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[13px] text-ink-muted">
            {showArea && area && (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full flex-none" style={{ backgroundColor: area.color }} />
                {area.name}
              </span>
            )}
            {topic && <TopicChip topic={topic} color={area?.color} />}
            {tags.map((tag) => (
              <span key={tag} className="font-mono text-xs text-accent-ink">@{tag}</span>
            ))}
            {todo.reference_url && (
              <a
                href={todo.reference_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 text-ink-muted hover:text-accent"
                title="Open reference link"
              >
                <ExternalLinkIcon className="w-[13px] h-[13px]" />
                link
              </a>
            )}
          </div>
        )}
        {todo.description && (
          <p className={`mt-[3px] text-sm leading-5 break-words ${completed ? 'text-ink-faint' : 'text-ink-muted'}`}>
            {todo.description}
          </p>
        )}
      </div>

      {completed ? (
        <div className="flex items-center gap-3 flex-none -my-1.5">
          <span className="hidden sm:inline text-[13px] text-ink-muted">Completing…</span>
          <button
            type="button"
            onClick={() => onToggleComplete(todo)}
            className="h-9 px-3 rounded-full bg-ink text-paper text-[13px] font-medium hover:bg-ink-2"
          >
            Undo
          </button>
        </div>
      ) : (
        <>
          {(variant === 'all' || whenLabel) && (
            <span className={`flex-none ml-auto pt-[3px] min-w-[64px] text-right font-mono text-xs ${WHEN_COLOR[due.kind]}`}>
              {whenLabel || '—'}
            </span>
          )}
          <div className="flex items-center gap-0.5 flex-none -my-2 -mr-2.5">
            {showTodayToggle ? (
              <TodayToggle todo={todo} onUpdate={onUpdate} />
            ) : (
              <span className="w-10 h-10 flex-none" aria-hidden="true" />
            )}
            <div className="sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
              <TodoActions
                todo={todo}
                onEdit={onEdit}
                onUpdate={onUpdate}
                onToggleComplete={onToggleComplete}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TodoRow;
