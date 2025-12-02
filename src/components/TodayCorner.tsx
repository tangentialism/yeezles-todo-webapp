import React from 'react';
import { useTodoStore } from '../hooks/useTodoStore';
import type { Todo } from '../types/todo';

interface TodayCornerProps {
  todo: Todo;
  onUpdate?: () => void;
}

// =============================================================================
// STYLES
// =============================================================================

const styles = {
  button: {
    base: 'absolute bottom-0 right-0 w-6 h-6 transition-all duration-200 focus:outline-none',
    today: 'bg-blue-200 hover:bg-blue-300 cursor-pointer',
    idle: 'bg-transparent hover:bg-gray-300 cursor-pointer rounded-tl-lg',
    loading: 'cursor-wait',
  },
  triangle: { clipPath: 'polygon(100% 0%, 100% 100%, 0% 100%)' } as React.CSSProperties,
  spinner: 'absolute bottom-0.5 right-0.5 w-2.5 h-2.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin',
};

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Corner indicator for "Today" status on todo cards.
 * - Normal: Hidden
 * - Hover: Gray triangle (rounded outer edge)
 * - Today: Blue triangle (sharp edges)
 */
const TodayCorner: React.FC<TodayCornerProps> = ({ todo, onUpdate }) => {
  const { moveToToday, removeFromToday, isMovingToToday, isRemovingFromToday } = useTodoStore();
  const isLoading = isMovingToToday || isRemovingFromToday;
  const isToday = todo.is_today;

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await (isToday ? removeFromToday(todo.id) : moveToToday(todo.id));
      onUpdate?.();
    } catch (error) {
      console.error('Error toggling today status:', error);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`${styles.button.base} ${isToday ? styles.button.today : styles.button.idle} ${isLoading ? styles.button.loading : ''}`}
      style={styles.triangle}
      title={isToday ? 'Remove from Today' : 'Add to Today'}
      aria-label={isToday ? 'Remove from Today' : 'Add to Today'}
    >
      {isLoading && <div className={styles.spinner} />}
    </button>
  );
};

export default TodayCorner;

