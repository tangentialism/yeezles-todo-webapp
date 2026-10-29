import React from 'react';

/** Props for {@link PeopleView}. */
interface PeopleViewProps {
  /** The person selected in the People view, or null for none. */
  openPersonId: number | null;
  onOpenPerson: (id: number) => void;
  onClosePerson: () => void;
}

/**
 * The People tab. A stub for now (title only); the list and person panes
 * arrive with the next task, which uses all three props.
 */
const PeopleView: React.FC<PeopleViewProps> = () => (
  <h1 className="font-serif text-2xl text-ink pt-2">People</h1>
);

export default PeopleView;
