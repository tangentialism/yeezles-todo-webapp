import React, { useState } from 'react';
import Dialog from '../ui/Dialog';
import { Spinner } from '../ui/Icons';
import { fieldError, fieldInput, fieldLabel, ghostButton } from '../ui/styles';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { usePeople, usePeopleMutations } from '../../hooks/usePeopleStore';
import { usePeoplerSearch } from '../../hooks/usePeoplerStore';
import { isApiError } from '../../services/apiError';
import { peoplerErrorMessage } from '../../utils/peoplerErrors';
import type { PeoplerSearchResult } from '../../types/peopler';
import type { PersonWithCounts } from '../../types/person';

/** Props for {@link LinkPeoplerDialog}. */
export interface LinkPeoplerDialogProps {
  person: PersonWithCounts;
  /** `relink` when the existing link is stale. */
  mode: 'link' | 'relink';
  onClose: () => void;
  /** Called with the holder's id when the user chooses to merge into the person already linked. */
  onMergeInto: (holderId: number) => void;
}

/** `Name · Title · Company`, leaving out whichever parts Peopler has no value for. */
const resultLine = (r: PeoplerSearchResult): string =>
  [r.display_name, r.title, r.company].filter((part): part is string => Boolean(part)).join(' · ');

/**
 * Searches the user's Peopler and links the chosen person to this one. A result
 * already linked to someone else is not pickable; it offers to merge into that
 * person instead. A result linked to this very person is pickable (relinking
 * after moving to a new Peopler account).
 */
const LinkPeoplerDialog: React.FC<LinkPeoplerDialogProps> = ({ person, mode, onClose, onMergeInto }) => {
  const [text, setText] = useState(person.display_name);
  const debounced = useDebouncedValue(text).trim();
  const search = usePeoplerSearch(debounced);
  // Names the holder of an already-linked result. If the holder is not in the loaded list, the copy says "another person".
  const { data: people = [] } = usePeople({ limit: 100 });
  const { updatePerson } = usePeopleMutations();
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const holderName = (id: number) => people.find((p) => p.id === id)?.display_name ?? 'another person';

  const pick = async (result: PeoplerSearchResult) => {
    if (picking) return;
    setError(null);
    setPicking(true);
    try {
      await updatePerson(person.id, { peopler_id: result.id });
      onClose();
    } catch (e) {
      setError(peoplerErrorMessage(e));
      // Someone may have taken this Peopler person meanwhile: refresh so the merge offer can appear.
      if (isApiError(e, 'PEOPLER_ID_TAKEN')) void search.refetch();
      setPicking(false);
    }
  };

  const results = debounced === '' ? undefined : search.data;

  return (
    <Dialog title={mode === 'relink' ? 'Relink to Peopler' : 'Link to Peopler'} onClose={onClose} closeDisabled={picking} fullScreenOnPhone>
      <div className="px-7 pt-3.5 flex flex-col gap-[14px]">
        <div>
          <label htmlFor="link-peopler-search" className={fieldLabel}>
            Search your Peopler
          </label>
          <input
            id="link-peopler-search"
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className={fieldInput}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        {error && <p role="alert" className={fieldError}>{error}</p>}
        {search.error && debounced !== '' && (
          <p role="alert" className={fieldError}>{peoplerErrorMessage(search.error)}</p>
        )}
        {debounced !== '' && search.isFetching && !results && <p className="text-[14px] text-ink-muted">Searching…</p>}
        {results && results.length === 0 && (
          <p className="text-[14px] text-ink-muted">{`No one in your Peopler matches "${debounced}".`}</p>
        )}
        {results && results.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {results.map((r) => {
              const holderId = r.already_linked_person_id;
              const takenByOther = holderId !== null && holderId !== person.id;
              return (
                <li key={r.id} className="flex flex-col gap-1">
                  <button
                    type="button"
                    disabled={takenByOther || picking}
                    aria-describedby={takenByOther ? `peopler-taken-${r.id}` : undefined}
                    onClick={() => void pick(r)}
                    className="text-left px-3 py-2 rounded-lg border border-line-strong text-[14.5px] text-ink hover:bg-accent-soft disabled:opacity-60 disabled:hover:bg-transparent"
                  >
                    {resultLine(r)}
                  </button>
                  {takenByOther && (
                    <div className="flex flex-wrap items-center gap-2 px-1 text-[13px] text-ink-muted">
                      <span id={`peopler-taken-${r.id}`}>{`Already linked to ${holderName(holderId)}`}</span>
                      <button type="button" onClick={() => onMergeInto(holderId)} className={ghostButton}>
                        {`Merge into ${holderName(holderId)}…`}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="flex items-center justify-end gap-1.5 pl-7 pr-5 pt-4 pb-5">
        {picking && <Spinner className="w-4 h-4" />}
        <button type="button" onClick={onClose} disabled={picking} className={ghostButton}>
          Cancel
        </button>
      </div>
    </Dialog>
  );
};

export default LinkPeoplerDialog;
