import React, { useMemo, useState } from 'react';
import { useTodayViewStore } from '../hooks/useTodayViewStore';
import { useTodoStore } from '../hooks/useTodoStore';
import { useArea } from '../contexts/AreaContext';
import { getDueInfo } from '../utils/dueDate';
import { stripTags } from '../utils/todoText';
import EditTodoModal from './EditTodoModal';
import TodoRow from './TodoRow';
import { ViewEmpty, ViewError, ViewHeader, ViewLoading } from './ViewChrome';
import { CheckIcon } from './ui/Icons';
import type { Todo } from '../types/todo';

/** Segments in the progress bar beyond which it is drawn as one continuous bar. */
const MAX_PROGRESS_SEGMENTS = 20;

const isSameLocalDay = (iso: string, day: Date) => {
  const date = new Date(iso);
  return (
    date.getFullYear() === day.getFullYear() &&
    date.getMonth() === day.getMonth() &&
    date.getDate() === day.getDate()
  );
};

/**
 * The Today view: date heading, a totals line and progress bar, then one list
 * of everything in focus (overdue first, then due today, then picked for
 * today), today's completed todos, and a short "Coming up" list.
 *
 * Backed by {@link useTodayViewStore} for data fetching and optimistic updates.
 */
const TodayView: React.FC = () => {
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { areas } = useArea();

  const {
    todayData,
    isLoading: loading,
    isRefetching,
    error: queryError,
    toggleTodoCompletion,
    getTodoDisplayState,
    refetchTodayView
  } = useTodayViewStore();

  // Completed todos (shared cache with the Done view) for today's progress
  const { todos: completedTodos } = useTodoStore({ view: 'completed' });

  const error = queryError ? (queryError as Error).message : null;
  const now = new Date();

  const doneToday = useMemo(
    () =>
      completedTodos
        .filter((todo) => todo.completed_at && isSameLocalDay(todo.completed_at, now))
        .sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? '')),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `now` only matters per render of the list
    [completedTodos]
  );

  // Overdue first, then due today, then picked for today; a todo appears once.
  const focusTodos = useMemo(() => {
    if (!todayData) return [];
    const seen = new Set<number>();
    return [...todayData.focus.overdue, ...todayData.focus.due_today, ...todayData.focus.today_tagged].filter(
      (todo) => {
        if (seen.has(todo.id)) return false;
        seen.add(todo.id);
        return true;
      }
    );
  }, [todayData]);

  const toggleTodo = async (todo: Todo) => {
    await toggleTodoCompletion(todo);
  };

  const handleEditTodo = (todo: Todo) => {
    setEditingTodo(todo);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingTodo(null);
  };

  const handleTodoUpdated = () => {
    // Store automatically handles updates, but we can trigger a refetch if needed
    refetchTodayView();
  };

  if (loading) {
    return <ViewLoading label="Loading today's focus..." />;
  }

  if (error) {
    return <ViewError title="Error loading today view" message={error} onRetry={() => refetchTodayView()} />;
  }

  if (!todayData) {
    return <ViewEmpty title="No data available" />;
  }

  const { upcoming, summary } = todayData;
  const areaById = new Map((Array.isArray(areas) ? areas : []).map((area) => [area.id, area]));
  const areaFor = (todo: Todo) => (todo.area_id !== null ? areaById.get(todo.area_id) ?? null : null);

  const openCount = focusTodos.filter((todo) => !getTodoDisplayState(todo).completed).length;
  const progressTotal = openCount + doneToday.length;
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long' });

  return (
    <div>
      <ViewHeader
        title={
          <span>
            {weekday} <span className="text-accent">{now.getDate()}</span>
          </span>
        }
        totals={[
          { value: openCount, label: 'today' },
          { value: summary.total_overdue, label: 'overdue', tone: summary.total_overdue ? 'danger' : undefined },
          { value: doneToday.length, label: 'done', tone: 'accent' },
          { value: summary.total_coming_soon, label: 'coming up' },
        ]}
        onRefresh={() => refetchTodayView()}
        isRefreshing={isRefetching}
        refreshLabel="Refresh today view"
        ruled={false}
      />

      {progressTotal > 0 && (
        <div
          role="img"
          aria-label={`${doneToday.length} of ${progressTotal} done today`}
          className="flex gap-[3px] mb-1.5"
        >
          {progressTotal <= MAX_PROGRESS_SEGMENTS ? (
            Array.from({ length: progressTotal }, (_, i) => (
              <span
                key={i}
                className={`flex-1 h-1 rounded-sm transition-colors ${i < doneToday.length ? 'bg-accent' : 'bg-line'}`}
              />
            ))
          ) : (
            <span className="flex-1 h-1 rounded-sm bg-line overflow-hidden">
              <span
                className="block h-full bg-accent transition-[width]"
                style={{ width: `${(doneToday.length / progressTotal) * 100}%` }}
              />
            </span>
          )}
        </div>
      )}

      {focusTodos.length === 0 && doneToday.length === 0 ? (
        <ViewEmpty title="All caught up!" message="Use the sun on any todo to add it to Today." />
      ) : (
        <div role="list">
          {focusTodos.map((todo) => (
            <TodoRow
              key={todo.id}
              todo={todo}
              displayState={getTodoDisplayState(todo)}
              area={areaFor(todo)}
              showArea
              variant="today"
              showTodayToggle={todo.is_today}
              onToggleComplete={toggleTodo}
              onEdit={handleEditTodo}
              onUpdate={handleTodoUpdated}
            />
          ))}
          {doneToday.map((todo) => (
            <div key={todo.id} role="listitem" className="flex items-start gap-4 py-[15px] border-b border-line">
              <span className="-my-2.5 -ml-3 -mr-2 w-11 h-11 flex-none inline-flex items-center justify-center" aria-hidden="true">
                <span className="w-[22px] h-[22px] rounded-full bg-accent text-white flex items-center justify-center">
                  <CheckIcon className="w-3 h-3" />
                </span>
              </span>
              <span className="flex-1 min-w-0 text-[16.5px] leading-6 text-ink-faint line-through decoration-line-strong">
                <span className="sr-only">Done: </span>
                {stripTags(todo.title)}
              </span>
              <span className="flex-none pt-[3px] mr-[50px] font-mono text-xs text-ink-faint">
                {new Date(todo.completed_at!).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      )}

      {upcoming.coming_soon.length > 0 && (
        <section aria-labelledby="coming-up-heading" className="mt-11">
          <h2
            id="coming-up-heading"
            className="mb-1 font-mono text-[11.5px] font-medium uppercase tracking-[0.12em] text-ink-muted"
          >
            Coming up
          </h2>
          <ul>
            {upcoming.coming_soon.map((todo) => {
              const area = areaFor(todo);
              return (
                <li
                  key={todo.id}
                  className="flex items-center gap-3.5 py-[11px] border-b border-dashed border-line-strong text-[15px] text-ink-2"
                >
                  <span
                    className="w-2 h-2 rounded-full flex-none"
                    style={{ backgroundColor: area?.color ?? 'rgb(var(--line-strong))' }}
                    aria-hidden="true"
                  />
                  <span className="flex-1 min-w-0 truncate">{stripTags(todo.title)}</span>
                  <span className="flex-none font-mono text-xs">{getDueInfo(todo.due_date).label}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Edit Todo Modal */}
      <EditTodoModal
        todo={editingTodo}
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        onTodoUpdated={handleTodoUpdated}
      />
    </div>
  );
};

export default TodayView;
