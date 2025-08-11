import React, { useState, useEffect } from 'react';
import { todoApi } from '../services/api';
import TodayView from './TodayView';

interface Todo {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

interface TodoListProps {
  view: string;
}

const TodoList: React.FC<TodoListProps> = ({ view }) => {
  // Use dedicated TodayView component for today view
  if (view === 'today') {
    return <TodayView />;
  }

  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    loadTodos();
  }, [view]);

  const toggleTodo = async (id: number, completed: boolean) => {
    try {
      const response = await todoApi.updateTodo(id, { completed: !completed });
      if (response.success) {
        // Reload todos to get fresh data
        loadTodos();
      }
    } catch (err) {
      console.error('Error updating todo:', err);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
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
          return (
            <div
              key={todo.id}
              className={`bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow ${
                todo.completed ? 'bg-gray-50' : ''
              }`}
            >
              <div className="flex items-start space-x-3">
                <button
                  onClick={() => toggleTodo(todo.id, todo.completed)}
                  className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center ${
                    todo.completed
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {todo.completed && <span className="text-xs">✓</span>}
                </button>

                <div className="flex-1 min-w-0">
                  <h3
                    className={`text-lg font-medium ${
                      todo.completed ? 'line-through text-gray-500' : 'text-gray-900'
                    }`}
                  >
                    {todo.title}
                  </h3>
                  
                  {todo.description && (
                    <p className={`mt-1 text-sm ${
                      todo.completed ? 'text-gray-400' : 'text-gray-600'
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
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TodoList;
