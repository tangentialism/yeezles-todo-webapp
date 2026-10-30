import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTodoStore } from '../hooks/useTodoStore';
import { useArea } from '../contexts/AreaContext';
import { logger } from '../utils/logger';
import PageShell from './ui/PageShell';
import AreaChips from './ui/AreaChips';
import TopicPicker from './topics/TopicPicker';
import { useTopicSelection } from '../hooks/useTopicSelection';
import Switch from './ui/Switch';
import { CalendarIcon, FileIcon, LinkIcon, Spinner, SunIcon } from './ui/Icons';
import { fieldInput, fieldLabel, fieldOptional, ghostButton, pageCard, primaryButton } from './ui/styles';

/**
 * Single-todo creation page for external sources (e.g. Obsidian deep-links).
 *
 * Pre-populates title, description, and reference URL from URL query params.
 * After creation, navigates back to the dashboard.
 */
const CreateTodoFromExternal: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { createTodo, isCreating } = useTodoStore();
  const { areas, currentArea } = useArea();

  // Parse URL parameters
  const searchParams = new URLSearchParams(location.search);
  const initialTitle = searchParams.get('title') || '';
  const initialDescription = searchParams.get('description') || '';
  const initialReferenceUrl = searchParams.get('reference_url') || '';
  const source = searchParams.get('source') || '';
  const vault = searchParams.get('vault') || '';
  const file = searchParams.get('file') || '';

  // Form state
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [referenceUrl, setReferenceUrl] = useState(initialReferenceUrl);
  const [dueDate, setDueDate] = useState('');
  const [isToday, setIsToday] = useState(false);
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);

  const { topicId, cleared: topicCleared, selectTopic, changeArea } = useTopicSelection(selectedAreaId, setSelectedAreaId);

  // Read from the effect below without re-running it when the topic changes
  const topicIdRef = useRef(topicId);
  topicIdRef.current = topicId;

  // Initialize with current area when it loads. Once a topic is chosen the
  // topic's area wins, so a late-loading area never disagrees with the topic.
  useEffect(() => {
    if (topicIdRef.current !== null) return;
    setSelectedAreaId(currentArea?.id || null);
  }, [currentArea]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const todoData = {
        title: title.trim(),
        description: description.trim() || undefined,
        reference_url: referenceUrl.trim() || undefined,
        due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
        is_today: isToday,
        area_id: selectedAreaId,
        ...(topicId !== null ? { topic_id: topicId } : {}),
      };

      await createTodo(todoData);

      // Navigate back to main dashboard
      navigate('/');
    } catch (error) {
      logger.error('Failed to create todo:', error);
    }
  };

  const handleCancel = () => {
    navigate('/');
  };

  const sourceLabel = source === 'obsidian' ? 'From Obsidian' : 'From another app';

  return (
    <PageShell homeHref="/">
      <main className={`mx-4 sm:mx-auto sm:max-w-[560px] mt-2 sm:mt-7 mb-10 ${pageCard}`}>
        <div className="px-6 sm:px-7 pt-6 pb-1">
          <h1 className="font-serif font-medium text-2xl tracking-[-0.01em] text-ink">New todo</h1>
          <p className="mt-3 inline-flex max-w-full items-center gap-2 h-[30px] pl-2.5 pr-3 rounded-full bg-hover text-[12.5px] text-ink-2">
            <FileIcon className="w-3.5 h-3.5 flex-none" />
            <span className="flex-none">{sourceLabel}</span>
            {vault && file && (
              <span className="font-mono text-ink-muted truncate">
                {vault}/{file}
              </span>
            )}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 sm:px-7 pt-4 flex flex-col gap-[18px]">
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
                className="w-full bg-transparent border-0 border-b-[1.5px] border-ink pt-2 pb-2.5 text-[19px] font-medium text-ink placeholder:text-ink-faint placeholder:font-normal focus:outline-none focus:border-accent"
                required
              />
            </div>

            <div>
              <label htmlFor="description" className={fieldLabel}>
                Notes <span className={fieldOptional}>optional</span>
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className={fieldInput}
              />
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
                  className={`${fieldInput} pl-[38px] font-mono text-[13px]`}
                />
              </div>
            </div>

            <div>
              <span id="external-area-label" className={fieldLabel}>
                Area
              </span>
              <AreaChips
                areas={areas}
                value={selectedAreaId}
                onChange={changeArea}
                nullLabel="None"
                labelId="external-area-label"
              />
            </div>

            <TopicPicker
              id="external-topic"
              areaId={selectedAreaId}
              value={topicId}
              onChange={selectTopic}
              showCleared={topicCleared}
            />

            <div>
              <label htmlFor="dueDate" className={fieldLabel}>
                Due <span className={fieldOptional}>optional</span>
              </label>
              <div className="relative max-w-[240px]">
                <CalendarIcon className="pointer-events-none absolute left-3 top-[13px] w-4 h-4 text-ink-muted" />
                <input
                  type="date"
                  id="dueDate"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className={`${fieldInput} pl-[38px] font-mono text-[13.5px]`}
                />
              </div>
            </div>

            <label htmlFor="isToday" className="flex items-center gap-3 py-3 border-t border-line cursor-pointer">
              <SunIcon className={`w-[18px] h-[18px] ${isToday ? 'text-today' : 'text-ink-faint'}`} />
              <span className="flex-1 text-sm font-medium text-ink">Add to Today</span>
              <Switch id="isToday" checked={isToday} onChange={setIsToday} />
            </label>
          </div>

          <div className="flex items-center justify-end gap-1.5 pl-7 pr-5 pt-2 pb-5">
            <button type="button" onClick={handleCancel} className={ghostButton}>
              Cancel
            </button>
            <button type="submit" disabled={isCreating || !title.trim()} className={primaryButton}>
              {isCreating && <Spinner className="w-4 h-4" />}
              {isCreating ? 'Adding…' : 'Add todo'}
            </button>
          </div>
        </form>
      </main>
    </PageShell>
  );
};

export default CreateTodoFromExternal;