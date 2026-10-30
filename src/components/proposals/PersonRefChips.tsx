import React, { useRef } from 'react';
import type { DraftAction, DraftPersonRef } from '../../utils/proposalDraft';
import ProposalPersonChip from './ProposalPersonChip';

/** Props for {@link PersonRefChips}. */
interface PersonRefChipsProps {
  /** A new-todo key (`n:<i>`) or a people-row key (`pc:<i>`). */
  owner: string;
  refs: DraftPersonRef[];
  dispatch: React.Dispatch<DraftAction>;
  /** Where focus goes when the last chip is dropped (the owner's "+ person" button or row checkbox). */
  fallbackFocus?: () => void;
}

/** One {@link ProposalPersonChip} per ref; × settles the ref as dropped and moves focus on to the next chip. */
const PersonRefChips: React.FC<PersonRefChipsProps> = ({ owner, refs, dispatch, fallbackFocus }) => {
  const buttons = useRef(new Map<string, HTMLButtonElement>());

  const drop = (index: number) => {
    const next = refs[index + 1];
    const el = next ? buttons.current.get(next.key) : undefined;
    if (el) el.focus();
    else fallbackFocus?.();
  };

  return (
    <>
      {refs.map((item, index) => (
        <ProposalPersonChip
          key={item.key}
          item={item}
          focusRef={(el) => {
            if (el) buttons.current.set(item.key, el);
            else buttons.current.delete(item.key);
          }}
          onPick={(pick) => {
            dispatch({ type: 'choosePerson', owner, refKey: item.key, pick });
            if (pick.kind === 'drop') drop(index);
          }}
          onRemove={() => {
            dispatch({ type: 'choosePerson', owner, refKey: item.key, pick: { kind: 'drop' } });
            drop(index);
          }}
        />
      ))}
    </>
  );
};

export default PersonRefChips;
