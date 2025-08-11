import React, { useState, useEffect } from 'react';
import { todoApi } from '../services/api';
import EditTodoModal from './EditTodoModal';
import TodoActions from './TodoActions';

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

interface TodayData {
  focus: {
    today_tagged: Todo[];
    due_today: Todo[];
    overdue: Todo[];
    total_today: number;
    total_focus: number;
  };
  upcoming: {
    coming_soon: Todo[];
    total_coming_soon: number;
  };
  summary: {
    total_today_items: number;
    total_overdue: number;
    total_coming_soon: number;
    total_focus_items: number;
    needs_attention: boolean;
  };
}

const TodayView: React.FC = () => {
  const [todayData, setTodayData] = useState<TodayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    loadTodayData();
  }, []);

  const loadTodayData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await todoApi.getTodayView();
      if (response.success) {
        setTodayData(response.data);
      } else {
        setError('Failed to load today view');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load today view');
      console.error('Error loading today view:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleTodo = async (id: number, completed: boolean) => {
    try {
      const response = await todoApi.updateTodo(id, { completed: !completed });
      if (response.success) {
        loadTodayData(); // Refresh today view
      }
    } catch (err) {
      console.error('Error updating todo:', err);
    }
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
    loadTodayData(); // Refresh the today view
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const TodoCard: React.FC<{ todo: Todo; priority?: string }> = ({ todo, priority }) => {
    const tags = extractTags(todo.title);
    
    return (
      <div className={`bg-white border-l-4 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow ${
        priority === 'overdue' ? 'border-red-500 bg-red-50' :
        priority === 'due-today' ? 'border-orange-500 bg-orange-50' :
        priority === 'today-tagged' ? 'border-blue-500 bg-blue-50' :
        'border-gray-200'
      }`}>
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
            <h4 className={`font-medium ${
              todo.completed ? 'line-through text-gray-500' : 'text-gray-900'
            }`}>
              {todo.title}
            </h4>
            
            {todo.description && (
              <p className={`mt-1 text-sm ${
                todo.completed ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {todo.description}
              </p>
            )}

            <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
              {todo.due_date && (
                <span className={priority === 'overdue' ? 'text-red-600 font-medium' : 'text-orange-600'}>
                  Due: {formatDate(todo.due_date)}
                </span>
              )}
              {priority === 'overdue' && (
                <span className="text-red-600 font-medium">⚠️ OVERDUE</span>
              )}
            </div>

            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      tag === 'today' ? 'bg-blue-100 text-blue-800' :
                      tag.includes('priority') ? 'bg-purple-100 text-purple-800' :
                      'bg-indigo-100 text-indigo-800'
                    }`}
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
          />
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-2 text-gray-600">Loading today's focus...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">❌ Error loading today view</div>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={loadTodayData}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!todayData) {
    return <div className="text-center py-12 text-gray-600">No data available</div>;
  }

  const { focus, upcoming, summary } = todayData;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Focus Items</p>
              <p className="text-2xl font-bold text-indigo-600">{summary.total_focus_items}</p>
            </div>
            <div className="text-2xl">🎯</div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Due Today</p>
              <p className="text-2xl font-bold text-orange-600">{focus.due_today.length}</p>
            </div>
            <div className="text-2xl">📅</div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Overdue</p>
              <p className="text-2xl font-bold text-red-600">{summary.total_overdue}</p>
            </div>
            <div className="text-2xl">⚠️</div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Coming Soon</p>
              <p className="text-2xl font-bold text-blue-600">{summary.total_coming_soon}</p>
            </div>
            <div className="text-2xl">📋</div>
          </div>
        </div>
      </div>

      {/* Attention Banner */}
      {summary.needs_attention && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-red-500 mr-3">⚠️</div>
            <div>
              <h3 className="text-sm font-medium text-red-800">Needs Attention</h3>
              <p className="text-sm text-red-700">
                You have {summary.total_overdue} overdue items that need immediate attention.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Focus Section */}
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">🎯 Today's Focus</h2>
          
          {/* Overdue Items */}
          {focus.overdue.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-red-600 mb-3">⚠️ Overdue ({focus.overdue.length})</h3>
              <div className="space-y-3">
                {focus.overdue.map((todo) => (
                  <TodoCard key={todo.id} todo={todo} priority="overdue" />
                ))}
              </div>
            </div>
          )}

          {/* Today Tagged Items */}
          {focus.today_tagged.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-blue-600 mb-3">⭐ Today Tagged ({focus.today_tagged.length})</h3>
              <div className="space-y-3">
                {focus.today_tagged.map((todo) => (
                  <TodoCard key={todo.id} todo={todo} priority="today-tagged" />
                ))}
              </div>
            </div>
          )}

          {/* Due Today Items */}
          {focus.due_today.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-orange-600 mb-3">📅 Due Today ({focus.due_today.length})</h3>
              <div className="space-y-3">
                {focus.due_today.map((todo) => (
                  <TodoCard key={todo.id} todo={todo} priority="due-today" />
                ))}
              </div>
            </div>
          )}

          {focus.total_focus === 0 && (
            <div className="text-center py-8 bg-green-50 rounded-lg border border-green-200">
              <div className="text-4xl mb-2">🎉</div>
              <h3 className="text-lg font-medium text-green-800 mb-1">All caught up!</h3>
              <p className="text-green-600">No urgent items for today. Great job!</p>
            </div>
          )}
        </div>

        {/* Upcoming Section */}
        {upcoming.coming_soon.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">📋 Coming Soon ({upcoming.total_coming_soon})</h2>
            <div className="space-y-3">
              {upcoming.coming_soon.map((todo) => (
                <TodoCard key={todo.id} todo={todo} />
              ))}
            </div>
          </div>
        )}
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

export default TodayView;
