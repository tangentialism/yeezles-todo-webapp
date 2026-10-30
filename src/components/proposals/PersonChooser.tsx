import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { PersonCandidateDetail, PersonRef, TodoPerson } from '../../types/person';
import type { ChooserPick, DraftPersonRef } from '../../utils/proposalDraft';
import PeopleField from '../people/PeopleField';
import { shouldOpenUpward } from '../../utils/popoverPlacement';

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
  // Horizontal nudge (px, relative to the chip) that keeps the popover on screen.
  const [shift, setShift] = useState(0);
  // Open above the chip instead, when below would run under the Apply bar or off the window.
  const [upward, setUpward] = useState(false);
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

  // Measured once, at its natural place under the chip: slide left if it would
  // run off the right edge, then right if that pushed it off the left edge.
  useLayoutEffect(() => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    const margin = 8;
    let dx = Math.min(0, window.innerWidth - margin - rect.right);
    if (rect.left + dx < margin) dx = margin - rect.left;
    setShift(dx);
  }, []);

  // Measured below the chip, again whenever it grows ("Pick someone…", then
  // its matches): flip above the chip if it would reach the review's Apply bar
  // (or the window bottom). Once above, it stays there; it grows upward from the chip.
  useLayoutEffect(() => {
    if (upward) return;
    const root = rootRef.current;
    if (!root) return;
    const measure = () => {
      const rect = root.getBoundingClientRect();
      const anchor = root.parentElement?.getBoundingClientRect();
      if (anchor && shouldOpenUpward(rect, anchor.top, 4)) setUpward(true);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [picking, upward]);

  // While open, Escape anywhere closes the chooser only. Capture phase, so the
  // review Dialog's document listener never sees it; a combobox with its list
  // open keeps its own Escape (closes the list first).
  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      const target = event.target;
      if (target instanceof HTMLElement && target.getAttribute('role') === 'combobox' && target.getAttribute('aria-expanded') === 'true') return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };
    document.addEventListener('keydown', onEscape, true);
    return () => document.removeEventListener('keydown', onEscape, true);
  }, [onClose]);

  useEffect(() => {
    rootRef.current?.querySelector<HTMLElement>('button')?.focus();
  }, []);

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
      style={shift === 0 ? undefined : { left: shift }}
      className={`absolute left-0 ${upward ? 'bottom-full mb-1' : 'top-full mt-1'} z-20 w-72 max-w-[calc(100vw-2rem)] bg-surface border border-line rounded-[14px] shadow-menu p-1.5`}
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
                inlineList
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
