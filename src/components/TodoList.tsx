import React, { useState, useEffect } from 'react';
import { todoApi } from '../services/api';
import { useTodoCompletion } from '../hooks/useTodoCompletion';
import { formatDate } from '../utils/date';
import TodayView from './TodayView';
import EditTodoModal from './EditTodoModal';
import TodoActions from './TodoActions';
import type { Todo } from '../types/todo';

interface TodoListProps {
  view: string;
  refreshTrigger?: number; // Optional refresh trigger
}

const TodoList: React.FC<TodoListProps> = ({ view, refreshTrigger }) => {
  // Use dedicated TodayView component for today view
  if (view === 'today') {
    return <TodayView />;
  }

  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [removingTodos, setRemovingTodos] = useState<Set<number>>(new Set());

  const loadTodos = async () => {
    try {
      setLoading(true);
      setError(null);

      let filters: any = {};
      
      switch (view) {
        case 'completed':
          filters.completed = true;
          break;
        case 'all':
        default:
          // No filters for all todos
          break;
      }

      const response = await todoApi.getTodos(filters);
      if (response.success) {
        setTodos(response.data);
      } else {
        setError('Failed to load todos');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load todos');
      console.error('Error loading todos:', err);
    } finally {
      setLoading(false);
    }
  };

  // Optimistic update function for smooth removal in "all" view
  const handleOptimisticUpdate = (todoId: number, newCompleted: boolean) => {
    if (view === 'all' && newCompleted) {
      // For "all" view, smoothly remove completed todos
      setRemovingTodos(prev => new Set(prev).add(todoId));
      
      // Remove from list after animation completes
      setTimeout(() => {
        setTodos(prev => prev.filter(todo => todo.id !== todoId));
        setRemovingTodos(prev => {
          const next = new Set(prev);
          next.delete(todoId);
          return next;
        });
      }, 300); // Match the CSS transition duration
    } else {
      // For other views (like "completed"), reload the full list
      loadTodos();
    }
  };

  // Todo completion with undo functionality
  const { toggleTodoCompletion, getTodoDisplayState } = useTodoCompletion({
    onUpdate: loadTodos,
    optimisticUpdate: handleOptimisticUpdate
  });

  useEffect(() => {
    loadTodos();
  }, [view, refreshTrigger]);

  // Legacy function - now using useTodoCompletion hook
  const toggleTodo = (todo: Todo) => {
    toggleTodoCompletion(todo);
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
    loadTodos(); // Refresh the todo list
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
          onClick={loadTodos}
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
        <h2 className="text-2xl font-bold text-gray-900 capitalize">{view} Todos</h2>
        <p className="text-gray-600">{todos.length} todo{todos.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="space-y-3">
        {todos.map((todo) => {
          const tags = extractTags(todo.title);
          const displayState = getTodoDisplayState(todo);
          const isCompleted = displayState.completed;
          const isPending = displayState.isPending;
          const isRemoving = removingTodos.has(todo.id);
          
          return (
            <div
              key={todo.id}
              className={`bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-300 transform ${
                isCompleted ? 'bg-gray-50' : ''
              } ${isPending ? 'ring-2 ring-blue-200 ring-opacity-50 opacity-60' : ''} ${
                isRemoving ? 'opacity-0 -translate-y-2 scale-95 pointer-events-none' : 'opacity-100 translate-y-0 scale-100'
              }`}
              style={{
                marginBottom: isRemoving ? '-1rem' : undefined,
                transition: 'all 0.3s ease-out, margin-bottom 0.3s ease-out'
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
                    <span className={`text-xs transition-all duration-200 ${isPending ? 'animate-pulse' : ''}`}>
                      ✓
                    </span>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <h3
                    className={`text-base sm:text-lg font-medium transition-all duration-200 ${
                      isCompleted ? 'line-through text-gray-500' : 'text-gray-900'
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
