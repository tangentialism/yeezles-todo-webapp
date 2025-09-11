import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTodoStore } from '../hooks/useTodoStore';
import type { Todo } from '../types/todo';

interface TodoActionsProps {
  todo: Todo;
  onEdit: (todo: Todo) => void;
  onUpdate: () => void;
  onToggleComplete?: (todo: Todo) => void; // New prop for completion handling
}

const TodoActions: React.FC<TodoActionsProps> = ({ todo, onEdit, onUpdate, onToggleComplete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { deleteTodo, toggleTodoCompletion, moveToToday, removeFromToday, isDeleting, isMovingToToday, isRemovingFromToday } = useTodoStore();

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
      await deleteTodo(todo.id);
      // Store handles optimistic updates and error messages
      onUpdate(); // Still call for any additional logic parent might need
    } catch (error) {
      console.error('Error deleting todo:', error);
      // Error handling is done in the store with toast
    } finally {
      setIsOpen(false);
    }
  };

  const handleEdit = () => {
    onEdit(todo);
    setIsOpen(false);
  };

  const handleToggleComplete = async () => {
    if (onToggleComplete) {
      // Use parent's completion handler (maintains existing behavior)
      onToggleComplete(todo);
    } else {
      // Use store's completion system with undo functionality
      await toggleTodoCompletion(todo);
      onUpdate(); // Still call for any additional logic parent might need
    }
    setIsOpen(false);
  };

  const handleMoveToToday = async () => {
    try {
      await moveToToday(todo.id);
      onUpdate();
    } catch (error) {
      console.error('Error moving todo to today:', error);
      // Error handling is done in the store with toast
    } finally {
      setIsOpen(false);
    }
  };

  const handleRemoveFromToday = async () => {
    try {
      await removeFromToday(todo.id);
      onUpdate();
    } catch (error) {
      console.error('Error removing todo from today:', error);
      // Error handling is done in the store with toast
    } finally {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          const newState = !isOpen;
          if (newState && buttonRef.current) {
            // Calculate position for portal dropdown
            const rect = buttonRef.current.getBoundingClientRect();
            setDropdownPosition({
              top: rect.bottom + window.scrollY + 8, // 8px margin
              left: rect.right - 192 + window.scrollX // 192px is w-48 (12rem = 192px)
            });
          }
          setIsOpen(newState);
        }}
        ref={buttonRef}
        className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded"
        disabled={isDeleting}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
      </button>

      {isOpen && createPortal(
        <div 
          className="fixed w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50"
          style={{ 
            top: dropdownPosition.top, 
            left: dropdownPosition.left 
          }}
          ref={dropdownRef}
        >
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

            {/* Today Actions */}
            {todo.is_today ? (
              <button
                onClick={handleRemoveFromToday}
                disabled={isRemovingFromToday}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 disabled:opacity-50"
              >
                {isRemovingFromToday ? (
                  <>
                    <svg className="animate-spin w-4 h-4 mr-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Removing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Remove from Today
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleMoveToToday}
                disabled={isMovingToToday}
                className="flex items-center w-full px-4 py-2 text-sm text-indigo-700 hover:bg-indigo-50 focus:outline-none focus:bg-indigo-50 disabled:opacity-50"
              >
                {isMovingToToday ? (
                  <>
                    <svg className="animate-spin w-4 h-4 mr-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Moving...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    Move to Today
                  </>
                )}
              </button>
            )}

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
        </div>,
        document.body
      )}
    </div>
  );
};

export default TodoActions;
