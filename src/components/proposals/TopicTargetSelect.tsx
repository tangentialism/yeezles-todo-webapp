import React, { useState } from 'react';
import { findTopic, targetOptions, validateTopicName } from '../../utils/proposalDraft';
import type { Draft } from '../../utils/proposalDraft';
import { fieldError, ghostButton, outlineButton } from '../ui/styles';

/** Props for {@link TopicTargetSelect}. */
interface TopicTargetSelectProps {
  /** Accessible name, e.g. `Topic for "Mulch beds"`. */
  label: string;
  /** The chosen topic key, or null for "—". */
  value: string | null;
  draft: Draft;
  /** Offer "—" (the Unassigned tab, where it removes the assignment). */
  allowNone: boolean;
  /** Text of the "none" option; "No topic" on a new todo's row. */
  noneLabel?: string;
  disabled?: boolean;
  onSelect: (key: string | null) => void;
  /** Called with a validated name from the inline "New topic…" field. */
  onCreate: (name: string) => void;
}

const NONE = '__none__';
const NEW = '__new__';
const SELECT =
  'w-full rounded-[10px] border border-line-strong bg-surface px-2.5 py-2 text-[13.5px] text-ink focus:outline-none focus:border-accent disabled:opacity-60';

/**
 * The per-row target dropdown (spec §6.2): the area's active topics, this
 * draft's kept new topics, then "New topic…", which swaps in an inline name
 * field. A target not otherwise listed (archived, other-area) stays visible.
 * The inline field has no Enter-to-add and no form (ruling L24).
 */
const TopicTargetSelect: React.FC<TopicTargetSelectProps> = ({ label, value, draft, allowNone, noneLabel = '—', disabled, onSelect, onCreate }) => {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const options = targetOptions(draft);
  const unlisted = value !== null && !options.some((o) => o.key === value) ? findTopic(draft, value) : undefined;

  if (creating) {
    const close = () => {
      setCreating(false);
      setName('');
      setError(null);
    };
    return (
      <span className="flex flex-wrap items-center gap-2">
        <input
          aria-label="New topic name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          className={`${SELECT} flex-1 min-w-[140px]`}
          autoFocus
        />
        <button
          type="button"
          className={outlineButton}
          onClick={() => {
            const problem = validateTopicName(draft, name);
            if (problem) {
              setError(problem);
              return;
            }
            onCreate(name.trim());
            close();
          }}
        >
          Add
        </button>
        <button type="button" className={ghostButton} onClick={close}>
          Cancel
        </button>
        {error && <span className={`${fieldError} basis-full`}>{error}</span>}
      </span>
    );
  }

  return (
    <select
      aria-label={label}
      value={value ?? NONE}
      disabled={disabled}
      className={SELECT}
      onChange={(e) => {
        const next = e.target.value;
        if (next === NEW) setCreating(true);
        else onSelect(next === NONE ? null : next);
      }}
    >
      {(allowNone || value === null) && <option value={NONE}>{noneLabel}</option>}
      {unlisted && <option value={unlisted.key}>{unlisted.name}</option>}
      {options.map((o) => (
        <option key={o.key} value={o.key}>
          {o.name}
        </option>
      ))}
      <option value={NEW}>New topic…</option>
    </select>
  );
};

export default TopicTargetSelect;
