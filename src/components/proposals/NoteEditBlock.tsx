import React, { useState } from 'react';
import Checkbox from '../ui/Checkbox';
import { fieldError, fieldInput, ghostButton, sectionCap } from '../ui/styles';
import { topicUsable } from '../../utils/proposalDraft';
import type { Draft, DraftAction, DraftNote, DraftTopic } from '../../utils/proposalDraft';
import { TOPIC_NOTE_MAX } from '../../constants';

/** Props for {@link NoteEditBlock}. */
interface NoteEditBlockProps {
  note: DraftNote;
  topic: DraftTopic;
  draft: Draft;
  dispatch: React.Dispatch<DraftAction>;
}

/**
 * A proposed note inside its topic's section: the current note muted above
 * the proposed one (before/after, not a word diff; addendum §6.2), with
 * Accept and Edit.
 */
const NoteEditBlock: React.FC<NoteEditBlockProps> = ({ note, topic, draft, dispatch }) => {
  const [editing, setEditing] = useState(false);
  const usable = topicUsable(draft, note.key);
  const first = topic.kind === 'new' || note.current === null;
  return (
    <div data-draft-error={note.error ? 'true' : undefined} className="mt-3 rounded-[12px] border border-line bg-surface p-3.5">
      <div className="flex items-center gap-3">
        <Checkbox
          checked={note.accepted && usable}
          onChange={() => dispatch({ type: 'toggleNote', key: note.key })}
          disabled={!usable}
          aria-label={`Accept note for "${topic.name}"`}
        />
        <span className={sectionCap}>{first ? 'First note' : 'Note edit'}</span>
        <span className="flex-1" />
        <button type="button" className={ghostButton} onClick={() => setEditing((v) => !v)} aria-label={`Edit note for "${topic.name}"`}>
          {editing ? 'Done' : 'Edit'}
        </button>
      </div>
      {!first && (
        <p className="mt-2 text-sm leading-5 text-ink-faint whitespace-pre-wrap">
          <span className="sr-only">Current note: </span>
          {note.current}
        </p>
      )}
      {editing ? (
        <textarea
          aria-label={`Proposed note for "${topic.name}"`}
          value={note.text}
          maxLength={TOPIC_NOTE_MAX}
          rows={4}
          onChange={(e) => dispatch({ type: 'editNote', key: note.key, text: e.target.value })}
          className={`${fieldInput} mt-2`}
        />
      ) : (
        <p className="mt-2 text-sm leading-5 text-ink whitespace-pre-wrap">{note.text || '(clears the note)'}</p>
      )}
      {note.error && <p className={fieldError}>{note.error}</p>}
    </div>
  );
};

export default NoteEditBlock;
