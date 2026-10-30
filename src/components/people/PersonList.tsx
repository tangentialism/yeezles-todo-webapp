import React from 'react';
import { usePeople } from '../../hooks/usePeopleStore';
import { ViewError, ViewLoading } from '../ViewChrome';
import { peoplerLinkOf } from '../../utils/peoplerLink';
import { AlertTriangleIcon, LinkIcon } from '../ui/Icons';

/** The list asks for the backend maximum; exactly this many back means there may be more. */
const LIST_LIMIT = 100;

/** Props for {@link PersonList}. */
interface PersonListProps {
  selectedId: number | null;
  onOpen: (id: number) => void;
}

/** Everyone tagged, most recent first, across areas. People with nothing open are dimmed. */
const PersonList: React.FC<PersonListProps> = ({ selectedId, onOpen }) => {
  const { data: people = [], isLoading, error, refetch } = usePeople({ limit: LIST_LIMIT });

  if (isLoading) return <ViewLoading label="Loading people..." />;
  if (error) {
    return (
      <ViewError
        title="Could not load people"
        message={error instanceof Error ? error.message : 'Please try again.'}
        onRetry={() => refetch()}
      />
    );
  }
  if (people.length === 0) {
    return <p className="py-6 text-sm text-ink-muted">No people yet. Tag someone from a todo's People field.</p>;
  }

  return (
    <div>
      <ul aria-label="People" className="flex flex-col gap-0.5">
        {people.map((person) => {
          const selected = person.id === selectedId;
          const link = peoplerLinkOf(person);
          const tone = person.open_count === 0 ? 'text-ink-faint' : 'text-ink';
          return (
            <li key={person.id}>
              <button
                type="button"
                onClick={() => onOpen(person.id)}
                aria-current={selected ? 'true' : undefined}
                className={`flex w-full items-center gap-2 min-h-[44px] sm:min-h-[40px] px-3 rounded-[10px] text-left text-[14.5px] hover:bg-hover ${tone} ${selected ? 'bg-hover font-medium' : ''}`}
              >
                <span className="flex-1 min-w-0 truncate">{person.display_name}</span>
                {link === 'ok' && (
                  <span role="img" aria-label="Linked to Peopler" className="flex-none text-accent">
                    <LinkIcon className="w-3.5 h-3.5" />
                  </span>
                )}
                {link === 'stale' && (
                  <span role="img" aria-label="Peopler link out of date" className="flex-none text-danger">
                    <AlertTriangleIcon className="w-3.5 h-3.5" />
                  </span>
                )}
                <span className="font-mono text-[12.5px] flex-none">{person.open_count}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {people.length >= LIST_LIMIT && (
        <p className="mt-3 px-3 text-[12.5px] text-ink-faint">Showing the {LIST_LIMIT} most recently tagged.</p>
      )}
    </div>
  );
};

export default PersonList;
