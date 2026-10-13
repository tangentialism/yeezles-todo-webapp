import React, { useState, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTodoStore } from '../hooks/useTodoStore';
import { useDismiss } from '../hooks/useDismiss';
import type { Todo } from '../types/todo';
import { logger } from '../utils/logger';
import { CheckIcon, MoreIcon, PencilIcon, Spinner, SunIcon, TrashIcon, UndoIcon } from './ui/Icons';
import { iconButton, menuItem, menuItemDanger, menuPanel, menuSeparator } from './ui/styles';

const MENU_WIDTH_PX = 220;

/** Props for {@link TodoActions}. */
interface TodoActionsProps {
  todo: Todo;
  onEdit: (todo: Todo) => void;
  onUpdate: () => void;
  /** Custom completion handler; when omitted, falls back to the store's toggle with undo. */
  onToggleComplete?: (todo: Todo) => void;
}

/**
 * Three-dot dropdown menu for a todo with actions: Edit, Toggle Complete,
 * Add to/Remove from Today, and Delete. The dropdown is rendered via a
 * React portal to avoid clipping by overflow containers.
 */
const TodoActions: React.FC<TodoActionsProps> = ({ todo, onEdit, onUpdate, onToggleComplete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { deleteTodo, toggleTodoCompletion, moveToToday, removeFromToday, isDeleting, isMovingToToday, isRemovingFromToday } = useTodoStore();

  // Close on Escape or a press outside the trigger and the menu
  const close = useCallback(() => setIsOpen(false), []);
  const dismissRefs = useMemo(() => [buttonRef, dropdownRef], []);
  useDismiss(dismissRefs, close, isOpen);

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${todo.title}"?`)) {
      return;
    }

    try {
      await deleteTodo(todo.id);
      // Store handles optimistic updates and error messages
      onUpdate(); // Still call for any additional logic parent might need
    } catch (error) {
      logger.error('Error deleting todo:', error);
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
      logger.error('Error moving todo to today:', error);
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
      logger.error('Error removing todo from today:', error);
      // Error handling is done in the store with toast
    } finally {
      setIsOpen(false);
    }
  };

  const menuIcon = 'w-4 h-4 flex-none';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          const newState = !isOpen;
          if (newState && buttonRef.current) {
            // Calculate position for portal dropdown, aligning right edges
            const rect = buttonRef.current.getBoundingClientRect();
            setDropdownPosition({
              top: rect.bottom + 8,
              left: Math.max(8, rect.right - MENU_WIDTH_PX),
            });
          }
          setIsOpen(newState);
        }}
        ref={buttonRef}
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={`${iconButton} ${isOpen ? 'bg-hover text-ink' : ''}`}
        disabled={isDeleting}
      >
        <MoreIcon className="w-4 h-4" />
      </button>

      {isOpen && createPortal(
        <div
          role="menu"
          aria-label="Todo actions"
          className={`fixed z-50 ${menuPanel}`}
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: MENU_WIDTH_PX,
          }}
          ref={dropdownRef}
        >
          <button type="button" role="menuitem" onClick={handleEdit} className={menuItem}>
            <PencilIcon className={menuIcon} />
            Edit todo
          </button>

          <button type="button" role="menuitem" onClick={handleToggleComplete} className={menuItem}>
            {todo.completed ? (
              <>
                <UndoIcon className={menuIcon} />
                Mark incomplete
              </>
            ) : (
              <>
                <CheckIcon className={menuIcon} />
                Mark complete
              </>
            )}
          </button>

          {/* Today Actions */}
          {todo.is_today ? (
            <button
              type="button"
              role="menuitem"
              onClick={handleRemoveFromToday}
              disabled={isRemovingFromToday}
              className={menuItem}
            >
              {isRemovingFromToday ? <Spinner className={menuIcon} /> : <SunIcon className={`${menuIcon} text-accent`} />}
              {isRemovingFromToday ? 'Removing…' : 'Remove from Today'}
            </button>
          ) : (
            <button
              type="button"
              role="menuitem"
              onClick={handleMoveToToday}
              disabled={isMovingToToday}
              className={menuItem}
            >
              {isMovingToToday ? <Spinner className={menuIcon} /> : <SunIcon className={`${menuIcon} text-accent`} />}
              {isMovingToToday ? 'Adding…' : 'Add to Today'}
            </button>
          )}

          <div className={menuSeparator} />

          <button
            type="button"
            role="menuitem"
            onClick={handleDelete}
            disabled={isDeleting}
            className={menuItemDanger}
          >
            {isDeleting ? <Spinner className={menuIcon} /> : <TrashIcon className={menuIcon} />}
            {isDeleting ? 'Deleting…' : 'Delete todo'}
          </button>
        </div>,
        document.body
      )}
    </div>
  );
};

export default TodoActions;
