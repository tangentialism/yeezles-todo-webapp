import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useArea } from '../../contexts/AreaContext';
import { useToast } from '../../contexts/ToastContext';
import { useTopic, useTopicMutations, useTopicTodos } from '../../hooks/useTopicStore';
import { useTodoStore } from '../../hooks/useTodoStore';
import { useDismiss } from '../../hooks/useDismiss';
import { isApiError } from '../../services/apiError';
import type { Todo } from '../../types/todo';
import TodoRow from '../TodoRow';
import DoneItem from '../DoneItem';
import EditTodoModal from '../EditTodoModal';
import { ViewError, ViewLoading } from '../ViewChrome';
import { ChevronDownIcon, MoreIcon } from '../ui/Icons';
import { ghostButton, iconButton, menuItem, menuItemDanger, menuPanel, menuSeparator, sectionCap } from '../ui/styles';
import TopicNoteEditor from './TopicNoteEditor';
import EditTopicDialog from './EditTopicDialog';
import DeleteTopicDialog from './DeleteTopicDialog';

/** Props for {@link TopicDetail}. */
export interface TopicDetailProps {
  topicId: number;
  onBack: () => void;
}

/**
 * One topic, in place of the Topics list (spec §5.2): header with counts and
 * a menu (Edit, Archive, Delete), the description, the status note, then the
 * topic's open todos and a collapsed Done section. Loads by id, so it does
 * not depend on the selected area.
 */
const TopicDetail: React.FC<TopicDetailProps> = ({ topicId, onBack }) => {
  const { areas } = useArea();
  const { data: topic, isLoading, error, refetch } = useTopic(topicId);
  const { data: openTodos = [] } = useTopicTodos(topicId, false);
  const { data: doneTodos = [] } = useTopicTodos(topicId, true);
  const { updateTopic } = useTopicMutations();
  const { toggleTodoCompletion, getTodoDisplayState } = useTodoStore();
  const { showToast } = useToast();

  const [menuOpen, setMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<'edit' | 'delete' | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const dismissRefs = useMemo(() => [triggerRef, panelRef], []);
  useDismiss(dismissRefs, closeMenu, menuOpen);

  const back = (
    <button type="button" onClick={onBack} className={`${ghostButton} -ml-4 mb-2`}>
      ← Topics
    </button>
  );

  if (isLoading) return <div>{back}<ViewLoading label="Loading topic..." /></div>;
  if (error || !topic) {
    return (
      <div>
        {back}
        {isApiError(error, 'TOPIC_NOT_FOUND') ? (
          <ViewError title="Topic not found" message="It may have been deleted." />
        ) : (
          <ViewError
            title="Could not load this topic"
            message={error instanceof Error ? error.message : 'Please try again.'}
            onRetry={() => refetch()}
          />
        )}
      </div>
    );
  }

  // Awaited, not fire-and-forget: a failure surfaces as a toast instead of
  // an unhandled rejection (the mutation itself shows nothing).
  const toggleArchived = async () => {
    setMenuOpen(false);
    const archived = !topic.archived;
    try {
      await updateTopic(topic.id, { archived });
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Unexpected error';
      showToast({ message: `Could not ${archived ? 'archive' : 'unarchive'} the topic: ${reason}`, type: 'error' });
    }
  };

  const area = areas.find((a) => a.id === topic.area_id);
  const row = (todo: Todo) => (
    <TodoRow
      key={todo.id}
      todo={todo}
      displayState={getTodoDisplayState(todo)}
      area={area}
      showTopic={false}
      onToggleComplete={(t) => {
        void toggleTodoCompletion(t);
      }}
      onEdit={setEditingTodo}
      onUpdate={() => {}}
    />
  );

  return (
    <div>
      {back}
      <div className="flex items-start gap-3 pb-3 border-b-[1.5px] border-ink">
        <div className="flex-1 min-w-0">
          <h1 className="flex items-center gap-3 font-serif font-medium text-[30px] sm:text-4xl leading-[1.1] tracking-[-0.015em] text-ink">
            {area && <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full flex-none" style={{ backgroundColor: area.color }} />}
            {topic.name}
          </h1>
          <p className="mt-1.5 flex items-center gap-3 text-[13px] text-ink-muted">
            <span className="font-mono">{topic.open_count} open · {topic.done_count} done</span>
            {topic.archived && <span className="px-2 h-[22px] inline-flex items-center rounded-full bg-hover text-[12px]">Archived</span>}
          </p>
        </div>
        <div className="relative">
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Topic actions"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className={iconButton}
          >
            <MoreIcon className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div ref={panelRef} role="menu" aria-label="Topic actions" className={`absolute right-0 top-11 z-30 w-52 ${menuPanel}`}>
              <button type="button" role="menuitem" className={menuItem} onClick={() => { setMenuOpen(false); setDialog('edit'); }}>
                Edit
              </button>
              <button
                type="button"
                role="menuitem"
                className={menuItem}
                onClick={() => {
                  void toggleArchived();
                }}
              >
                {topic.archived ? 'Unarchive' : 'Archive'}
              </button>
              <div className={menuSeparator} />
              <button type="button" role="menuitem" className={menuItemDanger} onClick={() => { setMenuOpen(false); setDialog('delete'); }}>
                Delete…
              </button>
            </div>
          )}
        </div>
      </div>

      {topic.description && <p className="mt-4 text-[14.5px] leading-6 text-ink-2 whitespace-pre-wrap">{topic.description}</p>}

      <div className="mt-5">
        <TopicNoteEditor topic={topic} />
      </div>

      <h2 className={`${sectionCap} mt-8 mb-1`}>Open</h2>
      {openTodos.length === 0 ? (
        <p className="py-4 text-sm text-ink-muted border-b border-line">No open todos in this topic.</p>
      ) : (
        <div role="list" aria-label="Open todos">{openTodos.map(row)}</div>
      )}

      {doneTodos.length > 0 && (
        <section className="mt-6">
          <button
            type="button"
            onClick={() => setShowDone((v) => !v)}
            aria-expanded={showDone}
            className={`${sectionCap} inline-flex items-center gap-1.5`}
          >
            {`Done (${doneTodos.length})`}
            <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform ${showDone ? 'rotate-180' : ''}`} />
          </button>
          {/* DoneItem, not TodoRow: a completed todo in TodoRow reads as
              mid-completion ("Completing…" with Undo). */}
          {showDone && (
            <ul aria-label="Done todos" className="mt-1">
              {doneTodos.map((todo) => (
                <DoneItem key={todo.id} todo={todo} showTopic={false} />
              ))}
            </ul>
          )}
        </section>
      )}

      {dialog === 'edit' && <EditTopicDialog topic={topic} onClose={() => setDialog(null)} />}
      {dialog === 'delete' && (
        <DeleteTopicDialog
          topic={topic}
          onClose={() => setDialog(null)}
          onDeleted={() => {
            setDialog(null);
            onBack();
          }}
        />
      )}
      <EditTodoModal
        todo={editingTodo}
        isOpen={editingTodo !== null}
        onClose={() => setEditingTodo(null)}
        onTodoUpdated={() => setEditingTodo(null)}
      />
    </div>
  );
};

export default TopicDetail;
