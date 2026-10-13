import { describe, it, expect } from 'vitest';
import {
  applyBlocker, canUseExisting, counts, findTopic, initDraft, rowReason, sections, targetOptions, validateTopicName,
} from '../proposalDraft';
import { makeResolved } from '../../test/proposalFactories';

const draft = initDraft(makeResolved());
const row = (todoId: number) => draft.rows.find((r) => r.todoId === todoId)!;

describe('initDraft', () => {
  it('keys topics: new by payload order, existing by id', () => {
    expect(draft.topics.map((t) => [t.key, t.kind, t.name])).toEqual([
      ['n:0', 'new', 'Kitchen reno'],
      ['n:1', 'new', 'Taken'],
      ['t:5', 'existing', 'Garden'],
      ['t:9', 'existing', 'Website'],
    ]);
    expect(findTopic(draft, 'n:0')?.description).toBe('The big one');
  });

  it('matches assignment names ignoring case and whitespace', () => {
    expect(row(2).target).toBe('n:0');
  });

  it('accepts every item apply would accept, and nothing else', () => {
    expect(draft.rows.map((r) => [r.todoId, r.accepted])).toEqual([
      [1, true], [2, true], [3, true], [4, false], [5, false], [6, false], [7, true],
    ]);
    expect(draft.notes.map((n) => [n.key, n.accepted])).toEqual([['n:0', true], ['t:5', true]]);
    expect(counts(draft)).toEqual({ accepted: 8, total: 11 });
  });

  it('gives each refused row its reason', () => {
    expect(rowReason(draft, row(4))).toBe('Todo deleted');
    expect(row(4).title).toBe('Todo #4');
    expect(rowReason(draft, row(5))).toBe('Moved to another area');
    expect(rowReason(draft, row(6))).toBe('Topic is in another area');
    expect(rowReason(draft, row(1))).toBeNull();
  });

  it('flags a new topic whose name was taken, and offers Use existing only in the same area', () => {
    const taken = findTopic(draft, 'n:1')!;
    expect(taken.taken).toBe(true);
    expect(canUseExisting(draft, taken)).toBe(true);
    expect(applyBlocker(draft)).toBe('Fix 1 topic name first.');
  });

  it('lists sections for new topics and topics with items, and target options without problem topics', () => {
    expect(sections(draft).map((t) => t.key)).toEqual(['n:0', 'n:1', 't:5', 't:9']);
    expect(targetOptions(draft)).toEqual([
      { key: 't:5', name: 'Garden' },
      { key: 't:6', name: 'Shed' },
      { key: 't:11', name: 'Taken' },
      { key: 'n:0', name: 'Kitchen reno' },
    ]);
  });

  it('marks a name that neither exists nor is new as unknown', () => {
    const resolved = makeResolved();
    resolved.topics.push({ name: 'Ghost', is_new: false, exists: false, id: null, area_id: null, archived: null, open_count: null, done_count: null });
    resolved.assignments.push({ todo_id: 8, topic: 'Ghost', missing: false, title: 'Haunt', completed: false, area_id: 2, current_topic: null });
    const d = initDraft(resolved);
    const ghostRow = d.rows.find((r) => r.todoId === 8)!;
    expect(ghostRow.target).toBe('u:ghost');
    expect(ghostRow.accepted).toBe(false);
    expect(rowReason(d, ghostRow)).toBe('Topic not found');
  });
});

describe('validateTopicName', () => {
  it('refuses empty, too long, and names that exist or are already in the draft', () => {
    expect(validateTopicName(draft, '   ')).toBe('A topic needs a name.');
    expect(validateTopicName(draft, 'x'.repeat(101))).toBe('Topic names are at most 100 characters.');
    expect(validateTopicName(draft, ' garden ')).toBe('A topic named "garden" already exists.');
    expect(validateTopicName(draft, 'KITCHEN RENO')).toBe('A topic named "KITCHEN RENO" already exists.');
    expect(validateTopicName(draft, 'Kitchen reno', 'n:0')).toBeNull();
    expect(validateTopicName(draft, 'Patio')).toBeNull();
  });

  // Ruling L10 (spec 6.3 rule 4): any name in resolved.topics or area_topics is taken,
  // whatever its is_new / exists flags.
  it('refuses a name held by a topic that is neither new nor existing (Ghost)', () => {
    const resolved = makeResolved();
    resolved.topics.push({ name: 'Ghost', is_new: false, exists: false, id: null, area_id: null, archived: null, open_count: null, done_count: null });
    const d = initDraft(resolved);
    expect(validateTopicName(d, 'ghost')).toBe('A topic named "ghost" already exists.');
    expect(validateTopicName(d, 'Ghost', 'n:0')).toBe('A topic named "Ghost" already exists.');
  });

  it('still refuses a taken new topic its own name, since an existing topic holds it', () => {
    expect(validateTopicName(draft, 'Taken', 'n:1')).toBe('A topic named "Taken" already exists.');
  });
});

describe('applyBlocker', () => {
  it('says to reject when nothing is accepted', () => {
    const d = initDraft(makeResolved({
      topics: [],
      assignments: [{ todo_id: 4, topic: 'Garden', missing: true, title: null, completed: null, area_id: null, current_topic: null }],
      note_edits: [],
    }));
    expect(applyBlocker(d)).toBe('Nothing accepted. Reject instead.');
  });
});
