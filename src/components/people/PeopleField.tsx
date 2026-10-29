import React, { useEffect, useId, useRef, useState } from 'react';
import type { TodoPerson } from '../../types/person';
import { usePeople, usePeopleMutations } from '../../hooks/usePeopleStore';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useIsPhone } from '../../hooks/useIsPhone';
import { PEOPLE_PER_TODO_MAX } from '../../constants';
import Dialog from '../ui/Dialog';
import { CloseIcon, PlusIcon } from '../ui/Icons';
import { chipBare, chipLinked, fieldError, fieldHint, fieldInput, fieldLabel, fieldOptional, outlineButton, primaryButton } from '../ui/styles';

/** Props for {@link PeopleField}. */
interface PeopleFieldProps {
  id: string;
  /** The chosen people, in the order chosen. */
  value: TodoPerson[];
  onChange: (next: TodoPerson[]) => void;
  disabled?: boolean;
}

/** How many matches the typeahead asks for. */
const MATCH_LIMIT = 8;

const LIMIT_COPY = `Up to ${PEOPLE_PER_TODO_MAX} people per todo.`;

const CHIP = 'inline-flex items-center gap-0.5 h-7 pl-2.5 pr-1 rounded-full border text-[13px] leading-none';

const toTodoPerson = ({ id, display_name, peopler_id, peopler_url }: TodoPerson): TodoPerson => ({
  id,
  display_name,
  peopler_id,
  peopler_url,
});

/** The chosen people as removable chips. Not navigation: the × only removes. */
const RemovableChips: React.FC<{ value: TodoPerson[]; onChange: (next: TodoPerson[]) => void; disabled: boolean }> = ({
  value,
  onChange,
  disabled,
}) => {
  if (value.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5 mb-2">
      {value.map((person) => (
        <li key={person.id} className={`${CHIP} ${person.peopler_id !== null ? chipLinked : chipBare}`}>
          {person.display_name}
          <button
            type="button"
            onClick={() => onChange(value.filter((p) => p.id !== person.id))}
            disabled={disabled}
            aria-label={`Remove ${person.display_name}`}
            className="inline-flex items-center justify-center w-5 h-5 rounded-full text-ink-faint hover:text-ink hover:bg-hover disabled:opacity-50"
          >
            <CloseIcon className="w-3 h-3" />
          </button>
        </li>
      ))}
    </ul>
  );
};

type Option = { kind: 'match'; person: TodoPerson } | { kind: 'create' };

/** Stable identity for an option, so the active one survives the list changing under it. */
const optionKey = (option: Option) => (option.kind === 'match' ? `person-${option.person.id}` : 'create');

/**
 * The text box and its listbox: matches from the server (people already
 * chosen are left out), then always `Create "‹text›"`. Escape with the list
 * open closes the list only and does not reach the enclosing dialog.
 */
const PeopleCombobox: React.FC<{
  inputId: string;
  value: TodoPerson[];
  onChange: (next: TodoPerson[]) => void;
  disabled: boolean;
  autoFocus?: boolean;
}> = ({ inputId, value, onChange, disabled, autoFocus = false }) => {
  const listboxId = useId();
  const errorId = useId();
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  // The active option is held by key, not index: matches arrive after the
  // debounce and reshuffle the list, and Enter must still pick what the user
  // moved to (e.g. Create "Sam" must not become "Sam Lee").
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { createPerson, isCreating } = usePeopleMutations();
  // A create resolves later; append to the value as it is then, not as it was
  // when Create was picked, so picks and removals made meanwhile survive.
  const latestValue = useRef(value);
  // A create that resolves after the field unmounted (the form closed) must not
  // push its person into whatever form opens next.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    latestValue.current = value;
  });

  const trimmed = text.trim();
  const debounced = useDebouncedValue(trimmed);
  const atLimit = value.length >= PEOPLE_PER_TODO_MAX;
  const { data: matches = [] } = usePeople({ q: debounced, limit: MATCH_LIMIT, enabled: debounced !== '' && !atLimit });

  const chosenIds = new Set(value.map((p) => p.id));
  const options: Option[] = trimmed
    ? [
        ...matches.filter((p) => !chosenIds.has(p.id)).map((p) => ({ kind: 'match' as const, person: toTodoPerson(p) })),
        { kind: 'create' },
      ]
    : [];
  const expanded = open && options.length > 0 && !atLimit && !disabled;
  const active = activeKey === null ? -1 : options.findIndex((option) => optionKey(option) === activeKey);
  const optionId = (index: number) => `${listboxId}-option-${index}`;

  const reset = () => {
    setText('');
    setOpen(false);
    setActiveKey(null);
    setError(null);
  };

  const pick = async (option: Option) => {
    if (option.kind === 'match') {
      onChange([...value, option.person]);
      reset();
      return;
    }
    if (isCreating) return;
    setError(null);
    try {
      const created = await createPerson({ display_name: trimmed });
      if (!mounted.current) return;
      onChange([...latestValue.current, toTodoPerson(created)]);
      reset();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Could not create that person.');
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      if (!expanded) return; // Let the dialog close.
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      setActiveKey(null);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (options.length === 0) return;
      event.preventDefault();
      if (!expanded) {
        setOpen(true);
        setActiveKey(optionKey(options[event.key === 'ArrowDown' ? 0 : options.length - 1]));
        return;
      }
      const step = event.key === 'ArrowDown' ? 1 : -1;
      const from = active === -1 && step === -1 ? 0 : active;
      setActiveKey(optionKey(options[(from + step + options.length) % options.length]));
      return;
    }
    if (event.key === 'Enter' && expanded) {
      // Never submit the form from an open list; pick only an option the user moved to.
      event.preventDefault();
      if (active >= 0 && active < options.length) void pick(options[active]);
    }
  };

  return (
    <div className="relative">
      <input
        id={inputId}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listboxId}
        aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
        aria-describedby={error ? errorId : undefined}
        autoComplete="off"
        autoFocus={autoFocus}
        value={text}
        disabled={disabled || atLimit}
        placeholder="Add a person"
        onChange={(event) => {
          setText(event.target.value);
          setOpen(true);
          setActiveKey(null);
          setError(null);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        className={fieldInput}
      />
      {expanded && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="People"
          className="absolute left-0 right-0 z-10 mt-1 max-h-72 overflow-y-auto bg-surface border border-line rounded-[14px] shadow-menu p-1.5"
        >
          {options.map((option, index) => (
            <li
              key={optionKey(option)}
              id={optionId(index)}
              role="option"
              aria-selected={index === active}
              // Keep focus in the input so the click lands before blur closes the list.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => void pick(option)}
              onMouseEnter={() => setActiveKey(optionKey(option))}
              className={`flex items-center min-h-[44px] sm:min-h-[40px] px-2.5 rounded-[9px] text-sm cursor-pointer text-ink-2 ${
                index === active ? 'bg-hover' : ''
              }`}
            >
              {option.kind === 'match'
                ? option.person.display_name
                : isCreating
                  ? 'Creating…'
                  : `Create "${trimmed}"`}
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p id={errorId} role="alert" className={fieldError}>
          {error}
        </p>
      )}
      {atLimit && <p className={fieldHint}>{LIMIT_COPY}</p>}
    </div>
  );
};

/**
 * The People field of the add and edit forms: chosen people as removable
 * chips and a typeahead that picks or creates a person. On phones the
 * typeahead opens in a full-screen "People" sheet that edits `value` live.
 */
const PeopleField: React.FC<PeopleFieldProps> = ({ id, value, onChange, disabled = false }) => {
  const isPhone = useIsPhone();
  const [sheetOpen, setSheetOpen] = useState(false);

  if (!isPhone) {
    return (
      <div>
        {/* "optional" sits beside the label, not inside it, so the control's accessible name is just "People". */}
        <div className={fieldLabel}>
          <label htmlFor={id}>People</label> <span className={fieldOptional}>optional</span>
        </div>
        <RemovableChips value={value} onChange={onChange} disabled={disabled} />
        <PeopleCombobox inputId={id} value={value} onChange={onChange} disabled={disabled} />
      </div>
    );
  }

  return (
    <div>
      <div className={fieldLabel}>
        People <span className={fieldOptional}>optional</span>
      </div>
      <RemovableChips value={value} onChange={onChange} disabled={disabled} />
      <button id={id} type="button" onClick={() => setSheetOpen(true)} disabled={disabled} className={outlineButton}>
        <PlusIcon className="w-4 h-4" />
        Add people
      </button>
      {sheetOpen && (
        <Dialog title="People" onClose={() => setSheetOpen(false)} fullScreenOnPhone>
          <div className="px-7 pt-3 pb-6">
            <RemovableChips value={value} onChange={onChange} disabled={disabled} />
            <label htmlFor={`${id}-sheet`} className="sr-only">
              People
            </label>
            <PeopleCombobox inputId={`${id}-sheet`} value={value} onChange={onChange} disabled={disabled} autoFocus />
            <div className="flex justify-end mt-6">
              <button type="button" onClick={() => setSheetOpen(false)} className={primaryButton}>
                Done
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};

export default PeopleField;
