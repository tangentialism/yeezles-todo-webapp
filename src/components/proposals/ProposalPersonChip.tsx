import React, { useRef, useState } from 'react';
import type { ChooserPick, DraftPersonRef } from '../../utils/proposalDraft';
import { needsYou } from '../../utils/proposalDraft';
import { CloseIcon } from '../ui/Icons';
import { chipBare, chipConfirmed, chipLinked, chipNeedsYou, fieldError } from '../ui/styles';
import PersonChooser from './PersonChooser';

/** Props for {@link ProposalPersonChip}. */
interface ProposalPersonChipProps {
  item: DraftPersonRef;
  onPick: (pick: ChooserPick) => void;
  onRemove: () => void;
}

const CHIP = 'inline-flex items-center gap-0.5 h-7 px-2.5 rounded-full border text-[13px] leading-none';

/** What a settled chip shows, and in which look. */
const settledChip = (item: DraftPersonRef): { label: string; look: string } => {
  const { chosen, resolved } = item;
  if (chosen?.kind === 'create') return { label: `+ ${chosen.name} · new`, look: chipConfirmed };
  if (chosen?.kind === 'person' || chosen?.kind === 'link') {
    return { label: chosen.person.display_name, look: chosen.person.peopler_id !== null ? chipLinked : chipBare };
  }
  if (chosen?.kind === 'drop') return { label: resolved.name, look: `${chipBare} line-through` };
  const { name, person, state } = resolved;
  if (state === 'new_confirmed') return { label: `+ ${name} · new, you confirmed in chat`, look: chipConfirmed };
  const look = person && person.peopler_id !== null ? chipLinked : chipBare;
  return { label: state === 'matched_by_name' ? `${name} · by name` : name, look };
};

/**
 * One proposed person on a new todo or a people row. A person the user must
 * settle is a dashed `? name` button that opens the chooser; every other chip
 * shows what will be tagged, with × to remove it.
 */
const ProposalPersonChip: React.FC<ProposalPersonChipProps> = ({ item, onPick, onRemove }) => {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const settled = !needsYou(item);

  const close = () => {
    setOpen(false);
    // Escape lands back on the chip; an outside click moves focus itself afterwards.
    buttonRef.current?.focus();
  };

  const error = item.error && (
    <p role="alert" className={fieldError}>
      {item.error}
    </p>
  );

  if (settled) {
    const { label, look } = settledChip(item);
    return (
      <span className="inline-flex flex-col">
        <span className={`${CHIP} pr-1 ${look}`}>
          {label}
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${item.chosen ? label : item.resolved.name}`}
            className="inline-flex items-center justify-center w-5 h-5 rounded-full text-ink-faint hover:text-ink hover:bg-hover"
          >
            <CloseIcon className="w-3 h-3" />
          </button>
        </span>
        {error}
      </span>
    );
  }

  return (
    <span className="relative inline-flex flex-col">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
        className={`${CHIP} ${chipNeedsYou}`}
      >
        {`? ${item.resolved.name}`}
      </button>
      {error}
      {open && (
        <PersonChooser
          item={item}
          onPick={(pick) => {
            setOpen(false);
            onPick(pick);
          }}
          onClose={close}
        />
      )}
    </span>
  );
};

export default ProposalPersonChip;
