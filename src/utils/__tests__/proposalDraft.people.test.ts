import { describe, it, expect } from 'vitest';
import {
  applyBlocker, attachErrors, counts, draftReducer, hasErrors, initDraft, needsYou, peopleNeedingYou, serialize, summarizeAccepted,
} from '../proposalDraft';
import type { Draft, DraftAction } from '../proposalDraft';
import {
  makeCandidateRef, makeMatchedRef, makeProposedTodo, makeResolved, makeResolvedPeopleChange, makeResolvedRef, makeResolvedWithPeople,
} from '../../test/proposalFactories';
import { makeTodoPerson } from '../../test/personFactories';
import type { ResolvedProposal } from '../../types/proposal';
import type { ChooserPick } from '../proposalDraft';

const draftOf = (resolved: ResolvedProposal, ...actions: DraftAction[]): Draft => actions.reduce(draftReducer, initDraft(resolved));

/** Two new todos: n:0 has [matched 1, new "Sam"], n:1 has [ambiguous "Alex"]. */
const twoTodos = () =>
  makeResolvedWithPeople({
    new_todos: [[makeMatchedRef(1, 'Priya'), makeCandidateRef('new', 'Sam')], [makeCandidateRef('ambiguous', 'Alex')]],
  });

describe('initDraft people', () => {
  it('gives one DraftPersonRef per ref, keyed p:<owner>:<j>, unchosen', () => {
    const d = initDraft(twoTodos());
    expect(d.newTodos[0].people.map((p) => p.key)).toEqual(['p:n:0:0', 'p:n:0:1']);
    expect(d.newTodos[1].people.map((p) => p.key)).toEqual(['p:n:1:0']);
    expect(d.newTodos[0].people.every((p) => p.chosen === null && p.error === null)).toBe(true);
    expect(d.newTodos[0].people[1].resolved.state).toBe('new');
  });

  it('turns people_changes into accepted peopleRows keyed pc:<i>, with kept removals', () => {
    const gone = { person_id: 9, person: null };
    const priya = { person_id: 1, person: makeTodoPerson() };
    const d = initDraft(
      makeResolvedWithPeople({
        people_changes: [
          makeResolvedPeopleChange({ todo_id: 3, add: [makeMatchedRef(2, 'Lee')], remove: [priya, gone] }),
          makeResolvedPeopleChange({ todo_id: 6 }),
        ],
      })
    );
    expect(d.peopleRows.map((r) => [r.key, r.index, r.accepted])).toEqual([['pc:0', 0, true], ['pc:1', 1, true]]);
    expect(d.peopleRows[0].add.map((a) => a.key)).toEqual(['p:pc:0:0']);
    expect(d.peopleRows[0].remove).toEqual([
      { person_id: 1, person: priya.person, kept: true },
      { person_id: 9, person: null, kept: true },
    ]);
  });

  it('inits a missing row unaccepted and togglePeopleRow cannot accept it (P2)', () => {
    const d = draftOf(
      makeResolvedWithPeople({ people_changes: [makeResolvedPeopleChange({ missing: true, title: null })] }),
      { type: 'togglePeopleRow', key: 'pc:0' }
    );
    expect(d.peopleRows[0].accepted).toBe(false);
  });

  it('a proposal with no people key gives empty lists', () => {
    const d = initDraft(makeResolved({ new_todos: [makeProposedTodo()] }));
    expect(d.peopleRows).toEqual([]);
    expect(d.newTodos[0].people).toEqual([]);
  });
});

describe('needsYou and peopleNeedingYou', () => {
  it('counts new, ambiguous, link_candidate, possible_match and gone', () => {
    const refs = (['new', 'ambiguous', 'link_candidate', 'possible_match', 'gone'] as const).map((s) => makeCandidateRef(s));
    const d = initDraft(makeResolvedWithPeople({ new_todos: [refs] }));
    expect(d.newTodos[0].people.every(needsYou)).toBe(true);
    expect(peopleNeedingYou(d)).toBe(5);
  });

  it('does not count matched, matched_by_name or new_confirmed', () => {
    const refs = [
      makeMatchedRef(1),
      makeResolvedRef({ state: 'matched_by_name' }),
      makeCandidateRef('new_confirmed', 'Zed'),
    ];
    const d = initDraft(makeResolvedWithPeople({ new_todos: [refs] }));
    expect(peopleNeedingYou(d)).toBe(0);
  });

  it('a chosen ref no longer needs you; an error brings it back', () => {
    const d = draftOf(twoTodos(), { type: 'choosePerson', owner: 'n:0', refKey: 'p:n:0:1', pick: { kind: 'create', name: 'Sam' } });
    expect(needsYou(d.newTodos[0].people[1])).toBe(false);
    expect(needsYou({ ...d.newTodos[0].people[0], error: 'boom' })).toBe(true);
  });

  it('ignores refs on unaccepted todos and rows', () => {
    const resolved = makeResolvedWithPeople({
      new_todos: [[makeCandidateRef('new')]],
      people_changes: [makeResolvedPeopleChange({ add: [makeCandidateRef('gone', 'Q')] })],
    });
    const d = initDraft(resolved);
    expect(peopleNeedingYou(d)).toBe(2);
    expect(peopleNeedingYou(draftReducer(d, { type: 'toggleNewTodo', key: 'n:0' }))).toBe(1);
    expect(peopleNeedingYou(draftReducer(d, { type: 'togglePeopleRow', key: 'pc:0' }))).toBe(1);
  });
});

describe('applyBlocker people', () => {
  /** No topics, rows or notes, so only todos and people can be accepted. */
  const bare = (people: Parameters<typeof makeResolvedWithPeople>[0]) =>
    makeResolvedWithPeople(people, { topics: [], assignments: [], note_edits: [], area_topics: [], unassigned: [] });

  it('gives plural, singular, then null as refs are chosen', () => {
    let d = initDraft(bare({ new_todos: [[makeCandidateRef('new', 'A'), makeCandidateRef('new', 'B')]] }));
    expect(applyBlocker(d)).toBe('2 people need you.');
    d = draftReducer(d, { type: 'choosePerson', owner: 'n:0', refKey: 'p:n:0:0', pick: { kind: 'create', name: 'A' } });
    expect(applyBlocker(d)).toBe('1 person needs you.');
    d = draftReducer(d, { type: 'choosePerson', owner: 'n:0', refKey: 'p:n:0:1', pick: { kind: 'drop' } });
    expect(applyBlocker(d)).toBeNull();
  });

  it('still says Nothing accepted first', () => {
    const d = draftOf(bare({ new_todos: [[makeCandidateRef('new')]] }), { type: 'toggleNewTodo', key: 'n:0' });
    expect(applyBlocker(d)).toBe('Nothing accepted. Reject instead.');
  });

  it('comes before the topic-name blocker', () => {
    const d = initDraft(makeResolvedWithPeople({ new_todos: [[makeCandidateRef('new')]] }));
    // The default proposal has a new topic whose name is taken.
    expect(applyBlocker(initDraft(makeResolved()))).toBe('Fix 1 topic name first.');
    expect(applyBlocker(d)).toBe('1 person needs you.');
  });
});

describe('choosePerson', () => {
  const pick = (d: Draft, refKey: string, p: ChooserPick) =>
    draftReducer(d, { type: 'choosePerson', owner: 'n:0', refKey, pick: p });

  it('drop removes the ref', () => {
    const d = pick(initDraft(twoTodos()), 'p:n:0:1', { kind: 'drop' });
    expect(d.newTodos[0].people.map((p) => p.key)).toEqual(['p:n:0:0']);
  });

  it('a person pick resolves the ref and clears its error', () => {
    const sent = pick(initDraft(twoTodos()), 'p:n:0:1', { kind: 'create', name: 'Sam' });
    const sam = makeTodoPerson({ id: 7, display_name: 'Sam Lee' });
    const base = sent;
    const errored = attachErrors(base, [{ path: 'new_todos[0].people[1]', reason: 'bad' }], serialize(base).pathIndex);
    expect(errored.newTodos[0].people[1].error).toBe('bad');
    const d = pick(errored, 'p:n:0:1', { kind: 'person', person: sam });
    expect(d.newTodos[0].people[1].chosen).toEqual({ kind: 'person', person: sam });
    expect(d.newTodos[0].people[1].error).toBeNull();
    expect(needsYou(d.newTodos[0].people[1])).toBe(false);
  });

  it('picking a person already on the owner collapses to one chip', () => {
    const d = pick(initDraft(twoTodos()), 'p:n:0:1', { kind: 'person', person: makeTodoPerson({ id: 1, display_name: 'Priya' }) });
    expect(d.newTodos[0].people).toHaveLength(1);
    expect(needsYou(d.newTodos[0].people[0])).toBe(false);
  });

  it('works on a people row', () => {
    const d = draftOf(
      makeResolvedWithPeople({ people_changes: [makeResolvedPeopleChange({ add: [makeCandidateRef('new', 'Sam')] })] }),
      { type: 'choosePerson', owner: 'pc:0', refKey: 'p:pc:0:0', pick: { kind: 'create', name: 'Sam' } }
    );
    expect(d.peopleRows[0].add[0].chosen).toEqual({ kind: 'create', name: 'Sam' });
  });
});

describe('addPerson', () => {
  const sam = makeTodoPerson({ id: 7, display_name: 'Sam Lee' });

  it('appends a matched ref with a P7 key and bumps nextSeq', () => {
    const before = initDraft(twoTodos());
    const d = draftReducer(before, { type: 'addPerson', owner: 'n:1', person: sam });
    const added = d.newTodos[1].people[1];
    expect(added.key).toBe(`p:n:1:a${before.nextSeq}`);
    expect(added.resolved).toMatchObject({ state: 'matched', name: 'Sam Lee', person: sam, ref: { person_id: 7 } });
    expect(added.chosen).toBeNull();
    expect(d.nextSeq).toBe(before.nextSeq + 1);
    expect(needsYou(added)).toBe(false);
  });

  it('is a no-op for a person already present', () => {
    const d = initDraft(twoTodos());
    expect(draftReducer(d, { type: 'addPerson', owner: 'n:0', person: makeTodoPerson({ id: 1, display_name: 'Priya' }) })).toBe(d);
  });

  it('adds to a people row', () => {
    const d = draftOf(makeResolvedWithPeople({ people_changes: [makeResolvedPeopleChange()] }), { type: 'addPerson', owner: 'pc:0', person: sam });
    expect(d.peopleRows[0].add.map((a) => a.resolved.name)).toEqual(['Sam Lee']);
  });
});

describe('toggleRemoval', () => {
  it('flips kept', () => {
    const resolved = makeResolvedWithPeople({
      people_changes: [makeResolvedPeopleChange({ remove: [{ person_id: 1, person: makeTodoPerson() }] })],
    });
    const d = draftOf(resolved, { type: 'toggleRemoval', key: 'pc:0', personId: 1 });
    expect(d.peopleRows[0].remove[0].kept).toBe(false);
    expect(draftReducer(d, { type: 'toggleRemoval', key: 'pc:0', personId: 1 }).peopleRows[0].remove[0].kept).toBe(true);
  });
});

describe('serialize people', () => {
  it('sends new todo people by the exact-ref rule', () => {
    const link = makeResolvedRef({ ref: { link: { person_id: 4, peopler_id: 40 } }, state: 'matched', person: makeTodoPerson({ id: 4 }) });
    const d = draftOf(
      makeResolvedWithPeople({
        new_todos: [[
          makeMatchedRef(1),
          makeResolvedRef({ ref: { name: 'Pat' }, state: 'matched_by_name', person: makeTodoPerson({ id: 2 }) }),
          link,
          makeCandidateRef('new_confirmed', 'Zed'),
          makeCandidateRef('new', 'Sam'),
          makeCandidateRef('ambiguous', 'Alex'),
          makeCandidateRef('gone', 'Gil'),
        ]],
      }),
      { type: 'choosePerson', owner: 'n:0', refKey: 'p:n:0:4', pick: { kind: 'create', name: 'Sam', peopler_id: 55 } },
      { type: 'choosePerson', owner: 'n:0', refKey: 'p:n:0:5', pick: { kind: 'person', person: makeTodoPerson({ id: 8 }) } },
      { type: 'choosePerson', owner: 'n:0', refKey: 'p:n:0:6', pick: { kind: 'link', person: makeTodoPerson({ id: 9 }), peopler_id: 90 } }
    );
    expect(serialize(d).accepted.new_todos?.[0].people).toEqual([
      { person_id: 1 },
      { person_id: 2 },
      { link: { person_id: 4, peopler_id: 40 } },
      { create: { name: 'Zed' } },
      { create: { name: 'Sam', peopler_id: 55 } },
      { person_id: 8 },
      { link: { person_id: 9, peopler_id: 90 } },
    ]);
  });

  it('a create pick without a peopler_id sends only the name', () => {
    const d = draftOf(
      makeResolvedWithPeople({ new_todos: [[makeCandidateRef('new', 'Sam')]] }),
      { type: 'choosePerson', owner: 'n:0', refKey: 'p:n:0:0', pick: { kind: 'create', name: 'Sam' } }
    );
    expect(serialize(d).accepted.new_todos?.[0].people).toEqual([{ create: { name: 'Sam' } }]);
  });

  it('leaves the people key out when there are no refs and the stored todo had none (P4)', () => {
    const d = initDraft(makeResolved({ new_todos: [makeProposedTodo()] }));
    expect('people' in (serialize(d).accepted.new_todos?.[0] ?? {})).toBe(false);
    expect('people_changes' in serialize(d).accepted).toBe(false);
  });

  it('sends [] when the stored todo had a people key and every chip was dropped (P4)', () => {
    const d = draftOf(
      makeResolvedWithPeople(
        { new_todos: [[makeCandidateRef('new')]] },
        { new_todos: [makeProposedTodo({ people: [{ name: 'Sam' }] })] }
      ),
      { type: 'choosePerson', owner: 'n:0', refKey: 'p:n:0:0', pick: { kind: 'drop' } }
    );
    expect(serialize(d).accepted.new_todos?.[0].people).toEqual([]);
  });

  it('omits unaccepted todos and their refs', () => {
    const d = draftOf(twoTodos(), { type: 'toggleNewTodo', key: 'n:0' }, { type: 'choosePerson', owner: 'n:1', refKey: 'p:n:1:0', pick: { kind: 'drop' } });
    const { accepted, pathIndex } = serialize(d);
    expect(accepted.new_todos).toHaveLength(1);
    expect(pathIndex.refPaths ?? {}).toEqual({});
  });

  it('sends accepted people rows as { todo_id, add, remove } with kept removals only, and skips empty rows', () => {
    const resolved = makeResolvedWithPeople({
      people_changes: [
        makeResolvedPeopleChange({
          todo_id: 3,
          add: [makeMatchedRef(2, 'Lee')],
          remove: [{ person_id: 1, person: makeTodoPerson() }, { person_id: 9, person: null }],
        }),
        makeResolvedPeopleChange({ todo_id: 6, remove: [{ person_id: 1, person: makeTodoPerson() }] }),
        makeResolvedPeopleChange({ todo_id: 8, add: [makeMatchedRef(5)] }),
        makeResolvedPeopleChange({ todo_id: 10, missing: true, add: [makeMatchedRef(5)] }),
      ],
    });
    const d = draftOf(
      resolved,
      { type: 'toggleRemoval', key: 'pc:0', personId: 1 },
      { type: 'toggleRemoval', key: 'pc:1', personId: 1 },
      { type: 'togglePeopleRow', key: 'pc:2' }
    );
    const { accepted, pathIndex } = serialize(d);
    expect(accepted.people_changes).toEqual([{ todo_id: 3, add: [{ person_id: 2 }], remove: [9] }]);
    expect(pathIndex.people_changes).toEqual(['pc:0']);
  });

  it('refPaths uses submitted positions, skipping unaccepted todos and unsent refs', () => {
    const d = draftOf(
      twoTodos(),
      { type: 'toggleNewTodo', key: 'n:0' },
      { type: 'choosePerson', owner: 'n:1', refKey: 'p:n:1:0', pick: { kind: 'person', person: makeTodoPerson({ id: 8 }) } }
    );
    expect(serialize(d).pathIndex.refPaths).toEqual({ 'new_todos[0].people[0]': 'p:n:1:0' });
  });

  it('refPaths maps new_todos[0].people[1] and people_changes[0].add[0]', () => {
    const resolved = makeResolvedWithPeople({
      new_todos: [[makeMatchedRef(1), makeCandidateRef('new_confirmed', 'Zed')]],
      people_changes: [makeResolvedPeopleChange({ add: [makeMatchedRef(2)] })],
    });
    expect(serialize(initDraft(resolved)).pathIndex.refPaths).toEqual({
      'new_todos[0].people[0]': 'p:n:0:0',
      'new_todos[0].people[1]': 'p:n:0:1',
      'people_changes[0].add[0]': 'p:pc:0:0',
    });
  });
});

describe('attachErrors people', () => {
  const resolved = () =>
    makeResolvedWithPeople({
      new_todos: [[makeMatchedRef(1), makeMatchedRef(2)]],
      people_changes: [makeResolvedPeopleChange({ add: [makeMatchedRef(3)], remove: [{ person_id: 1, person: makeTodoPerson() }] })],
    });

  it('puts a new_todos[0].people[1] error on that ref, which then needs you', () => {
    const d = initDraft(resolved());
    const out = attachErrors(d, [{ path: 'new_todos[0].people[1]', reason: 'no such person' }], serialize(d).pathIndex);
    expect(out.newTodos[0].people.map((p) => p.error)).toEqual([null, 'no such person']);
    expect(out.newTodos[0].error).toBeNull();
    expect(needsYou(out.newTodos[0].people[1])).toBe(true);
    expect(hasErrors(out)).toBe(true);
    expect(out.pageErrors).toEqual([]);
  });

  it('puts people_changes[0].todo_id and .remove[0] errors on the row, and .add[0] on the ref (P5)', () => {
    const d = initDraft(resolved());
    const { pathIndex } = serialize(d);
    const todoErr = attachErrors(d, [{ path: 'people_changes[0].todo_id', reason: 'deleted' }], pathIndex);
    expect(todoErr.peopleRows[0].error).toBe('deleted');
    const removeErr = attachErrors(d, [{ path: 'people_changes[0].remove[0]', reason: 'nope' }], pathIndex);
    expect(removeErr.peopleRows[0].error).toBe('nope');
    const addErr = attachErrors(d, [{ path: 'people_changes[0].add[0]', reason: 'bad' }], pathIndex);
    expect(addErr.peopleRows[0].add[0].error).toBe('bad');
    expect(addErr.peopleRows[0].error).toBeNull();
    expect(hasErrors(todoErr)).toBe(true);
  });

  it('replaces earlier ref and row errors', () => {
    const d = initDraft(resolved());
    const { pathIndex } = serialize(d);
    const first = attachErrors(d, [{ path: 'new_todos[0].people[1]', reason: 'x' }, { path: 'people_changes[0].todo_id', reason: 'y' }], pathIndex);
    const second = attachErrors(first, [], pathIndex);
    expect(hasErrors(second)).toBe(false);
  });
});

describe('counts and summary with people', () => {
  it('a people row with nothing left to send is not accepted, so Apply says Nothing accepted (final review M1)', () => {
    const row = makeResolvedPeopleChange({ add: [makeMatchedRef(2, 'Lee')], remove: [{ person_id: 1, person: makeTodoPerson() }] });
    const base = initDraft(makeResolved());
    const only = { ...base, rows: [], notes: [], newTodos: [], topics: [] };
    const d = draftOf(makeResolvedWithPeople({ people_changes: [row] }));
    const dropped = draftReducer(draftReducer(d, { type: 'choosePerson', owner: 'pc:0', refKey: d.peopleRows[0].add[0].key, pick: { kind: 'drop' } }), { type: 'toggleRemoval', key: 'pc:0', personId: 1 });
    expect(counts(dropped).accepted).toBe(counts(d).accepted - 1);
    const lone = { ...only, peopleRows: dropped.peopleRows };
    expect(applyBlocker(lone)).toBe('Nothing accepted. Reject instead.');
  });

  it('counts people rows in total and accepted', () => {
    const d = initDraft(makeResolvedWithPeople({ people_changes: [makeResolvedPeopleChange({ add: [makeMatchedRef(2, 'Lee')] }), makeResolvedPeopleChange({ todo_id: 6, missing: true })] }));
    const base = initDraft(makeResolved());
    expect(counts(d).total - counts(base).total).toBe(2);
    expect(counts(d).accepted - counts(base).accepted).toBe(1);
  });

  it('summarizeAccepted appends the people part', () => {
    const base = serialize(initDraft(makeResolved())).accepted;
    const one = { ...base, people_changes: [{ todo_id: 1, add: [], remove: [] }] };
    const two = { ...base, people_changes: [{ todo_id: 1, add: [], remove: [] }, { todo_id: 2, add: [], remove: [] }] };
    expect(summarizeAccepted(one)).toMatch(/, 1 people change$/);
    expect(summarizeAccepted(two)).toMatch(/, 2 people changes$/);
    expect(summarizeAccepted(base)).not.toMatch(/people/);
  });
});
