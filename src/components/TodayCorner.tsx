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
  // Button container - clips to triangle, positions in bottom-right
  button: {
    base: 'absolute bottom-0 right-0 w-7 h-7 transition-all duration-200 ease-out focus:outline-none group',
    loading: 'cursor-wait',
    interactive: 'cursor-pointer',
    // Hover state needs rounded corner to match card; Today state is sharp
    hoverRounded: 'rounded-tl-lg',
  },

  // Main fold background color
  fold: {
    base: 'absolute inset-0 transition-all duration-200 ease-out',
    today: 'bg-blue-500',
    hover: 'bg-gray-300 opacity-0 group-hover:opacity-100',
  },

  // Internal curve (circle that creates the fold line)
  curve: {
    base: 'absolute w-10 h-10 rounded-full transition-all duration-200 ease-out',
    today: 'bg-blue-100',
    hover: 'bg-gray-100 opacity-0 group-hover:opacity-100',
    position: { bottom: '-14px', right: '-14px' } as React.CSSProperties,
  },

  // Loading spinner
  spinner: {
    container: 'absolute inset-0 flex items-end justify-end p-1',
    icon: 'w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin',
  },

  // Triangle clip path
  triangleClip: { clipPath: 'polygon(100% 0%, 100% 100%, 0% 100%)' } as React.CSSProperties,
};

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Folded-corner indicator for "Today" status on todo cards.
 * 
 * States:
 * - Normal: Nothing visible
 * - Hover (not Today): Gray fold with rounded outer edge
 * - Today: Blue fold with straight edges
 */
const TodayCorner: React.FC<TodayCornerProps> = ({ todo, onUpdate }) => {
  const { moveToToday, removeFromToday, isMovingToToday, isRemovingFromToday } = useTodoStore();
  
  const isLoading = isMovingToToday || isRemovingFromToday;
  const isToday = todo.is_today;

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (isToday) {
        await removeFromToday(todo.id);
      } else {
        await moveToToday(todo.id);
      }
      onUpdate?.();
    } catch (error) {
      console.error('Error toggling today status:', error);
    }
  };

  const buttonClass = [
    styles.button.base,
    isLoading ? styles.button.loading : styles.button.interactive,
    !isToday && styles.button.hoverRounded,
  ].filter(Boolean).join(' ');

  const foldClass = [
    styles.fold.base,
    isToday ? styles.fold.today : styles.fold.hover,
  ].join(' ');

  const curveClass = [
    styles.curve.base,
    isToday ? styles.curve.today : styles.curve.hover,
  ].join(' ');

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={buttonClass}
      style={styles.triangleClip}
      title={isToday ? 'Remove from Today' : 'Add to Today'}
      aria-label={isToday ? 'Remove from Today' : 'Add to Today'}
    >
      <div className={foldClass} />
      <div className={curveClass} style={styles.curve.position} />
      
      {isLoading && (
        <div className={styles.spinner.container}>
          <div className={styles.spinner.icon} />
        </div>
      )}
    </button>
  );
};

export default TodayCorner;

