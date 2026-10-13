import React from 'react';

/** Props for {@link Switch}. */
interface SwitchProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

/** On/off toggle backed by a real checkbox; pair it with a `<label htmlFor={id}>`. */
const Switch: React.FC<SwitchProps> = ({ id, checked, onChange, disabled }) => (
  <span className="relative inline-flex w-10 h-6 flex-none">
    <input
      id={id}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(event) => onChange(event.target.checked)}
      className="peer absolute inset-0 z-10 m-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
    />
    <span className="absolute inset-0 rounded-full bg-line-strong transition-colors peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2" />
    <span className="absolute top-[3px] left-[3px] w-[18px] h-[18px] rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
  </span>
);

export default Switch;
