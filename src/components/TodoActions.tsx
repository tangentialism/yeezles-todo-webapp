import React, { useState, useRef, useEffect } from 'react';
import { todoApi } from '../services/api';
import type { Todo } from '../types/todo';

interface TodoActionsProps {
  todo: Todo;
  onEdit: (todo: Todo) => void;
  onUpdate: () => void;
  onToggleComplete?: (todo: Todo) => void; // New prop for completion handling
}

const TodoActions: React.FC<TodoActionsProps> = ({ todo, onEdit, onUpdate, onToggleComplete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${todo.title}"?`)) {
      return;
    }

    try {
      setIsDeleting(true);
      const response = await todoApi.deleteTodo(todo.id);
      if (response.success) {
        onUpdate(); // Refresh the todo list
      }
    } catch (error) {
      console.error('Error deleting todo:', error);
      alert('Failed to delete todo. Please try again.');
    } finally {
      setIsDeleting(false);
      setIsOpen(false);
    }
  };

  const handleEdit = () => {
    onEdit(todo);
    setIsOpen(false);
  };

  const handleToggleComplete = () => {
    if (onToggleComplete) {
      // Use the new completion system with undo functionality
      onToggleComplete(todo);
    } else {
      // Fallback to old immediate completion (for backward compatibility)
      const legacyToggle = async () => {
        try {
          const response = await todoApi.updateTodo(todo.id, { completed: !todo.completed });
          if (response.success) {
            onUpdate();
          }
        } catch (error) {
          console.error('Error updating todo:', error);
        }
      };
      legacyToggle();
    }
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded"
        disabled={isDeleting}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-20">
          <div className="py-1">
            <button
              onClick={handleEdit}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
            >
              <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit todo
            </button>

            <button
              onClick={handleToggleComplete}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
            >
              {todo.completed ? (
                <>
                  <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 11H3m3 8l4-4 4 4 6-6" />
                  </svg>
                  Mark incomplete
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Mark complete
                </>
              )}
            </button>

            <hr className="my-1" />

            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50 focus:outline-none focus:bg-red-50 disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <svg className="animate-spin w-4 h-4 mr-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Deleting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete todo
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TodoActions;
