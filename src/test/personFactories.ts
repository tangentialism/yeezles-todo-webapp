import type { PersonWithCounts, TodoPerson } from '../types/person';

/** A person with counts; override what the test cares about. */
export const makePerson = (overrides: Partial<PersonWithCounts> = {}): PersonWithCounts => ({
  id: 1,
  user_id: 1,
  display_name: 'Priya Raman',
  aliases: [],
  peopler_id: null,
  peopler_url: null,
  peopler_link: 'none',
  created_at: '2026-10-01T00:00:00.000Z',
  updated_at: '2026-10-01T00:00:00.000Z',
  open_count: 0,
  done_count: 0,
  ...overrides,
});

/** The person shape attached to a todo as `people[]`. */
export const makeTodoPerson = (overrides: Partial<TodoPerson> = {}): TodoPerson => ({
  id: 1,
  display_name: 'Priya Raman',
  peopler_id: null,
  peopler_url: null,
  peopler_link: 'none',
  ...overrides,
});
