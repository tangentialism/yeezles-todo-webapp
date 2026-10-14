import React, { useState } from 'react';
import { useTodoStore } from '../hooks/useTodoStore';
import { useArea } from '../contexts/AreaContext';
import type { Todo } from '../types/todo';
import { logger } from '../utils/logger';
import Dialog from './ui/Dialog';
import AreaChips from './ui/AreaChips';
import TopicPicker from './topics/TopicPicker';
import { useTopicSelection } from '../hooks/useTopicSelection';
import Switch from './ui/Switch';
import { CalendarIcon, CheckIcon, LinkIcon, Spinner, SunIcon } from './ui/Icons';
import { fieldHint, fieldInput, fieldLabel, fieldOptional, ghostButton, primaryButton } from './ui/styles';

/** Props for {@link EditTodoModal}. */
interface EditTodoModalProps {
  /** The todo to edit; modal renders nothing when null. */
  todo: Todo | null;
  isOpen: boolean;
  onClose: () => void;
  onTodoUpdated: () => void;
}

/**
 * Modal for editing all fields of an existing todo (title, description, area,
 * due date, today status, completion, and reference URL). The form initializes
 * from the provided `todo` prop whenever it changes.
 */
const EditTodoModal: React.FC<EditTodoModalProps> = ({ todo, isOpen, onClose, onTodoUpdated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [completed, setCompleted] = useState(false);
  const [isToday, setIsToday] = useState(false);
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);
  const { topicId, cleared: topicCleared, selectTopic, changeArea, reset: resetTopic } = useTopicSelection(selectedAreaId, setSelectedAreaId);
  const [referenceUrl, setReferenceUrl] = useState('');
  const { updateTodo, isUpdating } = useTodoStore();
  const { areas } = useArea();
  const isSubmitting = isUpdating;

  // Initialize form when todo changes
  React.useEffect(() => {
    if (todo) {
      setTitle(todo.title);
      setDescription(todo.description || '');
      setCompleted(todo.completed);
      setIsToday(todo.is_today);
      setSelectedAreaId(todo.area_id);
      resetTopic(todo.topic_id ?? null, todo.topic_id ? todo.area_id : null);
      setReferenceUrl(todo.reference_url || '');

      // Format due date for datetime-local input
      if (todo.due_date) {
        const date = new Date(todo.due_date);
        const formattedDate = date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
        setDueDate(formattedDate);
      } else {
        setDueDate('');
      }
    }
  }, [todo, resetTopic]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!todo || !title.trim()) return;

    try {
      // topic_id goes only when the user changed it, or an area change cleared
      // it. An untouched save omits it, so a todo whose topic the form never
      // knew (topic_id undefined, a stale cache) is not cleared by sending null;
      // the server keeps the topic while area_id is unchanged (spec §2.1 item 4).
      const loadedTopicId = todo.topic_id ?? null; // what the effect passed to resetTopic
      const topicChanged = topicCleared || topicId !== loadedTopicId;
      const updateData = {
        title: title.trim(),
        description: description.trim() || undefined,
        completed,
        due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
        is_today: isToday,
        area_id: selectedAreaId,
        ...(topicChanged ? { topic_id: topicId } : {}),
        reference_url: referenceUrl.trim() || undefined,
      };

      await updateTodo(todo.id, updateData);
      onTodoUpdated();
      onClose();
    } catch (error) {
      logger.error('Error updating todo:', error);
      // Error handling is done in the store with toast
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  // Cmd/Ctrl+Enter submits from any field
  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      e.currentTarget.requestSubmit();
    }
  };

  if (!isOpen || !todo) return null;

  return (
    <Dialog title="Edit todo" onClose={handleClose} closeDisabled={isSubmitting}>
      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
        <div className="px-7 pt-3 flex flex-col gap-[18px]">
          <div>
            <label htmlFor="edit-title" className="sr-only">
              Title
            </label>
            <input
              type="text"
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs doing?"
              className="w-full bg-transparent border-0 border-b-[1.5px] border-ink pt-2 pb-2.5 text-[19px] font-medium text-ink placeholder:text-ink-faint placeholder:font-normal focus:outline-none focus:border-accent disabled:opacity-60"
              required
              disabled={isSubmitting}
              autoFocus
            />
            <p className={fieldHint}>
              <span className="font-mono text-accent-ink">@tag</span> to tag ·{' '}
              <span className="font-mono text-accent-ink">#123</span> to link a todo
            </p>
          </div>

          <div>
            <label htmlFor="edit-description" className={fieldLabel}>
              Notes <span className={fieldOptional}>optional</span>
            </label>
            <textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className={fieldInput}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <span id="edit-area-label" className={fieldLabel}>
              Area
            </span>
            <AreaChips
              areas={areas}
              value={selectedAreaId}
              onChange={changeArea}
              nullLabel="None"
              disabled={isSubmitting}
              labelId="edit-area-label"
            />
          </div>

          <TopicPicker
            id="edit-topic"
            areaId={selectedAreaId}
            value={topicId}
            onChange={selectTopic}
            currentTopic={todo.topic ?? null}
            showCleared={topicCleared}
            disabled={isSubmitting}
          />

          <div>
            <label htmlFor="edit-dueDate" className={fieldLabel}>
              Due <span className={fieldOptional}>optional</span>
            </label>
            <div className="relative max-w-[260px]">
              <CalendarIcon className="pointer-events-none absolute left-3 top-[13px] w-4 h-4 text-ink-muted" />
              <input
                type="datetime-local"
                id="edit-dueDate"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={`${fieldInput} pl-[38px] font-mono text-[13.5px]`}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <label htmlFor="edit-referenceUrl" className={fieldLabel}>
              Link <span className={fieldOptional}>optional</span>
            </label>
            <div className="relative">
              <LinkIcon className="pointer-events-none absolute left-3 top-[13px] w-4 h-4 text-ink-muted" />
              <input
                type="text"
                id="edit-referenceUrl"
                value={referenceUrl}
                onChange={(e) => setReferenceUrl(e.target.value)}
                placeholder="obsidian:// or https://"
                className={`${fieldInput} pl-[38px]`}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="border-t border-line">
            <label htmlFor="edit-isToday" className="flex items-center gap-3 py-3 cursor-pointer">
              <SunIcon className="w-[18px] h-[18px] text-accent" />
              <span className="flex-1 text-sm font-medium text-ink">Add to Today</span>
              <Switch id="edit-isToday" checked={isToday} onChange={setIsToday} disabled={isSubmitting} />
            </label>
            <label htmlFor="edit-completed" className="flex items-center gap-3 py-3 border-t border-line cursor-pointer">
              <CheckIcon className="w-[18px] h-[18px] text-ink-muted" />
              <span className="flex-1 text-sm font-medium text-ink">Mark as completed</span>
              <Switch id="edit-completed" checked={completed} onChange={setCompleted} disabled={isSubmitting} />
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-1.5 pl-7 pr-5 pt-2 pb-5">
          <button type="button" onClick={handleClose} disabled={isSubmitting} className={ghostButton}>
            Cancel
          </button>
          <button type="submit" disabled={!title.trim() || isSubmitting} className={primaryButton}>
            {isSubmitting ? (
              <>
                <Spinner className="w-4 h-4" />
                Saving…
              </>
            ) : (
              <>
                Save <span className="font-mono text-[11px] text-ink-faint" aria-hidden="true">⌘↵</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Dialog>
  );
};

export default EditTodoModal;
