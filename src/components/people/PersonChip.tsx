import React from 'react';
import type { TodoPerson } from '../../types/person';
import { useOpenPerson } from '../../hooks/useOpenPerson';
import { peoplerLinkOf } from '../../utils/peoplerLink';
import { AlertTriangleIcon } from '../ui/Icons';
import { chipBare, chipLinked } from '../ui/styles';

/** Props for {@link PersonChip}. */
interface PersonChipProps {
  person: TodoPerson;
}

const CHIP = 'inline-flex items-center h-[22px] px-2 rounded-full border text-[12.5px] leading-none';

/**
 * A person tagged on a todo. Filled when the Peopler link works (`ok`), outlined
 * otherwise; a stale link adds a warning icon. Both carry a screen-reader suffix
 * so colour is not the only cue. A dormant link looks bare.
 * Inside the dashboard it is a button that opens the person in the People tab.
 */
const PersonChip: React.FC<PersonChipProps> = ({ person }) => {
  const openPerson = useOpenPerson();
  const link = peoplerLinkOf(person);
  const linked = link === 'ok';
  const stale = link === 'stale';
  const className = `${CHIP} ${linked ? chipLinked : chipBare}`;
  const content = (
    <>
      {person.display_name}
      {linked && <span className="sr-only"> (in Peopler)</span>}
      {stale && (
        <>
          <AlertTriangleIcon className="w-3 h-3 ml-1 text-danger" />
          <span className="sr-only"> (Peopler link out of date)</span>
        </>
      )}
    </>
  );

  if (!openPerson) {
    return <span className={className}>{content}</span>;
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        openPerson(person.id);
      }}
      aria-label={`Open person ${person.display_name}${linked ? ' (in Peopler)' : stale ? ' (Peopler link out of date)' : ''}`}
      className={`${className} hover:bg-hover hover:text-ink transition-colors`}
    >
      {content}
    </button>
  );
};

export default PersonChip;
