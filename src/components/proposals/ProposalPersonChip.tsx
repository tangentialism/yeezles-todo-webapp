import React, { useEffect, useRef, useState } from 'react';
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
  /** Receives the chip's one focusable button (the chooser opener, or × once settled), for the owner to move focus to. */
  focusRef?: (el: HTMLButtonElement | null) => void;
}

const CHIP = 'inline-flex items-center gap-0.5 h-7 px-2.5 rounded-full border text-[13px] leading-none';

/** What a settled chip shows, and in which look. */
const settledChip = (item: DraftPersonRef): { label: string; look: string } => {
  const { chosen, resolved } = item;
  if (chosen?.kind === 'create') return { label: `+ ${chosen.name} · new`, look: chipConfirmed };
  if (chosen?.kind === 'link') return { label: chosen.person.display_name, look: chipLinked };
  if (chosen?.kind === 'person') {
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
const ProposalPersonChip: React.FC<ProposalPersonChipProps> = ({ item, onPick, onRemove, focusRef }) => {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const removeRef = useRef<HTMLButtonElement>(null);
  const focusAfterPick = useRef(false);
  const settled = !needsYou(item);

  const setButton = (ref: React.MutableRefObject<HTMLButtonElement | null>) => (el: HTMLButtonElement | null) => {
    ref.current = el;
    focusRef?.(el);
  };

  // A pick unmounts the chooser, which held focus: land on the settled chip's × instead of <body>.
  useEffect(() => {
    if (focusAfterPick.current && settled) {
      focusAfterPick.current = false;
      removeRef.current?.focus();
    }
  }, [settled, item.chosen]);

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
    // Name the person, not the chip text ("+ Dana · new").
    const personName =
      item.chosen?.kind === 'create' ? item.chosen.name
      : item.chosen?.kind === 'person' || item.chosen?.kind === 'link' ? item.chosen.person.display_name
      : item.resolved.name;
    return (
      <span className="inline-flex flex-col">
        <span className={`${CHIP} pr-1 ${look}`}>
          {label}
          <button
            type="button"
            ref={setButton(removeRef)}
            onClick={onRemove}
            aria-label={`Remove ${personName}`}
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
        ref={setButton(buttonRef)}
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
            if (pick.kind !== 'drop') focusAfterPick.current = true;
            onPick(pick);
          }}
          onClose={close}
        />
      )}
    </span>
  );
};

export default ProposalPersonChip;
