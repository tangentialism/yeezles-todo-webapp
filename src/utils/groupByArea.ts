import type { Area } from '../types/area';
import type { Todo } from '../types/todo';

/** One run of todos under an area, or under no area (`area` null). */
export interface AreaGroup {
  area: Area | null;
  todos: Todo[];
}

/**
 * Groups todos by area in the order of `areas`. Todos with no area, or an area
 * not in `areas`, go last in one group with `area` null. Empty groups are
 * omitted and each group keeps the order the todos arrived in.
 */
export const groupByArea = (todos: Todo[], areas: Area[]): AreaGroup[] => {
  const known = new Set(areas.map((a) => a.id));
  const groups: AreaGroup[] = areas
    .map((area) => ({ area: area as Area | null, todos: todos.filter((t) => t.area_id === area.id) }))
    .filter((g) => g.todos.length > 0);
  const loose = todos.filter((t) => t.area_id === null || !known.has(t.area_id));
  if (loose.length > 0) groups.push({ area: null, todos: loose });
  return groups;
};
