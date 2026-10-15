import React from 'react';
import { noTopicTodos } from '../../utils/proposalDraft';
import type { Draft, DraftAction } from '../../utils/proposalDraft';
import NewTodoRow from './NewTodoRow';

/** Props for {@link NoTopicSection}. */
interface NoTopicSectionProps {
  draft: Draft;
  dispatch: React.Dispatch<DraftAction>;
}

/** New todos that will be created with no topic; shown after the topic sections. */
const NoTopicSection: React.FC<NoTopicSectionProps> = ({ draft, dispatch }) => (
  <section aria-label="No topic" className="pt-7">
    <div className="pb-2 border-b-[1.5px] border-ink">
      <h2 className="font-medium text-[17px] text-ink">No topic</h2>
    </div>
    <div role="list">
      {noTopicTodos(draft).map((row) => (
        <NewTodoRow key={row.key} row={row} draft={draft} dispatch={dispatch} />
      ))}
    </div>
  </section>
);

export default NoTopicSection;
