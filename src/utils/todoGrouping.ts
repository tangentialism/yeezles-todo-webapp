import type { Todo } from '../types/todo';

/**
 * Groups todos by their completion date (YYYY-MM-DD format)
 * @param todos - Array of todos to group
 * @returns Object with date keys and arrays of todos as values, sorted by date descending
 */
export const groupTodosByCompletionDate = (todos: Todo[]): Record<string, Todo[]> => {
  const grouped: Record<string, Todo[]> = {};

  // Group todos by completion date
  todos.forEach(todo => {
    if (!todo.completed_at) return;

    const date = new Date(todo.completed_at);
    const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format

    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }

    grouped[dateKey].push(todo);
  });

  // Sort the keys (dates) in descending order (most recent first)
  const sortedKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  
  // Create a new object with sorted keys
  const sortedGrouped: Record<string, Todo[]> = {};
  sortedKeys.forEach(key => {
    sortedGrouped[key] = grouped[key];
  });

  return sortedGrouped;
};

/**
 * Formats a date group key for display
 * Shows "Today", "Yesterday", day name for last week, or formatted date for older
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param now - Current date (for testing purposes, defaults to now)
 * @returns Formatted string for display
 */
export const formatCompletionDateGroup = (dateStr: string, now: Date = new Date()): string => {
  const date = new Date(dateStr + 'T00:00:00Z');
  const today = new Date(now.toISOString().split('T')[0] + 'T00:00:00Z');
  
  // Calculate difference in days
  const diffTime = today.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays <= 7) {
    // Show day name for dates within the last week (including 7 days ago)
    return date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
  } else {
    // Show formatted date for older dates
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      timeZone: 'UTC'
    });
  }
};

/**
 * Calculates statistics for completed todos
 * @param todos - Array of completed todos
 * @returns Statistics object with total count and completion streak
 */
export const calculateCompletionStats = (todos: Todo[]): {
  totalCompleted: number;
  completedToday: number;
  completedThisWeek: number;
} => {
  const now = new Date();
  const today = new Date(now.toISOString().split('T')[0] + 'T00:00:00Z');
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const completedToday = todos.filter(todo => {
    if (!todo.completed_at) return false;
    const completedDate = new Date(todo.completed_at.split('T')[0] + 'T00:00:00Z');
    return completedDate.getTime() === today.getTime();
  }).length;

  const completedThisWeek = todos.filter(todo => {
    if (!todo.completed_at) return false;
    const completedDate = new Date(todo.completed_at);
    return completedDate.getTime() >= weekAgo.getTime();
  }).length;

  return {
    totalCompleted: todos.length,
    completedToday,
    completedThisWeek
  };
};

