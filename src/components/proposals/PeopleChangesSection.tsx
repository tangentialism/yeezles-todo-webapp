import React from 'react';
import Checkbox from '../ui/Checkbox';
import { chipBare, fieldError } from '../ui/styles';
import type { Draft, DraftAction, DraftPeopleRow } from '../../utils/proposalDraft';
import PersonRefChips from './PersonRefChips';

/** Props for {@link PeopleChangesSection}. */
interface PeopleChangesSectionProps {
  draft: Draft;
  dispatch: React.Dispatch<DraftAction>;
}

const CHIP = 'inline-flex items-center h-7 px-2.5 rounded-full border text-[13px] leading-none';

/** One removal: the name struck through while the removal stands, with a toggle to keep the person. */
const RemovalChip: React.FC<{ row: DraftPeopleRow; index: number; dispatch: React.Dispatch<DraftAction> }> = ({ row, index, dispatch }) => {
  const removal = row.remove[index];
  // A person who no longer exists shows by id (P9).
  const name = removal.person?.display_name ?? `person ${removal.person_id}`;
  return (
    <span
      role="group"
      aria-label={removal.kept ? `Remove ${name}` : undefined}
      className={`${CHIP} ${chipBare} gap-1.5`}
    >
      <span className={removal.kept ? 'line-through text-ink-faint' : ''}>{name}</span>
      <button
        type="button"
        aria-pressed={!removal.kept}
        aria-label={removal.kept ? `Keep ${name}` : `Remove ${name}`}
        onClick={() => dispatch({ type: 'toggleRemoval', key: row.key, personId: removal.person_id })}
        className="text-[11px] font-mono text-accent-ink hover:underline"
      >
        {removal.kept ? 'keep' : 'undo'}
      </button>
    </span>
  );
};

/** One proposed people change on an existing todo. */
const PeopleRow: React.FC<{ row: DraftPeopleRow; dispatch: React.Dispatch<DraftAction> }> = ({ row, dispatch }) => {
  const { change } = row;
  const title = change.title ?? `Todo #${change.todo_id}`;
  const checked = row.accepted && !change.missing;
  return (
    <div
      role="listitem"
      data-draft-error={row.error ? 'true' : undefined}
      className={`flex flex-wrap items-start gap-x-3 gap-y-2 py-3 border-b border-line ${checked ? '' : 'opacity-70'}`}
    >
      <span className="pt-0.5">
        <Checkbox
          checked={checked}
          disabled={change.missing}
          onChange={() => dispatch({ type: 'togglePeopleRow', key: row.key })}
          aria-label={`Change people on "${title}"`}
        />
      </span>
      <div className="flex-1 min-w-0">
        <div className={`text-[15px] leading-6 ${change.missing ? 'line-through text-ink-faint' : 'text-ink'}`}>{title}</div>
        <div className="text-[12.5px] text-ink-muted">
          {change.missing ? 'This todo no longer exists' : (change.current_topic?.name ?? 'No topic')}
        </div>
        {!change.missing && (
          <div className="mt-1.5 flex flex-wrap items-start gap-1.5">
            {row.add.length > 0 && <span aria-hidden="true" className="h-7 inline-flex items-center text-ink-muted">+</span>}
            <PersonRefChips owner={row.key} refs={row.add} dispatch={dispatch} />
            {row.remove.map((r, i) => <RemovalChip key={r.person_id} row={row} index={i} dispatch={dispatch} />)}
          </div>
        )}
        {row.error && <p role="alert" className={fieldError}>{row.error}</p>}
      </div>
    </div>
  );
};

/** Proposed people changes on existing todos; shown after the topic sections. */
const PeopleChangesSection: React.FC<PeopleChangesSectionProps> = ({ draft, dispatch }) => (
  <section aria-label="People" className="pt-7">
    <div className="pb-2 border-b-[1.5px] border-ink">
      <h2 className="font-medium text-[17px] text-ink">People</h2>
    </div>
    <div role="list">
      {draft.peopleRows.map((row) => <PeopleRow key={row.key} row={row} dispatch={dispatch} />)}
    </div>
  </section>
);

export default PeopleChangesSection;
