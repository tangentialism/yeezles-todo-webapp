import React, { useMemo } from 'react';
import { useTodoStore } from '../hooks/useTodoStore';
import { groupTodosByCompletionDate, formatCompletionDateGroup, calculateCompletionStats } from '../utils/todoGrouping';
import type { Todo } from '../types/todo';

const AccomplishmentsView: React.FC = () => {
  const { todos, isLoading, error } = useTodoStore({ view: 'completed' });

  // Group todos by completion date
  const groupedTodos = useMemo(() => {
    return groupTodosByCompletionDate(todos);
  }, [todos]);

  // Calculate stats
  const stats = useMemo(() => {
    return calculateCompletionStats(todos);
  }, [todos]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading accomplishments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">Failed to load accomplishments. Please try again.</p>
      </div>
    );
  }

  if (todos.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No accomplishments yet</h3>
        <p className="text-gray-500">Complete some todos to see your accomplishments here!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">🎉 Your Accomplishments</h2>
            <p className="text-indigo-100">Keep up the great work!</p>
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <div className="text-3xl font-bold">{stats.completedToday}</div>
                <div className="text-sm text-indigo-100">Today</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">{stats.completedThisWeek}</div>
                <div className="text-sm text-indigo-100">This Week</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">{stats.totalCompleted}</div>
                <div className="text-sm text-indigo-100">Total</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Mobile Stats */}
        <div className="sm:hidden mt-4 flex justify-around">
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.completedToday}</div>
            <div className="text-xs text-indigo-100">Today</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.completedThisWeek}</div>
            <div className="text-xs text-indigo-100">This Week</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.totalCompleted}</div>
            <div className="text-xs text-indigo-100">Total</div>
          </div>
        </div>
      </div>

      {/* Grouped Todos by Date */}
      <div className="space-y-6">
        {Object.entries(groupedTodos).map(([dateKey, todosForDate]) => (
          <div key={dateKey} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Date Header */}
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {formatCompletionDateGroup(dateKey)}
                </h3>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  {todosForDate.length} {todosForDate.length === 1 ? 'todo' : 'todos'}
                </span>
              </div>
            </div>

            {/* Todos List */}
            <ul className="divide-y divide-gray-200">
              {todosForDate.map((todo) => (
                <TodoItem key={todo.id} todo={todo} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

// Individual Todo Item Component
const TodoItem: React.FC<{ todo: Todo }> = ({ todo }) => {
  const completedTime = todo.completed_at 
    ? new Date(todo.completed_at).toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
    : '';

  return (
    <li className="px-4 py-3 hover:bg-gray-50 transition-colors">
      <div className="flex items-start space-x-3">
        {/* Checkmark Icon */}
        <div className="flex-shrink-0 mt-0.5">
          <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        </div>

        {/* Todo Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">{todo.title}</p>
          {todo.description && (
            <p className="mt-1 text-sm text-gray-500 line-clamp-2">{todo.description}</p>
          )}
          
          {/* Tags */}
          {todo.tags && todo.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {todo.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Completion Time */}
        <div className="flex-shrink-0 text-xs text-gray-500">
          {completedTime}
        </div>
      </div>
    </li>
  );
};

export default AccomplishmentsView;

