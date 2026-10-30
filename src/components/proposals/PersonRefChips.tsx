import React from 'react';
import type { DraftAction, DraftPersonRef } from '../../utils/proposalDraft';
import ProposalPersonChip from './ProposalPersonChip';

/** Props for {@link PersonRefChips}. */
interface PersonRefChipsProps {
  /** A new-todo key (`n:<i>`) or a people-row key (`pc:<i>`). */
  owner: string;
  refs: DraftPersonRef[];
  dispatch: React.Dispatch<DraftAction>;
}

/** One {@link ProposalPersonChip} per ref; × settles the ref as dropped. */
const PersonRefChips: React.FC<PersonRefChipsProps> = ({ owner, refs, dispatch }) => (
  <>
    {refs.map((item) => (
      <ProposalPersonChip
        key={item.key}
        item={item}
        onPick={(pick) => dispatch({ type: 'choosePerson', owner, refKey: item.key, pick })}
        onRemove={() => dispatch({ type: 'choosePerson', owner, refKey: item.key, pick: { kind: 'drop' } })}
      />
    ))}
  </>
);

export default PersonRefChips;
