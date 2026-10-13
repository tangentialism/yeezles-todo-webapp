import React from 'react';
import type { Area } from '../../types/area';

/** Props for {@link AreaChips}. */
interface AreaChipsProps {
  areas: Area[];
  value: number | null;
  onChange: (areaId: number | null) => void;
  /** Label for the `null` choice, e.g. "Auto" (AI picks) or "None". Omit to hide it. */
  nullLabel?: string;
  disabled?: boolean;
  labelId: string;
}

/** Single-choice area picker rendered as a row of pill-shaped radio buttons. */
const AreaChips: React.FC<AreaChipsProps> = ({ areas, value, onChange, nullLabel, disabled, labelId }) => {
  const chip = (selected: boolean) =>
    `inline-flex items-center gap-2 h-9 px-3.5 rounded-full border text-[13.5px] transition-colors disabled:opacity-60 ${
      selected
        ? 'border-ink bg-ink text-paper'
        : 'border-line-strong bg-surface text-ink-2 hover:border-ink-faint'
    }`;

  return (
    <div role="radiogroup" aria-labelledby={labelId} className="flex flex-wrap gap-2">
      {nullLabel && (
        <button
          type="button"
          role="radio"
          aria-checked={value === null}
          disabled={disabled}
          onClick={() => onChange(null)}
          className={chip(value === null)}
        >
          {nullLabel}
        </button>
      )}
      {areas.map((area) => (
        <button
          key={area.id}
          type="button"
          role="radio"
          aria-checked={value === area.id}
          disabled={disabled}
          onClick={() => onChange(area.id)}
          className={chip(value === area.id)}
        >
          <span className="w-2 h-2 rounded-full flex-none" style={{ backgroundColor: area.color }} />
          {area.name}
        </button>
      ))}
    </div>
  );
};

export default AreaChips;
