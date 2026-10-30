import React, { useMemo, useState } from 'react';
import Dialog from '../ui/Dialog';
import { Spinner } from '../ui/Icons';
import { fieldError, fieldInput, fieldLabel, ghostButton, primaryButton } from '../ui/styles';
import { usePeopleMutations, usePeople } from '../../hooks/usePeopleStore';
import { isApiError } from '../../services/apiError';
import type { Person } from '../../types/person';

/** Props for {@link MergePersonDialog}. */
interface MergePersonDialogProps {
  person: Person;
  /** Preselects this person as the survivor (e.g. the holder of a Peopler id). */
  initialIntoId?: number;
  onClose: () => void;
  /** Called with the survivor's id once the merge succeeds. */
  onMerged: (intoId: number) => void;
}

/**
 * Merges this person into another. The picker lists everyone else (so merging
 * a person into themselves is unreachable), sorted by name.
 */
const MergePersonDialog: React.FC<MergePersonDialogProps> = ({ person, initialIntoId, onClose, onMerged }) => {
  const { mergePerson, isMerging } = usePeopleMutations();
  const { data: people = [], isLoading } = usePeople({ limit: 100 });
  const [intoId, setIntoId] = useState(initialIntoId === undefined ? '' : String(initialIntoId));
  const [error, setError] = useState<string | null>(null);

  const others = useMemo(
    () => people.filter((p) => p.id !== person.id).sort((a, b) => a.display_name.localeCompare(b.display_name)),
    [people, person.id]
  );
  const target = others.find((p) => String(p.id) === intoId);

  const handleMerge = async () => {
    if (!target) return;
    setError(null);
    try {
      await mergePerson(person.id, target.id);
      onMerged(target.id);
    } catch (err) {
      setError(
        isApiError(err, 'PERSON_MERGE_CONFLICT')
          ? 'Both are linked to different Peopler people. Unlink one first.'
          : err instanceof Error
            ? err.message
            : 'Could not merge the people.'
      );
    }
  };

  return (
    <Dialog title="Merge person" onClose={onClose} closeDisabled={isMerging}>
      <div className="px-7 pt-3.5 flex flex-col gap-[14px]">
        <div>
          <label htmlFor="merge-person-into" className={fieldLabel}>
            Merge into
          </label>
          <select
            id="merge-person-into"
            value={intoId}
            onChange={(e) => setIntoId(e.target.value)}
            className={fieldInput}
            disabled={isMerging || isLoading}
          >
            <option value="">Choose a person…</option>
            {others.map((p) => (
              <option key={p.id} value={p.id}>
                {p.display_name}
              </option>
            ))}
          </select>
        </div>
        {target && (
          <p className="text-[14.5px] text-ink-2">
            {`Merge "${person.display_name}" into "${target.display_name}"? ${person.display_name}'s todos move to ${target.display_name}, and "${person.display_name}" becomes one of ${target.display_name}'s aliases.`}
          </p>
        )}
        {error && <p role="alert" className={fieldError}>{error}</p>}
      </div>
      <div className="flex items-center justify-end gap-1.5 pl-7 pr-5 pt-4 pb-5">
        <button type="button" onClick={onClose} disabled={isMerging} className={ghostButton}>
          Cancel
        </button>
        <button type="button" onClick={handleMerge} disabled={!target || isMerging} className={primaryButton}>
          {isMerging && <Spinner className="w-4 h-4" />}
          Merge
        </button>
      </div>
    </Dialog>
  );
};

export default MergePersonDialog;
