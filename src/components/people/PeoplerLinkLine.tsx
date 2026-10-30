import React from 'react';
import { peoplerLinkOf } from '../../utils/peoplerLink';
import { ghostButton } from '../ui/styles';
import type { PersonWithCounts } from '../../types/person';

/** Props for {@link PeoplerLinkLine}. */
export interface PeoplerLinkLineProps {
  person: PersonWithCounts;
  onRelink: () => void;
  onRemove: () => void;
  /** Disables Remove link while an unlink is in flight. */
  busy?: boolean;
}

/** The stale or dormant line under a person's counts; renders nothing for `ok` and `none`. */
const PeoplerLinkLine: React.FC<PeoplerLinkLineProps> = ({ person, onRelink, onRemove, busy = false }) => {
  const link = peoplerLinkOf(person);
  if (link === 'dormant') {
    return (
      <p className="mt-1.5 text-[13px] text-ink-muted">
        Linked to Peopler — connect Peopler from the account menu to use it.
      </p>
    );
  }
  if (link === 'stale') {
    return (
      <div className="mt-1.5 flex flex-wrap items-center gap-x-1 text-[13px] text-ink-muted">
        <span>This Peopler link is out of date.</span>
        <button type="button" onClick={onRelink} className={ghostButton}>Relink…</button>
        <button type="button" onClick={onRemove} disabled={busy} className={ghostButton}>Remove link</button>
      </div>
    );
  }
  return null;
};

export default PeoplerLinkLine;
