import type { TodayView, Todo } from '../types/todo';

/**
 * Everything in today's focus, each todo once: overdue first, then due
 * today, then picked for today. Shared by the Today view and the Today tab
 * count so the two always agree.
 */
export const getFocusTodos = (data: TodayView | undefined | null): Todo[] => {
  if (!data) return [];
  const seen = new Set<number>();
  return [...data.focus.overdue, ...data.focus.due_today, ...data.focus.today_tagged].filter((todo) => {
    if (seen.has(todo.id)) return false;
    seen.add(todo.id);
    return true;
  });
};

/** Number of focus todos still open (the "today" figure in the Today header). */
export const countOpenFocusTodos = (data: TodayView | undefined | null): number =>
  getFocusTodos(data).filter((todo) => !todo.completed).length;
