import React from 'react';
import { CheckIcon } from './Icons';

/** Props for {@link Checkbox}. */
interface CheckboxProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  id?: string;
  /** Needed only when no wrapping `<label>` names the box. */
  'aria-label'?: string;
}

/**
 * Square checkbox in the app's style: a real (transparent) checkbox input over
 * a drawn box, so labels, keyboard and screen readers work as usual. Wrap it
 * in a `<label>` with its text, or pass `aria-label`.
 */
const Checkbox: React.FC<CheckboxProps> = ({ checked, onChange, disabled, id, 'aria-label': ariaLabel }) => (
  <span className="relative inline-flex w-5 h-5 flex-none">
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      aria-label={ariaLabel}
      className="peer absolute inset-0 z-10 m-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
    />
    <span
      aria-hidden="true"
      className={`absolute inset-0 rounded-[6px] border-[1.5px] flex items-center justify-center text-white transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 peer-disabled:opacity-60 ${
        checked ? 'bg-accent border-accent' : 'bg-surface border-ink-faint/70'
      }`}
    >
      {checked && <CheckIcon className="w-3 h-3" />}
    </span>
  </span>
);

export default Checkbox;
