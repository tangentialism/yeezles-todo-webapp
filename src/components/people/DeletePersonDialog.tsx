import React, { useState } from 'react';
import Dialog from '../ui/Dialog';
import { Spinner } from '../ui/Icons';
import { fieldError, ghostButton, primaryButton } from '../ui/styles';
import { usePeopleMutations } from '../../hooks/usePeopleStore';
import type { PersonWithCounts } from '../../types/person';

/** Props for {@link DeletePersonDialog}. */
interface DeletePersonDialogProps {
  person: PersonWithCounts;
  onClose: () => void;
  onDeleted: () => void;
}

/** Confirms a person delete; their tags go, the todos stay. */
const DeletePersonDialog: React.FC<DeletePersonDialogProps> = ({ person, onClose, onDeleted }) => {
  const { deletePerson, isDeleting } = usePeopleMutations();
  const [error, setError] = useState<string | null>(null);
  const todoCount = person.open_count + person.done_count;

  const handleDelete = async () => {
    setError(null);
    try {
      await deletePerson(person.id);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the person.');
    }
  };

  return (
    <Dialog title="Delete person" onClose={onClose} closeDisabled={isDeleting}>
      <div className="px-7 pt-3 text-[14.5px] text-ink-2">
        {`Delete "${person.display_name}"? Their tags are removed from ${todoCount} todos; the todos stay.`}
        {error && <p role="alert" className={fieldError}>{error}</p>}
      </div>
      <div className="flex items-center justify-end gap-1.5 pl-7 pr-5 pt-5 pb-5">
        <button type="button" onClick={onClose} disabled={isDeleting} className={ghostButton}>
          Cancel
        </button>
        <button type="button" onClick={handleDelete} disabled={isDeleting} className={`${primaryButton} !bg-danger hover:!bg-danger/90`}>
          {isDeleting && <Spinner className="w-4 h-4" />}
          Delete person
        </button>
      </div>
    </Dialog>
  );
};

export default DeletePersonDialog;
