import React from 'react';
import { useTodoStore } from '../hooks/useTodoStore';
import type { Todo } from '../types/todo';
import { logger } from '../utils/logger';
import { SunIcon, Spinner } from './ui/Icons';

/** Props for {@link TodayToggle}. */
interface TodayToggleProps {
  /** The todo whose today-status this button controls. */
  todo: Todo;
  onUpdate?: () => void;
}

/**
 * Sun button on a todo row that adds the todo to, or removes it from, Today.
 * Grey when off, cobalt on a soft circle when on; hover previews the on state.
 */
const TodayToggle: React.FC<TodayToggleProps> = ({ todo, onUpdate }) => {
  const { moveToToday, removeFromToday, isMovingToToday, isRemovingFromToday } = useTodoStore();
  const isLoading = isMovingToToday || isRemovingFromToday;
  const isToday = todo.is_today;
  const label = isToday ? 'Remove from Today' : 'Add to Today';

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await (isToday ? removeFromToday(todo.id) : moveToToday(todo.id));
      onUpdate?.();
    } catch (error) {
      logger.error('Error toggling today status:', error);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      aria-label={label}
      aria-pressed={isToday}
      title={label}
      className={`inline-flex items-center justify-center w-10 h-10 flex-none rounded-full transition-colors disabled:cursor-wait ${
        isToday
          ? 'text-accent bg-accent-soft'
          : 'text-ink-faint hover:text-accent hover:bg-accent-soft'
      }`}
    >
      {isLoading ? <Spinner className="w-4 h-4" /> : <SunIcon className="w-[18px] h-[18px]" />}
    </button>
  );
};

export default TodayToggle;
