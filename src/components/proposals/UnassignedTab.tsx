import React from 'react';
import type { Draft, DraftAction } from '../../utils/proposalDraft';
import TopicTargetSelect from './TopicTargetSelect';

/** Props for {@link UnassignedTab}. */
interface UnassignedTabProps {
  draft: Draft;
  dispatch: React.Dispatch<DraftAction>;
}

/** Open, topic-less todos the proposal did not mention; choosing a topic adds an assignment. */
const UnassignedTab: React.FC<UnassignedTabProps> = ({ draft, dispatch }) => {
  if (draft.unassigned.length === 0) {
    return <p className="py-8 text-sm text-ink-muted">Every open todo in this area is in the proposal or already has a topic.</p>;
  }
  return (
    <div role="list" aria-label="Unassigned todos">
      {draft.unassigned.map((todo) => {
        const row = draft.rows.find((r) => r.origin === 'unassigned' && r.todoId === todo.id);
        return (
          <div role="listitem" key={todo.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3 border-b border-line">
            <span className="flex-1 min-w-0 text-[15px] text-ink">{todo.title}</span>
            <div className="basis-full sm:basis-56">
              <TopicTargetSelect
                label={`Topic for "${todo.title}"`}
                value={row?.target ?? null}
                draft={draft}
                allowNone
                onSelect={(key) => dispatch({ type: 'setUnassigned', todoId: todo.id, target: key })}
                onCreate={(name) => dispatch({ type: 'addTopic', name, unassignedTodoId: todo.id })}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default UnassignedTab;
