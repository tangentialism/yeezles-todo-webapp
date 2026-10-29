import React, { useState } from 'react';
import Dialog from '../ui/Dialog';
import { Spinner } from '../ui/Icons';
import { fieldError, fieldHint, fieldInput, fieldLabel, ghostButton, primaryButton } from '../ui/styles';
import { usePeopleMutations } from '../../hooks/usePeopleStore';
import type { Person, UpdatePersonRequest } from '../../types/person';
import { PERSON_ALIASES_MAX, PERSON_ALIAS_MAX, PERSON_NAME_MAX } from '../../constants';

/** Props for {@link EditPersonDialog}. */
interface EditPersonDialogProps {
  person: Person;
  onClose: () => void;
}

/** Trimmed, non-empty lines of the aliases textarea. */
const parseAliases = (text: string) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

/** The first client-side problem with the edit, or null. Mirrors the backend limits. */
const validate = (name: string, aliases: string[]): string | null => {
  if (!name) return 'Name is required.';
  if (name.length > PERSON_NAME_MAX) return `Name can be at most ${PERSON_NAME_MAX} characters.`;
  if (aliases.some((alias) => alias.length > PERSON_ALIAS_MAX)) {
    return `Each alias can be at most ${PERSON_ALIAS_MAX} characters.`;
  }
  if (aliases.length > PERSON_ALIASES_MAX) return `At most ${PERSON_ALIASES_MAX} aliases.`;
  return null;
};

/** Renames a person and edits their aliases (one per line). Sends only what changed. */
const EditPersonDialog: React.FC<EditPersonDialogProps> = ({ person, onClose }) => {
  const { updatePerson, isUpdating } = usePeopleMutations();
  const [name, setName] = useState(person.display_name);
  const [aliasText, setAliasText] = useState(person.aliases.join('\n'));
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    const aliases = parseAliases(aliasText);
    const problem = validate(trimmed, aliases);
    if (problem) {
      setError(problem);
      return;
    }
    const updates: UpdatePersonRequest = {};
    if (trimmed !== person.display_name) updates.display_name = trimmed;
    if (aliases.join('\n') !== person.aliases.join('\n')) updates.aliases = aliases;
    if (Object.keys(updates).length === 0) {
      onClose();
      return;
    }
    setError(null);
    try {
      await updatePerson(person.id, updates);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the person.');
    }
  };

  return (
    <Dialog title="Edit person" onClose={onClose} closeDisabled={isUpdating}>
      <form onSubmit={handleSubmit} noValidate>
        <div className="px-7 pt-3.5 flex flex-col gap-[18px]">
          <div>
            <label htmlFor="edit-person-name" className={fieldLabel}>
              Name
            </label>
            <input
              id="edit-person-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={fieldInput}
              disabled={isUpdating}
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="edit-person-aliases" className={fieldLabel}>
              Aliases
            </label>
            <textarea
              id="edit-person-aliases"
              value={aliasText}
              onChange={(e) => setAliasText(e.target.value)}
              rows={4}
              className={fieldInput}
              disabled={isUpdating}
            />
            <p className={fieldHint}>One per line.</p>
          </div>
          {error && <p role="alert" className={fieldError}>{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-1.5 pl-7 pr-5 pt-4 pb-5">
          <button type="button" onClick={onClose} disabled={isUpdating} className={ghostButton}>
            Cancel
          </button>
          <button type="submit" disabled={isUpdating} className={primaryButton}>
            {isUpdating && <Spinner className="w-4 h-4" />}
            Save
          </button>
        </div>
      </form>
    </Dialog>
  );
};

export default EditPersonDialog;
