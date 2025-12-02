import React from 'react';
import { useTodoStore } from '../hooks/useTodoStore';
import type { Todo } from '../types/todo';

interface TodayCornerProps {
  todo: Todo;
  onUpdate?: () => void;
}

/**
 * A subtle folded-corner indicator for "Today" status.
 * Appears in the bottom-right corner of todo cards.
 * Click to toggle whether a todo is marked for Today.
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

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`
        absolute bottom-0 right-0 
        w-7 h-7 
        overflow-hidden
        transition-all duration-200 ease-out
        focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1
        group
        ${isLoading ? 'cursor-wait' : 'cursor-pointer'}
      `}
      title={isToday ? 'Remove from Today' : 'Add to Today'}
      aria-label={isToday ? 'Remove from Today' : 'Add to Today'}
    >
      {/* The folded corner effect - two layered triangles */}
      <div className="absolute inset-0">
        {/* Back fold (shadow/depth layer) */}
        <div
          className={`
            absolute bottom-0 right-0
            w-0 h-0
            border-solid
            transition-all duration-200 ease-out
            ${isToday 
              ? 'border-l-[24px] border-t-[24px] border-l-transparent border-t-transparent border-b-[4px] border-r-[4px] border-b-blue-300 border-r-blue-300' 
              : 'border-l-[24px] border-t-[24px] border-l-transparent border-t-transparent border-b-[4px] border-r-[4px] border-b-gray-200 border-r-gray-200 group-hover:border-b-blue-200 group-hover:border-r-blue-200'
            }
          `}
        />
        
        {/* Front fold (main visible layer) */}
        <div
          className={`
            absolute bottom-0 right-0
            w-0 h-0
            border-solid
            transition-all duration-200 ease-out
            ${isToday 
              ? 'border-l-[20px] border-t-[20px] border-l-transparent border-t-transparent border-b-[4px] border-r-[4px] border-b-blue-500 border-r-blue-500' 
              : 'border-l-[20px] border-t-[20px] border-l-transparent border-t-transparent border-b-[4px] border-r-[4px] border-b-gray-300 border-r-gray-300 opacity-0 group-hover:opacity-100 group-hover:border-b-blue-400 group-hover:border-r-blue-400'
            }
          `}
        />
        
        {/* Inner fold (the "page" that appears to be folded) */}
        <div
          className={`
            absolute bottom-0 right-0
            transition-all duration-200 ease-out
            ${isToday 
              ? 'w-5 h-5 bg-gradient-to-tl from-blue-100 via-blue-50 to-white rounded-tl-sm shadow-sm' 
              : 'w-4 h-4 bg-gradient-to-tl from-gray-100 to-white rounded-tl-sm opacity-0 group-hover:opacity-60 group-hover:from-blue-100'
            }
          `}
          style={{
            clipPath: 'polygon(100% 0%, 100% 100%, 0% 100%)'
          }}
        />
        
        {/* Sun/star icon - shows when today */}
        {isToday && (
          <svg
            className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 text-blue-600 transition-transform duration-200 group-hover:scale-110"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 2L14.09 8.26L20.82 9.27L16.09 14.14L17.18 21.02L12 17.77L6.82 21.02L7.91 14.14L3.18 9.27L9.91 8.26L12 2Z" />
          </svg>
        )}
        
        {/* Loading spinner */}
        {isLoading && (
          <svg
            className="absolute bottom-1 right-1 w-3 h-3 text-blue-500 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
      </div>
    </button>
  );
};

export default TodayCorner;

