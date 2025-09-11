import React, { useState, useEffect } from 'react';
import { useTodoStore } from '../hooks/useTodoStore';
import { useArea } from '../contexts/AreaContext';
import { formatDate } from '../utils/date';

import EditTodoModal from './EditTodoModal';
import TodoActions from './TodoActions';
import type { Todo } from '../types/todo';

interface TodoListProps {
  view: string;
  refreshTrigger?: number; // Optional refresh trigger
  newTodoId?: number | null; // ID of newly created todo to animate
  onNewTodoAnimationComplete?: () => void; // Called when animation finishes
}

const TodoList: React.FC<TodoListProps> = ({ 
  view, 
  refreshTrigger: _, // Unused with new store but kept for API compatibility
  newTodoId, 
  onNewTodoAnimationComplete 
}) => {

  const { currentArea } = useArea();
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [animatingTodos, setAnimatingTodos] = useState<Set<number>>(new Set());
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);

  // Use the new todo store
  const {
    todos,
    isLoading: loading,
    error: queryError,
    getTodoDisplayState,
    toggleTodoCompletion,
    refetchTodos
  } = useTodoStore({ view });

  const error = queryError ? (queryError as Error).message : null;

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
      }, 400); // Animation duration: 250ms entrance + 150ms highlight
      
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

  const handleDropdownToggle = (todoId: number, isOpen: boolean) => {
    setOpenDropdownId(isOpen ? todoId : null);
  };



  const extractTags = (title: string) => {
    const tagRegex = /@(\w+(?:-\w+)*)/g;
    const tags = [];
    let match;
    while ((match = tagRegex.exec(title)) !== null) {
      tags.push(match[1]);
    }
    return tags;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-2 text-gray-600">Loading todos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">❌ Error loading todos</div>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={() => refetchTodos()}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (todos.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📝</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No todos found</h3>
        <p className="text-gray-600">
          {view === 'completed' ? 'No completed todos yet.' : 'Start by creating your first todo!'}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-2">
          <h2 className="text-2xl font-bold text-gray-900 capitalize">{view} Todos</h2>
          {currentArea && (
            <>
              <span className="text-gray-400">in</span>
              <div className="flex items-center space-x-2">
                <div
                  className="w-4 h-4 rounded-full border border-gray-300"
                  style={{ backgroundColor: currentArea.color }}
                ></div>
                <span className="text-lg font-medium text-gray-700">{currentArea.name}</span>
              </div>
            </>
          )}
          {!currentArea && (
            <>
              <span className="text-gray-400">from</span>
              <span className="text-lg font-medium text-gray-700">All Areas</span>
            </>
          )}
        </div>
        <p className="text-gray-600">{todos.length} todo{todos.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="space-y-3">
        {todos.map((todo) => {
          const tags = extractTags(todo.title);
          const displayState = getTodoDisplayState(todo);
          const isCompleted = displayState.completed;
          const isPending = displayState.isPending;
          const isRemoving = displayState.isRemoving;
          const isAnimating = animatingTodos.has(todo.id);
          
          return (
            <div
              key={todo.id}
              className={`bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 ${
                isCompleted ? 'bg-gray-50' : ''
              } ${isPending ? 'ring-2 ring-blue-200 ring-opacity-50 opacity-60' : ''} ${
                isRemoving ? 'opacity-0 pointer-events-none' : 
                isAnimating ? 'animate-gentle-fade-in bg-green-50 border-green-200' :
                'opacity-100'
              }`}
              style={{
                height: isRemoving ? '0' : 'auto',
                marginBottom: isRemoving ? '0' : '12px',
                overflow: openDropdownId === todo.id ? 'visible' : 'hidden',
                transition: 'opacity 0.2s ease-out, height 0.25s ease-out 0.1s, margin 0.25s ease-out 0.1s'
              }}
            >
              <div className="flex items-start space-x-2 sm:space-x-3">
                <button
                  onClick={() => toggleTodo(todo)}
                  className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                    isCompleted
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-gray-300 hover:border-gray-400'
                  } ${isPending ? 'shadow-lg scale-105 animate-pulse' : ''}`}
                >
                  {isCompleted && (
                    <svg 
                      className="w-3 h-3" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="3" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    >
                      <polyline 
                        points="20,6 9,17 4,12" 
                        className={`animate-checkmark-draw ${isPending ? 'animate-pulse' : ''}`}
                        strokeDasharray="24"
                        strokeDashoffset="0"
                      />
                    </svg>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <h3
                    className={`text-base sm:text-lg font-medium transition-all duration-200 ${
                      isCompleted ? 'text-gray-500 animate-strikethrough' : 'text-gray-900'
                    }`}
                  >
                    {todo.title}
                    {isPending && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full animate-pulse">
                        Click again to cancel
                      </span>
                    )}
                  </h3>
                  
                  {todo.description && (
                    <p className={`mt-1 text-sm transition-all duration-200 ${
                      isCompleted ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {todo.description}
                    </p>
                  )}

                  <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                    <span>Created: {formatDate(todo.created_at)}</span>
                    {todo.due_date && (
                      <span className="text-orange-600">Due: {formatDate(todo.due_date)}</span>
                    )}
                    {todo.completed_at && (
                      <span className="text-green-600">Completed: {formatDate(todo.completed_at)}</span>
                    )}
                  </div>

                  {tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                        >
                          @{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions Dropdown */}
                <TodoActions
                  todo={todo}
                  onEdit={handleEditTodo}
                  onUpdate={handleTodoUpdated}
                  onToggleComplete={toggleTodo}
                  onDropdownToggle={(isOpen) => handleDropdownToggle(todo.id, isOpen)}
                />
              </div>
            </div>
          );
        })}
      </div>

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
