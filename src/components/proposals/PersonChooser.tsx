import React, { useEffect, useId, useRef, useState } from 'react';
import type { PersonCandidateDetail, PersonRef, TodoPerson } from '../../types/person';
import type { ChooserPick, DraftPersonRef } from '../../utils/proposalDraft';
import PeopleField from '../people/PeopleField';

/** Props for {@link PersonChooser}. */
interface PersonChooserProps {
  item: DraftPersonRef;
  onPick: (pick: ChooserPick) => void;
  onClose: () => void;
}

const HEADINGS = {
  new: (name: string) => `${name} isn't one of your people.`,
  ambiguous: (name: string) => `More than one person is called ${name}.`,
  link_candidate: (name: string) => `${name} in Peopler may be someone you already have.`,
  possible_match: (name: string) => `${name} is close to someone you already have.`,
  gone: () => 'This person no longer exists.',
} as const;

type ChooserKind = keyof typeof HEADINGS;

/** Which layout a ref gets. A settled state that was refused (a 422) is offered as a new name. */
const layoutFor = (item: DraftPersonRef): ChooserKind => {
  const { state } = item.resolved;
  return state in HEADINGS ? (state as ChooserKind) : 'new';
};

/** The `peopler_id` the original ref carried, if any (P6). */
const peoplerIdOf = (ref: PersonRef): number | undefined => {
  if ('peopler_id' in ref) return ref.peopler_id;
  if ('create' in ref) return ref.create.peopler_id;
  if ('link' in ref) return ref.link.peopler_id;
  return undefined;
};

/** A candidate as the person a pick writes (P1). */
const asTodoPerson = (c: PersonCandidateDetail): TodoPerson => ({
  id: c.id,
  display_name: c.display_name,
  peopler_id: c.peopler_id,
  peopler_url: null,
});

/** `Sam Lee (Sammy) · in Peopler · 2 open · latest "Book venue"`. */
const candidateLine = (c: PersonCandidateDetail): string =>
  [
    c.display_name,
    c.aliases.length > 0 ? ` (${c.aliases.join(', ')})` : '',
    c.peopler_id !== null ? ' · in Peopler' : '',
    ` · ${c.open_count} open`,
    c.latest_open_title ? ` · latest "${c.latest_open_title}"` : '',
  ].join('');

const OPTION =
  'flex items-center w-full min-h-[44px] sm:min-h-[40px] px-2.5 rounded-[9px] text-sm text-left text-ink-2 hover:bg-hover focus-visible:bg-hover';

/**
 * The popover a needs-you chip opens: what to do with a person the server
 * could not settle (people spec §6). Rendered inline under the chip, not the
 * full Dialog. Closes on Escape (without reaching an enclosing dialog) and on
 * an outside click.
 */
const PersonChooser: React.FC<PersonChooserProps> = ({ item, onPick, onClose }) => {
  const headingId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [picking, setPicking] = useState(false);
  const { name, candidates } = item.resolved;
  const kind = layoutFor(item);
  const peopler_id = peoplerIdOf(item.resolved.ref);
  const withPeopler = peopler_id === undefined ? {} : { peopler_id };

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      // Inside means the chooser or the chip it hangs from, so the chip's own click toggles it.
      const anchor = rootRef.current?.parentElement;
      if (anchor && !anchor.contains(event.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [onClose]);

  useEffect(() => {
    rootRef.current?.querySelector<HTMLElement>('button')?.focus();
  }, []);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    // Close the chooser only: a parent Dialog's document listener must not also fire.
    event.preventDefault();
    event.stopPropagation();
    onClose();
  };

  const option = (label: string, pick: ChooserPick, key = label) => (
    <button key={key} type="button" onClick={() => onPick(pick)} className={OPTION}>
      {label}
    </button>
  );

  const newName = option(`New "${name}"`, { kind: 'create', name, ...withPeopler });

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-labelledby={headingId}
      onKeyDown={onKeyDown}
      className="absolute left-0 top-full z-20 mt-1 w-72 max-w-[calc(100vw-2rem)] bg-surface border border-line rounded-[14px] shadow-menu p-1.5"
    >
      <p id={headingId} className="px-2.5 py-1.5 text-[13px] text-ink-muted">
        {HEADINGS[kind](name)}
      </p>
      {kind === 'new' && (
        <>
          {option(`Create "${name}"`, { kind: 'create', name, ...withPeopler })}
          {picking ? (
            <div className="px-1.5 py-1">
              <PeopleField
                id={`${headingId}-people`}
                compact
                value={[]}
                onChange={(next) => {
                  const person = next[next.length - 1];
                  if (person) onPick({ kind: 'person', person });
                }}
              />
            </div>
          ) : (
            <button type="button" onClick={() => setPicking(true)} className={OPTION}>
              Pick someone…
            </button>
          )}
        </>
      )}
      {(kind === 'ambiguous' || kind === 'possible_match') && (
        <>
          {candidates.map((c) => option(candidateLine(c), { kind: 'person', person: asTodoPerson(c) }, `c${c.id}`))}
          {newName}
        </>
      )}
      {kind === 'link_candidate' && (
        <>
          {candidates.map((c) => (
            <React.Fragment key={c.id}>
              {option(`Link ${c.display_name} to Peopler`, { kind: 'link', person: asTodoPerson(c), peopler_id: peopler_id ?? 0 }, `l${c.id}`)}
              {option(`Just tag ${c.display_name}`, { kind: 'person', person: asTodoPerson(c) }, `t${c.id}`)}
            </React.Fragment>
          ))}
          {option('New linked person', { kind: 'create', name, ...withPeopler })}
        </>
      )}
      {option('Drop', { kind: 'drop' })}
    </div>
  );
};

export default PersonChooser;
