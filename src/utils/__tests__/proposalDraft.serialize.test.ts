import { describe, it, expect } from 'vitest';
import { attachErrors, draftReducer, findTopic, hasErrors, initDraft, serialize, summarizeAccepted } from '../proposalDraft';
import type { Draft, DraftAction } from '../proposalDraft';
import { makeResolved } from '../../test/proposalFactories';

const run = (...actions: DraftAction[]): Draft => actions.reduce(draftReducer, initDraft(makeResolved()));

describe('serialize', () => {
  it('sends the accepted subset with canonical names and maps every index to a key', () => {
    const { accepted, pathIndex } = serialize(run({ type: 'useExisting', key: 'n:1' }));
    expect(accepted).toEqual({
      area_id: 2,
      new_topics: [{ name: 'Kitchen reno', description: 'The big one' }],
      assignments: [
        { todo_id: 1, topic: 'Kitchen reno' },
        { todo_id: 2, topic: 'Kitchen reno' },
        { todo_id: 3, topic: 'Garden' },
        { todo_id: 7, topic: 'Taken' },
      ],
      note_edits: [
        { topic: 'Kitchen reno', status_note: 'Planning.' },
        { topic: 'Garden', status_note: 'Bulbs in; mulch next.' },
      ],
    });
    expect(pathIndex).toEqual({ new_topics: ['n:0'], assignments: ['a:1', 'a:2', 'a:3', 'a:7'], note_edits: ['n:0', 't:5'] });
  });

  it('follows renames, redirects, unchecks and Unassigned additions', () => {
    const d = run(
      { type: 'renameTopic', key: 'n:1', name: ' Gate ' },
      { type: 'describeTopic', key: 'n:1', description: '   ' },
      { type: 'toggleRow', key: 'a:2' },
      { type: 'redirectRow', key: 'a:6', target: 't:6' },
      { type: 'setUnassigned', todoId: 20, target: 't:5' },
      { type: 'editNote', key: 't:5', text: 'Edited.' }
    );
    const { accepted, pathIndex } = serialize(d);
    expect(accepted.new_topics).toEqual([
      { name: 'Kitchen reno', description: 'The big one' },
      { name: 'Gate', description: null },
    ]);
    expect(accepted.assignments).toEqual([
      { todo_id: 1, topic: 'Kitchen reno' },
      { todo_id: 3, topic: 'Garden' },
      { todo_id: 6, topic: 'Shed' },
      { todo_id: 7, topic: 'Gate' },
      { todo_id: 20, topic: 'Garden' },
    ]);
    expect(pathIndex.assignments).toEqual(['a:1', 'a:3', 'a:6', 'a:7', 'a:20']);
    expect(accepted.note_edits[1]).toEqual({ topic: 'Garden', status_note: 'Edited.' });
  });

  it('drops a new topic\'s rows and note when the topic is unchecked', () => {
    const { accepted } = serialize(run({ type: 'useExisting', key: 'n:1' }, { type: 'toggleTopic', key: 'n:0' }));
    expect(accepted.new_topics).toEqual([]);
    expect(accepted.assignments.map((a) => a.todo_id)).toEqual([3, 7]);
    expect(accepted.note_edits.map((n) => n.topic)).toEqual(['Garden']);
  });

  it('never leaks UI-only fields such as takenName into the payload', () => {
    const { accepted } = serialize(run());
    expect(JSON.stringify(accepted)).not.toContain('takenName');
    expect(Object.keys(accepted.new_topics[0] ?? {}).sort()).toEqual(['description', 'name']);
  });
});

describe('attachErrors', () => {
  it('puts each error on its item by path, and the rest on the page', () => {
    const d = run({ type: 'useExisting', key: 'n:1' });
    const { pathIndex } = serialize(d);
    const withErrors = attachErrors(d, [
      { path: 'assignments[3].todo_id', reason: 'todo not found' },
      { path: 'new_topics[0].name', reason: 'a topic named \'Kitchen reno\' already exists' },
      { path: 'note_edits[1].topic', reason: 'unknown topic' },
      { path: 'area_id', reason: 'area no longer exists' },
      { path: '', reason: 'nothing accepted; reject the proposal instead' },
      { path: 'assignments[99].todo_id', reason: 'out of range' },
    ], pathIndex);
    expect(withErrors.rows.find((r) => r.key === 'a:7')?.error).toBe('todo not found');
    expect(findTopic(withErrors, 'n:0')?.error).toBe('a topic named \'Kitchen reno\' already exists');
    expect(withErrors.notes.find((n) => n.key === 't:5')?.error).toBe('unknown topic');
    expect(withErrors.pageErrors).toEqual([
      'area_id: area no longer exists',
      'nothing accepted; reject the proposal instead',
      'assignments[99].todo_id: out of range',
    ]);
    expect(hasErrors(withErrors)).toBe(true);
  });

  it('a second attach replaces the first, so stale errors do not linger', () => {
    const d = run({ type: 'useExisting', key: 'n:1' });
    const first = attachErrors(d, [{ path: 'assignments[0].todo_id', reason: 'x' }], serialize(d).pathIndex);
    const edited = draftReducer(first, { type: 'toggleRow', key: 'a:2' });
    const second = draftReducer(edited, { type: 'attachErrors', errors: [{ path: 'assignments[1].todo_id', reason: 'y' }], pathIndex: serialize(edited).pathIndex });
    expect(second.rows.find((r) => r.key === 'a:1')?.error).toBeNull();
    expect(second.rows.find((r) => r.key === 'a:3')?.error).toBe('y');
  });

  it('after partial fixes the second serialize rebuilds pathIndex, so errors land on the right rows', () => {
    const d = run({ type: 'useExisting', key: 'n:1' });
    const first = serialize(d);
    expect(first.pathIndex.assignments).toEqual(['a:1', 'a:2', 'a:3', 'a:7']);
    const failed = attachErrors(d, [
      { path: 'assignments[1].todo_id', reason: 'bad 2' },
      { path: 'assignments[3].todo_id', reason: 'bad 7' },
    ], first.pathIndex);
    // The user fixes the first by unchecking row 2; the other error stays.
    const fixed = draftReducer(failed, { type: 'toggleRow', key: 'a:2' });
    expect(fixed.rows.find((r) => r.key === 'a:7')?.error).toBe('bad 7');
    const second = serialize(fixed);
    expect(second.pathIndex.assignments).toEqual(['a:1', 'a:3', 'a:7']);
    // Index 2 is now row 7; index 1 is row 3. The old indices would hit the wrong rows.
    const again = attachErrors(fixed, [{ path: 'assignments[2].todo_id', reason: 'still bad 7' }], second.pathIndex);
    expect(again.rows.find((r) => r.key === 'a:7')?.error).toBe('still bad 7');
    expect(again.rows.filter((r) => r.error !== null).map((r) => r.key)).toEqual(['a:7']);
  });
});

describe('summarizeAccepted', () => {
  it('reads like the toast', () => {
    expect(summarizeAccepted({ area_id: 2, new_topics: [{ name: 'a', description: null }, { name: 'b', description: null }], assignments: Array.from({ length: 38 }, (_, i) => ({ todo_id: i + 1, topic: 'a' })), note_edits: [{ topic: 'a', status_note: '' }] }))
      .toBe('2 new topics, 38 assignments, 1 note');
    expect(summarizeAccepted({ area_id: 2, new_topics: [], assignments: [{ todo_id: 1, topic: 'a' }], note_edits: [] })).toBe('1 assignment');
  });
});
