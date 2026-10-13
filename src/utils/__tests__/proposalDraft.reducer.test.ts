import { describe, it, expect } from 'vitest';
import { applyBlocker, draftReducer, findTopic, initDraft, rowReason, sections, targetOptions } from '../proposalDraft';
import type { Draft, DraftAction } from '../proposalDraft';
import { makeResolved } from '../../test/proposalFactories';

const run = (...actions: DraftAction[]): Draft => actions.reduce(draftReducer, initDraft(makeResolved()));
const row = (d: Draft, todoId: number) => d.rows.find((r) => r.todoId === todoId && r.origin === 'proposal') ?? d.rows.find((r) => r.todoId === todoId)!;
const note = (d: Draft, key: string) => d.notes.find((n) => n.key === key)!;

/** The initial draft with an error on row a:1, the n:0 note and the n:0 topic (all in "Kitchen reno"). */
const withErrors = (): Draft => {
  const d0 = initDraft(makeResolved());
  return {
    ...d0,
    rows: d0.rows.map((r) => (r.key === 'a:1' ? { ...r, error: 'todo not found' } : r)),
    notes: d0.notes.map((n) => (n.key === 'n:0' ? { ...n, error: 'bad note' } : n)),
    topics: d0.topics.map((t) => (t.key === 'n:0' ? { ...t, error: 'bad topic' } : t)),
  };
};

describe('draftReducer', () => {
  it('toggleRow flips a checkable row and ignores a locked one', () => {
    let d = run({ type: 'toggleRow', key: 'a:1' });
    expect(row(d, 1).accepted).toBe(false);
    d = draftReducer(d, { type: 'toggleRow', key: 'a:4' });
    expect(row(d, 4).accepted).toBe(false);
  });

  it('unchecking a new topic cascades to its rows and note; re-checking restores only those', () => {
    let d = run({ type: 'toggleRow', key: 'a:2' }, { type: 'toggleTopic', key: 'n:0' });
    expect(row(d, 1).accepted).toBe(false);
    expect(rowReason(d, row(d, 1))).toBe('needs a topic');
    expect(note(d, 'n:0').accepted).toBe(false);
    d = draftReducer(d, { type: 'toggleTopic', key: 'n:0' });
    expect(row(d, 1).accepted).toBe(true);
    expect(note(d, 'n:0').accepted).toBe(true);
    expect(row(d, 2).accepted).toBe(false);
  });

  it('a row under an unchecked topic cannot be checked', () => {
    const d = run({ type: 'toggleTopic', key: 'n:0' }, { type: 'toggleRow', key: 'a:1' });
    expect(row(d, 1).accepted).toBe(false);
  });

  it('redirect moves a row, accepts it, and unlocks an other-area row', () => {
    let d = run({ type: 'redirectRow', key: 'a:3', target: 'n:0' });
    expect(row(d, 3).target).toBe('n:0');
    d = draftReducer(d, { type: 'redirectRow', key: 'a:6', target: 't:5' });
    expect(row(d, 6).accepted).toBe(true);
    expect(rowReason(d, row(d, 6))).toBeNull();
  });

  it('redirect to an area topic the proposal never named creates its section', () => {
    const d = run({ type: 'redirectRow', key: 'a:3', target: 't:6' });
    expect(findTopic(d, 't:6')?.name).toBe('Shed');
    expect(sections(d).map((t) => t.key)).toContain('t:6');
    expect(row(d, 3).accepted).toBe(true);
  });

  it('a locked row cannot be redirected into acceptance', () => {
    const d = run({ type: 'redirectRow', key: 'a:5', target: 't:5' });
    expect(row(d, 5).accepted).toBe(false);
  });

  it('rejectSection unchecks the rows, the note, and a new topic itself', () => {
    let d = run({ type: 'rejectSection', key: 't:5' });
    expect(row(d, 3).accepted).toBe(false);
    expect(note(d, 't:5').accepted).toBe(false);
    d = draftReducer(d, { type: 'rejectSection', key: 'n:0' });
    expect(findTopic(d, 'n:0')?.accepted).toBe(false);
  });

  it('rejectSection clears the errors of the topic, its rows and its note (ruling L9)', () => {
    const d = draftReducer(withErrors(), { type: 'rejectSection', key: 'n:0' });
    expect(row(d, 1).error).toBeNull();
    expect(note(d, 'n:0').error).toBeNull();
    expect(findTopic(d, 'n:0')?.error).toBeNull();
  });

  it('the toggleTopic cascade clears the errors of the topic, its rows and its note (ruling L9)', () => {
    const d = draftReducer(withErrors(), { type: 'toggleTopic', key: 'n:0' });
    expect(row(d, 1)).toMatchObject({ accepted: false, error: null });
    expect(note(d, 'n:0')).toMatchObject({ accepted: false, error: null });
    expect(findTopic(d, 'n:0')?.error).toBeNull();
  });

  it('renaming a taken topic to a free name clears the block; to a used one sets nameError', () => {
    let d = run({ type: 'renameTopic', key: 'n:1', name: 'Garden' });
    expect(findTopic(d, 'n:1')?.nameError).toBe('A topic named "Garden" already exists.');
    expect(applyBlocker(d)).toBe('Fix 1 topic name first.');
    d = draftReducer(d, { type: 'renameTopic', key: 'n:1', name: 'Gate' });
    expect(findTopic(d, 'n:1')).toMatchObject({ name: 'Gate', taken: false, nameError: null });
    expect(applyBlocker(d)).toBeNull();
    expect(row(d, 7).target).toBe('n:1');
  });

  it('renaming away from a taken name and back keeps Use existing available (ruling L14)', () => {
    let d = run({ type: 'renameTopic', key: 'n:1', name: 'Gate' });
    expect(findTopic(d, 'n:1')?.taken).toBe(false);
    d = draftReducer(d, { type: 'renameTopic', key: 'n:1', name: ' taken ' });
    expect(findTopic(d, 'n:1')).toMatchObject({ taken: true, nameError: null });
    expect(applyBlocker(d)).toBe('Fix 1 topic name first.');
    d = draftReducer(d, { type: 'useExisting', key: 'n:1' });
    expect(findTopic(d, 't:11')).toMatchObject({ kind: 'existing', name: 'Taken' });
    expect(row(d, 7)).toMatchObject({ target: 't:11', accepted: true });
  });

  it('useExisting turns the taken new topic into the existing one, rows following', () => {
    const d = run({ type: 'useExisting', key: 'n:1' });
    expect(findTopic(d, 'n:1')).toBeUndefined();
    expect(findTopic(d, 't:11')).toMatchObject({ kind: 'existing', name: 'Taken' });
    expect(row(d, 7)).toMatchObject({ target: 't:11', accepted: true });
    expect(applyBlocker(d)).toBeNull();
  });

  it('addTopic creates a new topic and moves a row into it; a bad name is ignored', () => {
    let d = run({ type: 'addTopic', name: 'Patio', rowKey: 'a:3' });
    const patio = d.topics.find((t) => t.name === 'Patio')!;
    expect(patio).toMatchObject({ kind: 'new', accepted: true, key: 'n:2' });
    expect(row(d, 3).target).toBe('n:2');
    expect(targetOptions(d).map((o) => o.name)).toContain('Patio');
    const before = d;
    d = draftReducer(d, { type: 'addTopic', name: 'garden', rowKey: 'a:1' });
    expect(d).toBe(before);
  });

  it('notes: toggle, edit, and no toggling on an unusable topic', () => {
    let d = run({ type: 'editNote', key: 't:5', text: 'Mulch done.' }, { type: 'toggleNote', key: 't:5' });
    expect(note(d, 't:5')).toMatchObject({ text: 'Mulch done.', accepted: false });
    d = draftReducer(d, { type: 'toggleTopic', key: 'n:0' });
    d = draftReducer(d, { type: 'toggleNote', key: 'n:0' });
    expect(note(d, 'n:0').accepted).toBe(false);
  });

  it('an edited note is not re-accepted when its topic is re-checked (ruling L11)', () => {
    let d = run({ type: 'toggleTopic', key: 'n:0' }, { type: 'editNote', key: 'n:0', text: 'Changed plan.' });
    expect(note(d, 'n:0')).toMatchObject({ text: 'Changed plan.', cascaded: false, accepted: false });
    d = draftReducer(d, { type: 'toggleTopic', key: 'n:0' });
    expect(note(d, 'n:0')).toMatchObject({ text: 'Changed plan.', accepted: false });
    expect(row(d, 1).accepted).toBe(true);
  });

  it('setUnassigned adds an accepted row to the chosen topic, and null removes it', () => {
    let d = run({ type: 'setUnassigned', todoId: 20, target: 't:5' });
    expect(d.rows.find((r) => r.todoId === 20)).toMatchObject({ origin: 'unassigned', target: 't:5', accepted: true, title: 'Paint fence', currentTopic: null });
    d = draftReducer(d, { type: 'setUnassigned', todoId: 20, target: 'n:0' });
    expect(d.rows.filter((r) => r.todoId === 20)).toHaveLength(1);
    d = draftReducer(d, { type: 'setUnassigned', todoId: 20, target: null });
    expect(d.rows.find((r) => r.todoId === 20)).toBeUndefined();
  });

  it('addTopic from the Unassigned tab assigns that todo', () => {
    const d = run({ type: 'addTopic', name: 'Fences', unassignedTodoId: 20 });
    expect(d.rows.find((r) => r.todoId === 20)).toMatchObject({ target: 'n:2', origin: 'unassigned', accepted: true });
  });

  it('a change to an item clears its error', () => {
    const d0 = initDraft(makeResolved());
    const withError: Draft = { ...d0, rows: d0.rows.map((r) => (r.key === 'a:1' ? { ...r, error: 'todo not found' } : r)) };
    expect(row(draftReducer(withError, { type: 'toggleRow', key: 'a:1' }), 1).error).toBeNull();
  });
});
