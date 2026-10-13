import React, { useState } from 'react';
import { useTodoStore } from '../hooks/useTodoStore';
import { useArea } from '../contexts/AreaContext';
import { useApi } from '../hooks/useApi';
import { useToast } from '../contexts/ToastContext';
import { logger } from '../utils/logger';
import Dialog from './ui/Dialog';
import AreaChips from './ui/AreaChips';
import TopicPicker from './topics/TopicPicker';
import { useTopicSelection } from '../hooks/useTopicSelection';
import Switch from './ui/Switch';
import { CalendarIcon, LinkIcon, Spinner, SunIcon } from './ui/Icons';
import { fieldHint, fieldInput, fieldLabel, fieldOptional, ghostButton, primaryButton } from './ui/styles';

/** Props for {@link AddTodoModal}. */
interface AddTodoModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after successful creation, receives the new todo's ID for entrance animation. */
  onTodoAdded: (newTodoId?: number) => void;
  /** When set to "today", auto-enables the "Add to Today List" toggle. */
  currentView?: string;
  /** Pre-populated form values (e.g. from external sources like Obsidian). */
  initialData?: {
    title?: string;
    description?: string;
    referenceUrl?: string;
  };
}

/**
 * Modal for creating a new todo with optional AI-powered area categorization.
 *
 * If the user does not select an area manually, the todo title/description
 * are sent to `POST /todos/categorize` before creation to get an AI-suggested area.
 */
const AddTodoModal: React.FC<AddTodoModalProps> = ({ isOpen, onClose, onTodoAdded, currentView, initialData }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isToday, setIsToday] = useState(false);
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);
  const { topicId, cleared: topicCleared, selectTopic, changeArea, reset: resetTopic } = useTopicSelection(selectedAreaId, setSelectedAreaId);
  const [referenceUrl, setReferenceUrl] = useState('');
  const [isCategorizing, setIsCategorizing] = useState(false);
  const { createTodo, isCreating } = useTodoStore();
  const { areas } = useArea();
  const apiClient = useApi();
  const { showToast } = useToast();
  const isSubmitting = isCreating || isCategorizing;

  // Initialize form when modal opens - default to NO area selected for AI categorization
  React.useEffect(() => {
    if (isOpen) {
      // Default to null so AI can categorize (per Issue #4)
      setSelectedAreaId(null);
      resetTopic(null, null);
      // Auto-enable "Add to Today List" when on Today tab
      setIsToday(currentView === 'today');
      if (initialData) {
        if (initialData.title) setTitle(initialData.title);
        if (initialData.description) setDescription(initialData.description);
        if (initialData.referenceUrl) setReferenceUrl(initialData.referenceUrl);
      }
    }
  }, [isOpen, currentView, initialData, resetTopic]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      let finalAreaId = selectedAreaId;
      let assignedAreaName: string | null = null;

      // If no area selected, use AI categorization
      if (finalAreaId === null && apiClient) {
        setIsCategorizing(true);
        try {
          const categorizationResult = await apiClient.categorizeTodo(
            title.trim(),
            description.trim() || undefined
          );
          
          if (categorizationResult.success && categorizationResult.data.area_id) {
            finalAreaId = categorizationResult.data.area_id;
            assignedAreaName = categorizationResult.data.area_name;
            logger.log('AI categorized todo:', {
              area: assignedAreaName,
              confidence: categorizationResult.data.confidence,
              reasoning: categorizationResult.data.reasoning
            });
          }
        } catch (catError) {
          logger.warn('AI categorization failed, continuing without area:', catError);
          // Continue with null area - will fall back to default on backend
        } finally {
          setIsCategorizing(false);
        }
      } else if (finalAreaId !== null) {
        // User explicitly selected an area
        assignedAreaName = areas.find(a => a.id === finalAreaId)?.name || null;
      }

      const todoData = {
        title: title.trim(),
        description: description.trim() || undefined,
        due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
        is_today: isToday,
        area_id: finalAreaId,
        // A topic implies its area, which the picker already set (spec §5.4)
        ...(topicId !== null ? { topic_id: topicId } : {}),
        reference_url: referenceUrl.trim() || undefined,
      };

      const newTodo = await createTodo(todoData);
      
      // Reset form
      setTitle('');
      setDescription('');
      setDueDate('');
      setIsToday(false);
      setSelectedAreaId(null);
      resetTopic(null, null);
      setReferenceUrl('');
      
      // Notify parent with the assigned area info
      onTodoAdded(newTodo.id);
      
      // Show toast notification with area assignment
      if (assignedAreaName) {
        showToast({ message: `Todo added to "${assignedAreaName}"`, type: 'success' });
      } else {
        showToast({ message: 'Todo created successfully', type: 'success' });
      }
      
      onClose();
    } catch (error) {
      logger.error('Error creating todo:', error);
      // Error handling is done in the store with toast
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setTitle('');
      setDescription('');
      setDueDate('');
      setIsToday(false);
      setSelectedAreaId(null);
      resetTopic(null, null);
      setReferenceUrl('');
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

  if (!isOpen) return null;

  return (
    <Dialog title="New todo" onClose={handleClose} closeDisabled={isSubmitting}>
      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
        <div className="px-7 pt-3 flex flex-col gap-[18px]">
          <div>
            <label htmlFor="title" className="sr-only">
              Title
            </label>
            <input
              type="text"
              id="title"
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
            <label htmlFor="description" className={fieldLabel}>
              Notes <span className={fieldOptional}>optional</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className={fieldInput}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <span id="area-label" className={fieldLabel}>
              Area
            </span>
            <AreaChips
              areas={areas}
              value={selectedAreaId}
              onChange={changeArea}
              nullLabel="Auto"
              disabled={isSubmitting}
              labelId="area-label"
            />
            {selectedAreaId === null && (
              <p className={fieldHint}>Auto picks an area from the title and notes.</p>
            )}
          </div>

          <TopicPicker
            id="topic"
            areaId={selectedAreaId}
            value={topicId}
            onChange={selectTopic}
            showCleared={topicCleared}
            disabled={isSubmitting}
          />

          <div>
            <label htmlFor="dueDate" className={fieldLabel}>
              Due <span className={fieldOptional}>optional</span>
            </label>
            <div className="relative max-w-[260px]">
              <CalendarIcon className="pointer-events-none absolute left-3 top-[13px] w-4 h-4 text-ink-muted" />
              <input
                type="datetime-local"
                id="dueDate"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={`${fieldInput} pl-[38px] font-mono text-[13.5px]`}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <label htmlFor="referenceUrl" className={fieldLabel}>
              Link <span className={fieldOptional}>optional</span>
            </label>
            <div className="relative">
              <LinkIcon className="pointer-events-none absolute left-3 top-[13px] w-4 h-4 text-ink-muted" />
              <input
                type="text"
                id="referenceUrl"
                value={referenceUrl}
                onChange={(e) => setReferenceUrl(e.target.value)}
                placeholder="obsidian:// or https://"
                className={`${fieldInput} pl-[38px]`}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <label htmlFor="isToday" className="flex items-center gap-3 py-3 border-t border-line cursor-pointer">
            <SunIcon className="w-[18px] h-[18px] text-accent" />
            <span className="flex-1 text-sm font-medium text-ink">Add to Today</span>
            <Switch id="isToday" checked={isToday} onChange={setIsToday} disabled={isSubmitting} />
          </label>
        </div>

        <div className="flex items-center justify-end gap-1.5 pl-7 pr-5 pt-2 pb-5">
          <button type="button" onClick={handleClose} disabled={isSubmitting} className={ghostButton}>
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting || !title.trim()} className={primaryButton}>
            {isSubmitting ? (
              <>
                <Spinner className="w-4 h-4" />
                {isCategorizing ? 'Categorizing…' : 'Adding…'}
              </>
            ) : (
              <>
                Add todo <span className="font-mono text-[11px] text-ink-faint" aria-hidden="true">⌘↵</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Dialog>
  );
};

export default AddTodoModal;
