import React, { useState } from 'react';
import Dialog from '../ui/Dialog';
import { Spinner } from '../ui/Icons';
import { fieldError, fieldInput, fieldLabel, fieldOptional, ghostButton, primaryButton } from '../ui/styles';
import { useTopicMutations } from '../../hooks/useTopicStore';
import { isApiError } from '../../services/apiError';
import type { Topic } from '../../types/topic';
import { TOPIC_DESCRIPTION_MAX, TOPIC_NAME_MAX } from '../../constants';

/** Props for {@link EditTopicDialog}. */
interface EditTopicDialogProps {
  topic: Topic;
  onClose: () => void;
}

/** Renames a topic and edits its description; the note is edited in place. */
const EditTopicDialog: React.FC<EditTopicDialogProps> = ({ topic, onClose }) => {
  const { updateTopic, isUpdating } = useTopicMutations();
  const [name, setName] = useState(topic.name);
  const [description, setDescription] = useState(topic.description ?? '');
  const [error, setError] = useState<string | null>(null);
  const trimmed = name.trim();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!trimmed) return;
    setError(null);
    try {
      await updateTopic(topic.id, { name: trimmed, description: description.trim() || null });
      onClose();
    } catch (err) {
      setError(
        isApiError(err, 'TOPIC_NAME_TAKEN')
          ? `You already have a topic called "${trimmed}" (names are unique across areas).`
          : err instanceof Error
            ? err.message
            : 'Could not save the topic.'
      );
    }
  };

  return (
    <Dialog title="Edit topic" onClose={onClose} closeDisabled={isUpdating}>
      <form onSubmit={handleSubmit} noValidate>
        <div className="px-7 pt-3.5 flex flex-col gap-[18px]">
          <div>
            <label htmlFor="edit-topic-name" className={fieldLabel}>
              Name
            </label>
            <input
              id="edit-topic-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={TOPIC_NAME_MAX}
              className={fieldInput}
              disabled={isUpdating}
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="edit-topic-description" className={fieldLabel}>
              Description <span className={fieldOptional}>optional</span>
            </label>
            <textarea
              id="edit-topic-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={TOPIC_DESCRIPTION_MAX}
              rows={3}
              className={fieldInput}
              disabled={isUpdating}
            />
          </div>
          {error && <p className={fieldError}>{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-1.5 pl-7 pr-5 pt-4 pb-5">
          <button type="button" onClick={onClose} disabled={isUpdating} className={ghostButton}>
            Cancel
          </button>
          <button type="submit" disabled={!trimmed || isUpdating} className={primaryButton}>
            {isUpdating && <Spinner className="w-4 h-4" />}
            Save
          </button>
        </div>
      </form>
    </Dialog>
  );
};

export default EditTopicDialog;
