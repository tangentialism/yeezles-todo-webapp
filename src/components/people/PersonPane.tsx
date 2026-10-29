import React, { useState } from 'react';
import { useArea } from '../../contexts/AreaContext';
import { usePerson, usePersonTodos } from '../../hooks/usePeopleStore';
import { useTodoStore } from '../../hooks/useTodoStore';
import { isApiError } from '../../services/apiError';
import { groupByArea } from '../../utils/groupByArea';
import type { Todo } from '../../types/todo';
import TodoRow from '../TodoRow';
import DoneItem from '../DoneItem';
import EditTodoModal from '../EditTodoModal';
import Switch from '../ui/Switch';
import { ViewError, ViewLoading } from '../ViewChrome';
import { ghostButton, sectionCap } from '../ui/styles';

/** Props for {@link PersonPane}. */
export interface PersonPaneProps {
  personId: number;
  /** Phone back control: returns to the list. */
  onBack: () => void;
}

/**
 * One person: header with aliases and counts, their open todos grouped by area,
 * and a Show completed switch for the done ones. Loads by id and sends no area,
 * so it spans every area and ignores the area switcher. Mounted with
 * `key={personId}` so state never carries from one person to the next.
 */
const PersonPane: React.FC<PersonPaneProps> = ({ personId, onBack }) => {
  const { areas } = useArea();
  const { data: person, isLoading, error, refetch } = usePerson(personId);
  const [showDone, setShowDone] = useState(false);
  const { data: openTodos = [], error: openError, refetch: refetchOpen } = usePersonTodos(personId, false);
  const { data: doneTodos = [] } = usePersonTodos(personId, true, showDone);
  const { toggleTodoCompletion, getTodoDisplayState } = useTodoStore();
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);

  const back = (
    <button type="button" onClick={onBack} className={`${ghostButton} -ml-4 mb-2 sm:hidden`}>
      ← People
    </button>
  );

  if (isLoading) return <div>{back}<ViewLoading label="Loading person..." /></div>;
  if (error || !person) {
    return (
      <div>
        {back}
        {isApiError(error, 'PERSON_NOT_FOUND') ? (
          <ViewError title="Person not found" message="Person not found. They may have been deleted or merged." />
        ) : (
          <ViewError
            title="Could not load this person"
            message={error instanceof Error ? error.message : 'Please try again.'}
            onRetry={() => refetch()}
          />
        )}
      </div>
    );
  }

  const nothingTagged = openTodos.length === 0 && doneTodos.length === 0 && person.done_count === 0;

  const row = (todo: Todo) => (
    <TodoRow
      key={todo.id}
      todo={todo}
      displayState={getTodoDisplayState(todo)}
      showArea={false}
      hidePersonId={personId}
      onToggleComplete={(t) => {
        void toggleTodoCompletion(t);
      }}
      onEdit={setEditingTodo}
      onUpdate={() => {}}
    />
  );

  const heading = (area: { name: string; color: string } | null) => (
    <h3 className={`${sectionCap} flex items-center gap-2 mt-6 mb-1`}>
      {area && <span aria-hidden="true" className="w-2 h-2 rounded-full" style={{ backgroundColor: area.color }} />}
      {area ? area.name : 'No area'}
    </h3>
  );

  return (
    <div>
      {back}
      <div className="flex items-start gap-3 pb-3 border-b-[1.5px] border-ink">
        <div className="flex-1 min-w-0">
          <h2 className="font-serif font-medium text-[30px] sm:text-4xl leading-[1.1] tracking-[-0.015em] text-ink">
            {person.display_name}
          </h2>
          {person.aliases.length > 0 && <p className="mt-1 text-[13px] text-ink-muted">{person.aliases.join(', ')}</p>}
          <p className="mt-1.5 text-[13px] text-ink-muted">
            <span className="font-mono">{person.open_count} open · {person.done_count} done</span>
          </p>
        </div>
        {/* Actions slot: the person menu (rename, aliases, merge, delete) lands here. */}
        <div data-slot="person-actions" />
      </div>

      {openError ? (
        <ViewError
          title="Could not load todos"
          message={openError instanceof Error ? openError.message : 'Please try again.'}
          onRetry={() => refetchOpen()}
        />
      ) : nothingTagged ? (
        <p className="py-6 text-sm text-ink-muted">Nothing tagged.</p>
      ) : (
        <>
          {openTodos.length === 0 && <p className="py-4 text-sm text-ink-muted">No open todos.</p>}
          {groupByArea(openTodos, areas).map(({ area, todos }) => (
            <section key={area?.id ?? 'none'} aria-label={area?.name ?? 'No area'}>
              {heading(area)}
              <div role="list">{todos.map(row)}</div>
            </section>
          ))}

          <div className="mt-8 flex items-center gap-3">
            <Switch id={`show-completed-${personId}`} checked={showDone} onChange={setShowDone} />
            <label htmlFor={`show-completed-${personId}`} className="text-sm text-ink-2">Show completed</label>
          </div>
          {showDone && (
            <div aria-label="Done todos" role="list">
              {groupByArea(doneTodos, areas).map(({ area, todos }) => (
                <section key={area?.id ?? 'none'} aria-label={`Done in ${area?.name ?? 'No area'}`}>
                  {heading(area)}
                  <ul>
                    {todos.map((todo) => (
                      <DoneItem key={todo.id} todo={todo} hidePersonId={personId} />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </>
      )}

      <EditTodoModal
        todo={editingTodo}
        isOpen={editingTodo !== null}
        onClose={() => setEditingTodo(null)}
        onTodoUpdated={() => setEditingTodo(null)}
      />
    </div>
  );
};

export default PersonPane;
