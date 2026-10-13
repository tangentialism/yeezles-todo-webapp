import React, { useState } from 'react';
import Dialog from '../ui/Dialog';
import AreaChips from '../ui/AreaChips';
import { Spinner } from '../ui/Icons';
import { fieldError, fieldInput, fieldLabel, fieldOptional, ghostButton, primaryButton } from '../ui/styles';
import { useArea } from '../../contexts/AreaContext';
import { useTopicMutations } from '../../hooks/useTopicStore';
import { isApiError } from '../../services/apiError';
import type { Topic } from '../../types/topic';
import { TOPIC_DESCRIPTION_MAX, TOPIC_NAME_MAX } from '../../constants';

/** Props for {@link NewTopicDialog}. */
interface NewTopicDialogProps {
  /** The area the topic goes in; null asks for one (All areas, or a form with no area). */
  defaultAreaId: number | null;
  onClose: () => void;
  onCreated: (topic: Topic) => void;
}

/**
 * Creates a topic: name, optional description, and the area when none is
 * implied. A taken name (unique per user, ignoring case) shows inline.
 */
const NewTopicDialog: React.FC<NewTopicDialogProps> = ({ defaultAreaId, onClose, onCreated }) => {
  const { areas } = useArea();
  const { createTopic, isCreating } = useTopicMutations();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [areaId, setAreaId] = useState<number | null>(defaultAreaId);
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const trimmed = name.trim();
  const canSubmit = trimmed.length > 0 && areaId !== null && !isCreating;
  const area = areas.find((a) => a.id === areaId);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    // Portalled content still bubbles React events to an enclosing todo form
    // (this dialog is opened from the add/edit todo forms), so stop it here.
    event.stopPropagation();
    if (!canSubmit || areaId === null) return;
    setNameError(null);
    setFormError(null);
    try {
      const topic = await createTopic({ name: trimmed, area_id: areaId, description: description.trim() || null });
      onCreated(topic);
    } catch (error) {
      if (isApiError(error, 'TOPIC_NAME_TAKEN')) {
        setNameError(`You already have a topic called "${trimmed}" (names are unique across areas).`);
      } else {
        setFormError(error instanceof Error ? error.message : 'Could not create the topic.');
      }
    }
  };

  return (
    <Dialog title="New topic" titleDotColor={area?.color} onClose={onClose} closeDisabled={isCreating}>
      <form
        onSubmit={handleSubmit}
        onKeyDown={(event) => {
          // Cmd/Ctrl+Enter is a submit shortcut in the todo forms; keep it from reaching them.
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) event.stopPropagation();
        }}
        noValidate
      >
        <div className="px-7 pt-3.5 flex flex-col gap-[18px]">
          <div>
            <label htmlFor="new-topic-name" className={fieldLabel}>
              Name
            </label>
            <input
              id="new-topic-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameError(null);
              }}
              maxLength={TOPIC_NAME_MAX}
              className={`${fieldInput} ${nameError ? '!border-danger/50' : ''}`}
              placeholder="Kitchen reno, Q4 hiring, Garden"
              aria-invalid={Boolean(nameError)}
              aria-describedby={nameError ? 'new-topic-name-error' : undefined}
              disabled={isCreating}
              autoFocus
            />
            {nameError && (
              <p id="new-topic-name-error" className={fieldError}>
                {nameError}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="new-topic-description" className={fieldLabel}>
              Description <span className={fieldOptional}>optional</span>
            </label>
            <textarea
              id="new-topic-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={TOPIC_DESCRIPTION_MAX}
              rows={2}
              className={fieldInput}
              disabled={isCreating}
            />
          </div>

          {defaultAreaId === null && (
            <div>
              <span id="new-topic-area-label" className={fieldLabel}>
                Area
              </span>
              <AreaChips areas={areas} value={areaId} onChange={setAreaId} disabled={isCreating} labelId="new-topic-area-label" />
            </div>
          )}

          {formError && <p className={fieldError}>{formError}</p>}
        </div>

        <div className="flex items-center justify-end gap-1.5 pl-7 pr-5 pt-4 pb-5">
          <button type="button" onClick={onClose} disabled={isCreating} className={ghostButton}>
            Cancel
          </button>
          <button type="submit" disabled={!canSubmit} className={primaryButton}>
            {isCreating && <Spinner className="w-4 h-4" />}
            Create topic
          </button>
        </div>
      </form>
    </Dialog>
  );
};

export default NewTopicDialog;
