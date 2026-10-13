import type { ResolvedProposal } from '../types/proposal';
import { makeTopic } from './topicFactories';

/**
 * One proposal for area 2 ("Home") exercising every row state:
 * - "Kitchen reno": new, with a first note; todo 2 names it "kitchen reno"
 *   (case-insensitive match).
 * - "Taken": new, but a topic named Taken (id 11, area 2) exists now.
 * - "Garden": existing (id 5) with a note edit. Todo 4 is deleted; todo 5
 *   moved to area 7.
 * - "Website": existing but in area 7.
 * Unassigned: "Paint fence". Area topics: Garden, Shed, Taken.
 */
export const makeResolved = (overrides: Partial<ResolvedProposal> = {}): ResolvedProposal => ({
  proposal: {
    id: 7,
    user_id: 1,
    kind: 'topic_changes',
    status: 'pending',
    payload: {
      area_id: 2,
      new_topics: [
        { name: 'Kitchen reno', description: 'The big one' },
        { name: 'Taken', description: null },
      ],
      assignments: [
        { todo_id: 1, topic: 'Kitchen reno' },
        { todo_id: 2, topic: 'kitchen reno' },
        { todo_id: 3, topic: 'Garden' },
        { todo_id: 4, topic: 'Garden' },
        { todo_id: 5, topic: 'Garden' },
        { todo_id: 6, topic: 'Website' },
        { todo_id: 7, topic: 'Taken' },
      ],
      note_edits: [
        { topic: 'Kitchen reno', status_note: 'Planning.' },
        { topic: 'Garden', status_note: 'Bulbs in; mulch next.' },
      ],
    },
    source: 'Claude',
    applied: null,
    created_at: new Date(Date.now() - 20 * 60_000).toISOString(),
    resolved_at: null,
  },
  summary: '2 new topics, 7 assignments, 2 note edits',
  area: { id: 2, name: 'Home' },
  topics: [
    { name: 'Kitchen reno', is_new: true, exists: false, id: null, area_id: null, archived: null, open_count: null, done_count: null },
    { name: 'Taken', is_new: true, exists: true, id: 11, area_id: 2, archived: false, open_count: 1, done_count: 0 },
    { name: 'Garden', is_new: false, exists: true, id: 5, area_id: 2, archived: false, open_count: 3, done_count: 1 },
    { name: 'Website', is_new: false, exists: true, id: 9, area_id: 7, archived: false, open_count: null, done_count: null },
  ],
  assignments: [
    { todo_id: 1, topic: 'Kitchen reno', missing: false, title: 'Order countertop', completed: false, area_id: 2, current_topic: null },
    { todo_id: 2, topic: 'kitchen reno', missing: false, title: 'Pick tiles', completed: true, area_id: 2, current_topic: null },
    { todo_id: 3, topic: 'Garden', missing: false, title: 'Mulch beds', completed: false, area_id: 2, current_topic: { id: 6, name: 'Shed' } },
    { todo_id: 4, topic: 'Garden', missing: true, title: null, completed: null, area_id: null, current_topic: null },
    { todo_id: 5, topic: 'Garden', missing: false, title: 'Buy bulbs', completed: false, area_id: 7, current_topic: null },
    { todo_id: 6, topic: 'Website', missing: false, title: 'Renew domain', completed: false, area_id: 2, current_topic: null },
    { todo_id: 7, topic: 'Taken', missing: false, title: 'Fix gate', completed: false, area_id: 2, current_topic: null },
  ],
  note_edits: [
    { topic: 'Kitchen reno', status_note: 'Planning.', current_status_note: null },
    { topic: 'Garden', status_note: 'Bulbs in; mulch next.', current_status_note: 'Bulbs ordered.' },
  ],
  area_topics: [
    makeTopic({ id: 5, area_id: 2, name: 'Garden', open_count: 3, done_count: 1 }),
    makeTopic({ id: 6, area_id: 2, name: 'Shed' }),
    makeTopic({ id: 11, area_id: 2, name: 'Taken', open_count: 1 }),
  ],
  unassigned: [{ id: 20, title: 'Paint fence' }],
  ...overrides,
});
