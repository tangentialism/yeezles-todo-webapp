import React, { useState, useEffect, useMemo } from 'react';
import { useTodoStore } from '../hooks/useTodoStore';
import { useArea } from '../contexts/AreaContext';
import { getDueInfo } from '../utils/dueDate';
import { calculateCompletionStats } from '../utils/todoGrouping';
import EditTodoModal from './EditTodoModal';
import TodoRow from './TodoRow';
import { ViewEmpty, ViewError, ViewHeader, ViewLoading } from './ViewChrome';
import type { Todo } from '../types/todo';
import { TODO_ENTRANCE_ANIMATION_MS } from '../constants';

/** Props for {@link TodoList}. */
interface TodoListProps {
  /** Which view to display ("all" or "completed"). Passed to {@link useTodoStore}. */
  view: string;
  /** Legacy refresh trigger (unused with TanStack Query but kept for API compat). */
  refreshTrigger?: number;
  /** ID of a newly created todo; triggers a fade-in + highlight entrance animation. */
  newTodoId?: number | null;
  /** Called after the entrance animation completes so the parent can clear `newTodoId`. */
  onNewTodoAnimationComplete?: () => void;
}

/**
 * Flat list of todos for the "All" view, headed by the current area's name
 * and a one-line totals summary (open, today, overdue, done today).
 *
 * Each todo is a {@link TodoRow}: completion tick (with optimistic toggle and
 * undo), tags, due date, Today toggle and actions menu. Newly created todos
 * play an entrance highlight, and completed todos in the "all" view collapse
 * out once the store marks them for removal.
 */
const TodoList: React.FC<TodoListProps> = ({
  view, 
  refreshTrigger: _, // Unused with new store but kept for API compatibility
  newTodoId, 
  onNewTodoAnimationComplete 
}) => {

  const { currentArea, areas } = useArea();
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [animatingTodos, setAnimatingTodos] = useState<Set<number>>(new Set());

  // Use the new todo store
  const {
    todos,
    isLoading: loading,
    isRefetching,
    error: queryError,
    getTodoDisplayState,
    toggleTodoCompletion,
    refetchTodos
  } = useTodoStore({ view });

  const error = queryError ? (queryError as Error).message : null;

  // Completed todos (shared cache with the Done view) for the "done today" count
  const { todos: completedTodos } = useTodoStore({ view: 'completed' });
  const doneToday = useMemo(
    () => calculateCompletionStats(completedTodos).completedToday,
    [completedTodos]
  );

  const totals = useMemo(() => {
    const open = todos.filter((todo) => !todo.completed);
    const dueKinds = open.map((todo) => getDueInfo(todo.due_date).kind);
    return {
      open: open.length,
      today: open.filter((todo, i) => todo.is_today || dueKinds[i] === 'today' || dueKinds[i] === 'overdue').length,
      overdue: dueKinds.filter((kind) => kind === 'overdue').length,
    };
  }, [todos]);

  // Remove the loadTodos function - now handled by useTodoStore

  // Optimistic updates are now handled by the store

  // Todo completion is now handled by the store
  // No useEffect needed - the store handles view/area changes automatically

  // Handle new todo animation
  useEffect(() => {
    if (newTodoId && !animatingTodos.has(newTodoId)) {
      // Add to animating set
      setAnimatingTodos(prev => new Set(prev).add(newTodoId));
      
      // Remove from animating set and call completion callback after animation
      const timer = setTimeout(() => {
        setAnimatingTodos(prev => {
          const next = new Set(prev);
          next.delete(newTodoId);
          return next;
        });
        onNewTodoAnimationComplete?.();
      }, TODO_ENTRANCE_ANIMATION_MS);
      
      return () => clearTimeout(timer);
    }
  }, [newTodoId, animatingTodos, onNewTodoAnimationComplete]);

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
    refetchTodos();
  };




  if (loading) {
    return <ViewLoading label="Loading todos..." />;
  }

  if (error) {
    return <ViewError title="Error loading todos" message={error} onRetry={() => refetchTodos()} />;
  }

  const heading = currentArea ? currentArea.name : 'All areas';
  const areaById = new Map((Array.isArray(areas) ? areas : []).map((area) => [area.id, area]));

  return (
    <div>
      <ViewHeader
        title={heading}
        dotColor={currentArea?.color}
        totals={[
          { value: totals.open, label: 'open' },
          { value: totals.today, label: 'today' },
          { value: totals.overdue, label: 'overdue', tone: totals.overdue ? 'danger' : undefined },
          { value: doneToday, label: 'done today', tone: 'accent' },
        ]}
        onRefresh={() => refetchTodos()}
        isRefreshing={isRefetching}
        refreshLabel="Refresh todos"
      />

      {todos.length === 0 ? (
        <ViewEmpty
          title={view === 'completed' ? 'No completed todos yet.' : 'No todos found'}
          message={view === 'completed' ? undefined : 'Add one with New.'}
        />
      ) : (
        <div role="list">
          {todos.map((todo) => (
            <TodoRow
              key={todo.id}
              todo={todo}
              displayState={getTodoDisplayState(todo)}
              area={todo.area_id !== null ? areaById.get(todo.area_id) : null}
              showArea={!currentArea}
              isNew={animatingTodos.has(todo.id)}
              onToggleComplete={toggleTodo}
              onEdit={handleEditTodo}
              onUpdate={handleTodoUpdated}
            />
          ))}
        </div>
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

export default TodoList;
