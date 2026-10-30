import React from 'react';
import { ViewHeader } from '../ViewChrome';
import PersonList from './PersonList';
import PersonPane from './PersonPane';

/** Props for {@link PeopleView}. */
interface PeopleViewProps {
  /** The person selected in the People view, or null for none. */
  openPersonId: number | null;
  /** Bumped on every explicit open, including re-opening the selected person. */
  openPersonSeq: number;
  onOpenPerson: (id: number) => void;
  onClosePerson: () => void;
}

/**
 * The People tab (layout B). From `sm` up: the list (sticky and bounded, 280px) beside the
 * person pane. Below `sm`: the list, or the selected person in its place, with
 * a back control inside the pane. CSS only, no JS breakpoint. It ignores the
 * area switcher: people span every area.
 */
const PeopleView: React.FC<PeopleViewProps> = ({ openPersonId, openPersonSeq, onOpenPerson, onClosePerson }) => {
  const selected = openPersonId !== null;
  return (
    <div>
      <ViewHeader title="People" totals={[]} />
      <div className="grid grid-cols-1 sm:grid-cols-[280px_minmax(0,1fr)] gap-x-10 pt-4">
        <div
          data-testid="people-list-pane"
          className={`${selected ? 'hidden sm:block' : ''} sm:sticky sm:top-4 sm:self-start sm:max-h-[min(calc(100vh-2rem),calc(800px-2rem))] sm:overflow-y-auto`}
        >
          <PersonList selectedId={openPersonId} onOpen={onOpenPerson} />
        </div>
        <div data-testid="people-detail-pane" className={selected ? '' : 'hidden sm:block'}>
          {/* Keyed by id and open counter: switching people starts a fresh pane (Show completed, dialogs),
              and re-opening the same person remounts it so the Peopler link check runs on every open. */}
          {selected ? (
            <PersonPane
              key={`${openPersonId}:${openPersonSeq}`}
              personId={openPersonId}
              onBack={onClosePerson}
              onMerged={onOpenPerson}
              onDeleted={onClosePerson}
            />
          ) : (
            <p className="py-6 text-sm text-ink-muted">Pick a person to see their todos.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PeopleView;
