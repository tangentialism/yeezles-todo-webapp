import { describe, it, expect } from 'vitest';
import { groupByArea } from '../groupByArea';
import { makeArea } from '../../test/topicFactories';
import type { Todo } from '../../types/todo';

const todo = (id: number, area_id: number | null): Todo => ({
  id, title: `t${id}`, description: '', completed: false, due_date: null, is_today: false, area_id,
  reference_url: null, created_at: '', updated_at: '', completed_at: null,
});

const home = makeArea({ id: 1, name: 'Home' });
const work = makeArea({ id: 2, name: 'Work' });

describe('groupByArea', () => {
  it('follows the areas order, not the todo order', () => {
    const groups = groupByArea([todo(1, 2), todo(2, 1)], [home, work]);
    expect(groups.map((g) => g.area?.name)).toEqual(['Home', 'Work']);
  });

  it('puts null and unknown areas last under one group with no area', () => {
    const groups = groupByArea([todo(1, null), todo(2, 1), todo(3, 99)], [home, work]);
    expect(groups.map((g) => g.area?.name ?? null)).toEqual(['Home', null]);
    expect(groups[1].todos.map((t) => t.id)).toEqual([1, 3]);
  });

  it('omits empty groups', () => {
    const groups = groupByArea([todo(1, 2)], [home, work]);
    expect(groups).toHaveLength(1);
    expect(groups[0].area?.name).toBe('Work');
    expect(groupByArea([], [home])).toEqual([]);
  });

  it('keeps the server order within a group', () => {
    const groups = groupByArea([todo(5, 1), todo(2, 1), todo(9, 1)], [home]);
    expect(groups[0].todos.map((t) => t.id)).toEqual([5, 2, 9]);
  });
});
