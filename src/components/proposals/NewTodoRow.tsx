import React from 'react';
import Checkbox from '../ui/Checkbox';
import { fieldError } from '../ui/styles';
import type { Draft, DraftAction, DraftNewTodo } from '../../utils/proposalDraft';
import { formatShortDate } from '../../utils/date';
import TopicTargetSelect from './TopicTargetSelect';

/** Props for {@link NewTodoRow}. */
interface NewTodoRowProps {
  row: DraftNewTodo;
  draft: Draft;
  dispatch: React.Dispatch<DraftAction>;
}

/** A due date is stored as `YYYY-MM-DD`; read it as local so the day does not shift. */
const dueLabel = (due: string): string => formatShortDate(due.length === 10 ? `${due}T00:00:00` : due);

/**
 * One todo the proposal would create (spec §7): a checkbox, a "New" badge so it
 * is not mistaken for an existing todo being moved, read-only title, due date and
 * Today flag, and a topic select whose empty option reads "No topic".
 */
const NewTodoRow: React.FC<NewTodoRowProps> = ({ row, draft, dispatch }) => {
  const { todo } = row;
  return (
    <div
      role="listitem"
      data-draft-error={row.error ? 'true' : undefined}
      className={`flex flex-wrap items-start gap-x-3 gap-y-2 py-3 border-b border-line ${row.accepted ? '' : 'opacity-70'}`}
    >
      <span className="pt-0.5">
        <Checkbox
          checked={row.accepted}
          onChange={() => dispatch({ type: 'toggleNewTodo', key: row.key })}
          aria-label={`Create "${todo.title}"`}
        />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[15px] leading-6 text-ink">
          <span className="mr-2 font-mono text-[11px] font-medium tracking-[0.12em] text-accent-ink">New</span>
          {todo.title}
        </div>
        {(todo.due_date || todo.is_today) && (
          <div className="flex gap-3 font-mono text-[12.5px] text-ink-muted">
            {todo.due_date && <span>{`due ${dueLabel(todo.due_date)}`}</span>}
            {todo.is_today && <span>Today</span>}
          </div>
        )}
        {row.missingTopic && (
          <p className="text-[12.5px] text-accent-ink">{`Claude proposed '${row.missingTopic}', which no longer exists`}</p>
        )}
        {row.error && <p className={fieldError}>{row.error}</p>}
      </div>
      <div className="basis-full sm:basis-56">
        <TopicTargetSelect
          label={`Topic for "${todo.title}"`}
          value={row.target}
          draft={draft}
          allowNone
          noneLabel="No topic"
          onSelect={(target) => dispatch({ type: 'redirectNewTodo', key: row.key, target })}
          onCreate={(name) => dispatch({ type: 'addTopic', name, newTodoKey: row.key })}
        />
      </div>
    </div>
  );
};

export default NewTodoRow;
