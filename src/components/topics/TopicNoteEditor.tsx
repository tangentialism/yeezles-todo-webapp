import React, { useEffect, useState } from 'react';
import { useTopicMutations } from '../../hooks/useTopicStore';
import type { TopicWithCounts } from '../../types/topic';
import { formatRelative } from '../../utils/date';
import { Spinner } from '../ui/Icons';
import { fieldError, fieldInput, fieldLabel, primaryButton } from '../ui/styles';
import { TOPIC_NOTE_COUNTER_FROM, TOPIC_NOTE_MAX } from '../../constants';

/** Props for {@link TopicNoteEditor}. */
interface TopicNoteEditorProps {
  topic: TopicWithCounts;
}

/**
 * The topic's status note: a textarea with Save (enabled only when changed),
 * the note's age, and a counter near the 10,000-character limit. Blank text
 * saves as null, which clears the note (spec §5.2).
 */
const TopicNoteEditor: React.FC<TopicNoteEditorProps> = ({ topic }) => {
  const saved = topic.status_note ?? '';
  const [text, setText] = useState(saved);
  const [error, setError] = useState<string | null>(null);
  const { setTopicNote, isSavingNote } = useTopicMutations();
  const isDirty = text !== saved;

  // A note saved in another tab or by a proposal replaces untouched text.
  const [lastSaved, setLastSaved] = useState(saved);
  useEffect(() => {
    if (saved !== lastSaved) {
      if (text === lastSaved) setText(saved);
      setLastSaved(saved);
    }
  }, [saved, lastSaved, text]);

  const handleSave = async () => {
    setError(null);
    try {
      await setTopicNote(topic.id, text.trim() ? text : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the note.');
    }
  };

  return (
    <div>
      <label htmlFor={`topic-note-${topic.id}`} className={fieldLabel}>
        Status note
      </label>
      <textarea
        id={`topic-note-${topic.id}`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={TOPIC_NOTE_MAX}
        rows={5}
        className={fieldInput}
        placeholder="Where does this stand?"
        disabled={isSavingNote}
      />
      <div className="mt-2 flex items-center gap-3">
        <span className="flex-1 text-[12.5px] text-ink-faint">
          {topic.status_note_updated_at ? `Updated ${formatRelative(topic.status_note_updated_at)}` : 'Never updated'}
        </span>
        {text.length >= TOPIC_NOTE_COUNTER_FROM && (
          <span className="font-mono text-xs text-ink-muted">
            {text.length.toLocaleString('en-US')} / {TOPIC_NOTE_MAX.toLocaleString('en-US')}
          </span>
        )}
        <button type="button" onClick={handleSave} disabled={!isDirty || isSavingNote} className={primaryButton}>
          {isSavingNote && <Spinner className="w-4 h-4" />}
          Save note
        </button>
      </div>
      {error && <p className={fieldError}>{error}</p>}
    </div>
  );
};

export default TopicNoteEditor;
