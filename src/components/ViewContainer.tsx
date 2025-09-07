import React, { useRef, useEffect } from 'react';
import TodoList from './TodoList';
import TodayView from './TodayView';

interface ViewContainerProps {
  currentView: string;
  isTransitioning: boolean;
  refreshTrigger: number;
  newTodoId: number | null;
  onNewTodoAnimationComplete: () => void;
}

const ViewContainer: React.FC<ViewContainerProps> = ({
  currentView,
  isTransitioning,
  refreshTrigger,
  newTodoId,
  onNewTodoAnimationComplete
}) => {
  // Refs to preserve scroll positions
  const allViewRef = useRef<HTMLDivElement>(null);
  const todayViewRef = useRef<HTMLDivElement>(null);
  const completedViewRef = useRef<HTMLDivElement>(null);
  
  // Store scroll positions when switching views
  const scrollPositions = useRef<Record<string, number>>({
    all: 0,
    today: 0,
    completed: 0
  });

  // Save scroll position when view changes
  useEffect(() => {
    const getCurrentRef = (view: string) => {
      switch (view) {
        case 'all': return allViewRef.current;
        case 'today': return todayViewRef.current;
        case 'completed': return completedViewRef.current;
        default: return null;
      }
    };

    // Save current scroll position before transition starts
    if (isTransitioning) {
      const currentRef = getCurrentRef(currentView);
      if (currentRef) {
        scrollPositions.current[currentView] = currentRef.scrollTop;
      }
    }
  }, [isTransitioning, currentView]);

  // Restore scroll position after transition completes
  useEffect(() => {
    if (!isTransitioning) {
      const currentRef = getCurrentRef(currentView);
      if (currentRef && scrollPositions.current[currentView] !== undefined) {
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
          currentRef.scrollTop = scrollPositions.current[currentView];
        });
      }
    }
  }, [isTransitioning, currentView]);

  const getCurrentRef = (view: string) => {
    switch (view) {
      case 'all': return allViewRef.current;
      case 'today': return todayViewRef.current;
      case 'completed': return completedViewRef.current;
      default: return null;
    }
  };

  const getViewOpacity = (view: string) => {
    if (isTransitioning) return 0.4;
    return currentView === view ? 1 : 0;
  };

  const getViewVisibility = (view: string) => {
    return currentView === view ? 'visible' : 'hidden';
  };

  const getViewPointerEvents = (view: string) => {
    return currentView === view ? 'auto' : 'none';
  };

  return (
    <div className="relative w-full h-full min-h-[800px]">
      {/* All Todos View */}
      <div
        ref={allViewRef}
        className="absolute inset-0 overflow-auto transition-opacity duration-200"
        style={{
          opacity: getViewOpacity('all'),
          visibility: getViewVisibility('all'),
          pointerEvents: getViewPointerEvents('all'),
        }}
      >
        <TodoList
          view="all"
          refreshTrigger={refreshTrigger}
          newTodoId={currentView === 'all' ? newTodoId : null}
          onNewTodoAnimationComplete={onNewTodoAnimationComplete}
        />
      </div>

      {/* Today View */}
      <div
        ref={todayViewRef}
        className="absolute inset-0 overflow-auto transition-opacity duration-200"
        style={{
          opacity: getViewOpacity('today'),
          visibility: getViewVisibility('today'),
          pointerEvents: getViewPointerEvents('today'),
        }}
      >
        <TodayView />
      </div>

      {/* Completed Todos View */}
      <div
        ref={completedViewRef}
        className="absolute inset-0 overflow-auto transition-opacity duration-200"
        style={{
          opacity: getViewOpacity('completed'),
          visibility: getViewVisibility('completed'),
          pointerEvents: getViewPointerEvents('completed'),
        }}
      >
        <TodoList
          view="completed"
          refreshTrigger={refreshTrigger}
          newTodoId={currentView === 'completed' ? newTodoId : null}
          onNewTodoAnimationComplete={onNewTodoAnimationComplete}
        />
      </div>
    </div>
  );
};

export default ViewContainer;
