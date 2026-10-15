/**
 * The proposal review screen's state, as plain data and pure functions (spec
 * §6.3): initDraft builds it from GET /proposals/:id, draftReducer applies
 * user actions, serialize produces the `accepted` payload with a pathIndex,
 * and attachErrors maps a 422's paths back to items. Components only render
 * and dispatch.
 */
import type { ProposedTodo, ResolvedProposal, TopicChangesPayload } from '../types/proposal';
import type { TopicRef, TopicWithCounts } from '../types/topic';
import { TOPIC_NAME_MAX } from '../constants';

/** Backend name matching: ignore case and surrounding whitespace. */
export const normName = (name: string) => name.trim().toLowerCase();

export type TopicKind = 'existing' | 'new' | 'unknown';

export interface DraftTopic {
  /** `t:<id>` existing, `n:<seq>` new, `u:<name>` neither. */
  key: string;
  kind: TopicKind;
  /** Display and serialized name; editable for new topics. */
  name: string;
  /** New topics only. */
  description: string | null;
  /** Existing: its id. New with a taken name: the id of the topic holding it. */
  existingId: number | null;
  /** Existing (and taken): that topic's area. */
  areaId: number | null;
  archived: boolean;
  openCount: number | null;
  /** New topics: kept or not. Existing and unknown topics are not toggled. */
  accepted: boolean;
  /** New topic whose name another topic holds (reported by the server). */
  taken: boolean;
  /** The name the server reported taken; `taken` holds while the name matches it (ruling L14). */
  takenName: string | null;
  /** Client validation message after a rename. */
  nameError: string | null;
  /** From a 422. */
  error: string | null;
}

export type RowLock = 'missing' | 'moved';

export interface DraftRow {
  /** `a:<todo_id>`. */
  key: string;
  todoId: number;
  title: string;
  completed: boolean;
  currentTopic: TopicRef | null;
  /** Topic key. */
  target: string;
  accepted: boolean;
  /** Can never be applied: deleted, or moved to another area. */
  lock: RowLock | null;
  /** Unchecked by its new topic's uncheck; restored when the topic is re-checked. */
  cascaded: boolean;
  origin: 'proposal' | 'unassigned';
  error: string | null;
}

export interface DraftNote {
  /** The topic's key. */
  key: string;
  proposed: string;
  current: string | null;
  /** The text to apply (the proposed text, possibly edited). */
  text: string;
  accepted: boolean;
  cascaded: boolean;
  error: string | null;
}

/** A todo the proposal would create. */
export interface DraftNewTodo {
  /** `n:<index>` into the stored `new_todos`. */
  key: string;
  index: number;
  todo: ProposedTodo;
  /** Topic key; null = No topic. */
  target: string | null;
  accepted: boolean;
  /** The topic key a cascade moved it off, so it can go back. */
  movedFrom: string | null;
  /** The proposed topic name, when that topic no longer exists. */
  missingTopic: string | null;
  error: string | null;
}

/** A new todo's target when it has no topic. */
export const NO_TOPIC = null;

export interface Draft {
  proposalId: number;
  areaId: number;
  topics: DraftTopic[];
  rows: DraftRow[];
  notes: DraftNote[];
  newTodos: DraftNewTodo[];
  areaTopics: TopicWithCounts[];
  unassigned: Array<{ id: number; title: string }>;
  /**
   * Normalized names that rename checks refuse (spec §6.3 rule 4): every
   * area topic and every resolved topic that is not a still-free new name.
   * A new topic's own name is not listed (it is checked through `topics`,
   * which skips the topic being renamed), unless the server reported the name
   * taken, because then another topic really holds it.
   */
  knownNames: string[];
  /** 422 errors whose path is not an item (`''`, `area_id`). */
  pageErrors: string[];
  nextSeq: number;
}

/** An area topic as a draft topic. Exported for the reducer (Task 3). */
export const draftTopicFromArea = (t: TopicWithCounts): DraftTopic => ({
  key: `t:${t.id}`,
  kind: 'existing',
  name: t.name,
  description: null,
  existingId: t.id,
  areaId: t.area_id,
  archived: t.archived,
  openCount: t.open_count,
  accepted: true,
  taken: false,
  takenName: null,
  nameError: null,
  error: null,
});

export const findTopic = (draft: Draft, key: string): DraftTopic | undefined => draft.topics.find((t) => t.key === key);

/** Rows and notes can go to: an existing topic in the proposal's area, or a kept new topic. */
export const topicUsable = (draft: Draft, key: string): boolean => {
  const topic = findTopic(draft, key);
  if (!topic) return false;
  if (topic.kind === 'new') return topic.accepted;
  if (topic.kind === 'existing') return topic.areaId === draft.areaId;
  return false;
};

export const rowCheckable = (draft: Draft, row: DraftRow): boolean => row.lock === null && topicUsable(draft, row.target);

/** Why a row cannot be applied as it stands, or null. */
export const rowReason = (draft: Draft, row: DraftRow): string | null => {
  if (row.lock === 'missing') return 'Todo deleted';
  if (row.lock === 'moved') return 'Moved to another area';
  const topic = findTopic(draft, row.target);
  if (!topic || topic.kind === 'unknown') return 'Topic not found';
  if (topic.kind === 'existing' && topic.areaId !== draft.areaId) return 'Topic is in another area';
  if (topic.kind === 'new' && !topic.accepted) return 'needs a topic';
  return null;
};

export const isRowIncluded = (draft: Draft, row: DraftRow) => row.accepted && rowCheckable(draft, row);
export const isNoteIncluded = (draft: Draft, note: DraftNote) => note.accepted && topicUsable(draft, note.key);

/** "N of M accepted": rows, new topics, note edits and new todos. */
export const counts = (draft: Draft) => {
  const newTopics = draft.topics.filter((t) => t.kind === 'new');
  return {
    total: draft.rows.length + newTopics.length + draft.notes.length + draft.newTodos.length,
    accepted:
      draft.rows.filter((r) => isRowIncluded(draft, r)).length +
      newTopics.filter((t) => t.accepted).length +
      draft.notes.filter((n) => isNoteIncluded(draft, n)).length +
      draft.newTodos.filter((t) => t.accepted).length,
  };
};

const hasNameProblem = (topic: DraftTopic) => topic.kind === 'new' && topic.accepted && (topic.taken || topic.nameError !== null);

/** Why Apply is disabled, or null. */
export const applyBlocker = (draft: Draft): string | null => {
  if (counts(draft).accepted === 0) return 'Nothing accepted. Reject instead.';
  const bad = draft.topics.filter(hasNameProblem).length;
  if (bad === 1) return 'Fix 1 topic name first.';
  if (bad > 1) return `Fix ${bad} topic names first.`;
  return null;
};

/** New todos with no topic. */
export const noTopicTodos = (draft: Draft): DraftNewTodo[] => draft.newTodos.filter((t) => t.target === NO_TOPIC);

/**
 * Topics shown as sections: every new topic, and any topic with a row, note
 * or new todo.
 * An existing topic whose rows were all redirected away is hidden (ruling L12;
 * spec §6.2 says one section per topic).
 */
export const sections = (draft: Draft): DraftTopic[] =>
  draft.topics.filter(
    (t) => t.kind === 'new' || draft.rows.some((r) => r.target === t.key) || draft.notes.some((n) => n.key === t.key) ||
      draft.newTodos.some((n) => n.target === t.key)
  );

/** Row targets: the area's active topics, then kept new topics without name problems. */
export const targetOptions = (draft: Draft): Array<{ key: string; name: string }> => [
  ...draft.areaTopics.map((t) => ({ key: `t:${t.id}`, name: t.name })),
  ...draft.topics.filter((t) => t.kind === 'new' && t.accepted && !hasNameProblem(t)).map((t) => ({ key: t.key, name: t.name })),
];

/** A new or renamed topic name's problem, or null. `exceptKey` is the topic being renamed. */
export const validateTopicName = (draft: Draft, name: string, exceptKey?: string): string | null => {
  const trimmed = name.trim();
  if (!trimmed) return 'A topic needs a name.';
  if (trimmed.length > TOPIC_NAME_MAX) return `Topic names are at most ${TOPIC_NAME_MAX} characters.`;
  const normalized = normName(trimmed);
  const clashes =
    draft.knownNames.includes(normalized) ||
    draft.topics.some((t) => t.key !== exceptKey && t.kind === 'new' && normName(t.name) === normalized);
  return clashes ? `A topic named "${trimmed}" already exists.` : null;
};

/** A taken new topic can become the existing one only when that topic is in this area. */
export const canUseExisting = (draft: Draft, topic: DraftTopic) =>
  topic.kind === 'new' && topic.taken && topic.existingId !== null && topic.areaId === draft.areaId;

/** Builds the review draft. Everything apply would accept starts accepted. */
export const initDraft = (resolved: ResolvedProposal): Draft => {
  const { payload } = resolved.proposal;
  const areaId = payload.area_id;
  let seq = 0;
  const keyByName = new Map<string, string>();

  const topics: DraftTopic[] = resolved.topics.map((ref) => {
    const normalized = normName(ref.name);
    const proposed = payload.new_topics.find((t) => normName(t.name) === normalized);
    const key = ref.is_new ? `n:${seq++}` : ref.exists && ref.id !== null ? `t:${ref.id}` : `u:${normalized}`;
    keyByName.set(normalized, key);
    return {
      key,
      kind: ref.is_new ? 'new' : ref.exists ? 'existing' : 'unknown',
      name: ref.is_new ? (proposed?.name ?? ref.name) : ref.name,
      description: proposed?.description ?? null,
      existingId: ref.id,
      areaId: ref.area_id,
      archived: ref.archived ?? false,
      openCount: ref.open_count,
      accepted: true,
      taken: ref.is_new && ref.exists,
      takenName: ref.is_new && ref.exists ? ref.name : null,
      nameError: null,
      error: null,
    };
  });

  const keyFor = (name: string): string => {
    const normalized = normName(name);
    const known = keyByName.get(normalized);
    if (known) return known;
    const key = `u:${normalized}`;
    keyByName.set(normalized, key);
    topics.push({
      key, kind: 'unknown', name: name.trim(), description: null, existingId: null, areaId: null,
      archived: false, openCount: null, accepted: true, taken: false, takenName: null, nameError: null, error: null,
    });
    return key;
  };

  const rows: DraftRow[] = resolved.assignments.map((a) => ({
    key: `a:${a.todo_id}`,
    todoId: a.todo_id,
    title: a.title ?? `Todo #${a.todo_id}`,
    completed: a.completed ?? false,
    currentTopic: a.current_topic,
    target: keyFor(a.topic),
    accepted: false,
    lock: a.missing ? 'missing' : a.area_id !== null && a.area_id !== areaId ? 'moved' : null,
    cascaded: false,
    origin: 'proposal',
    error: null,
  }));

  const notes: DraftNote[] = resolved.note_edits.map((n) => ({
    key: keyFor(n.topic),
    proposed: n.status_note,
    current: n.current_status_note,
    text: n.status_note,
    accepted: false,
    cascaded: false,
    error: null,
  }));

  // A new todo's topic: a key, or No topic when it has none or no longer exists.
  const newTodos: DraftNewTodo[] = (resolved.new_todos ?? []).map((todo, index) => {
    const known = todo.topic === null ? undefined : keyByName.get(normName(todo.topic));
    const topic = known === undefined ? undefined : topics.find((t) => t.key === known);
    // Unknown, or an existing topic now in another area (apply would refuse it): No topic.
    // An archived topic in this area stays: apply allows it.
    const missing =
      todo.topic !== null && (!topic || topic.kind === 'unknown' || (topic.kind === 'existing' && topic.areaId !== areaId));
    return {
      key: `n:${index}`,
      index,
      todo,
      target: missing ? NO_TOPIC : (known ?? NO_TOPIC),
      accepted: true,
      movedFrom: null,
      missingTopic: missing ? todo.topic : null,
      error: null,
    };
  });

  // Ruling L10: all resolved names count, except a still-free new name, which
  // is checked via `topics` so renaming that topic to its own name is allowed.
  const knownNames = [
    ...resolved.area_topics.map((t) => normName(t.name)),
    ...resolved.topics.filter((t) => !t.is_new || t.exists).map((t) => normName(t.name)),
  ];

  const draft: Draft = {
    proposalId: resolved.proposal.id,
    areaId,
    topics,
    rows,
    notes,
    newTodos,
    areaTopics: resolved.area_topics,
    unassigned: resolved.unassigned,
    knownNames: [...new Set(knownNames)],
    pageErrors: [],
    nextSeq: seq,
  };

  return {
    ...draft,
    rows: draft.rows.map((r) => ({ ...r, accepted: rowCheckable(draft, r) })),
    notes: draft.notes.map((n) => ({ ...n, accepted: topicUsable(draft, n.key) })),
  };
};

// ── Reducer ───────────────────────────────────────────────────────────

/** 422 paths map back through this: the draft key at each submitted index. */
export interface PathIndex {
  new_topics: string[];
  assignments: string[];
  note_edits: string[];
  new_todos: string[];
}

export type DraftAction =
  | { type: 'toggleRow'; key: string }
  | { type: 'redirectRow'; key: string; target: string }
  | { type: 'toggleTopic'; key: string }
  | { type: 'rejectSection'; key: string }
  | { type: 'renameTopic'; key: string; name: string }
  | { type: 'describeTopic'; key: string; description: string }
  | { type: 'useExisting'; key: string }
  | { type: 'addTopic'; name: string; rowKey?: string; unassignedTodoId?: number; newTodoKey?: string }
  | { type: 'toggleNewTodo'; key: string }
  | { type: 'redirectNewTodo'; key: string; target: string | null }
  | { type: 'toggleNote'; key: string }
  | { type: 'editNote'; key: string; text: string }
  | { type: 'setUnassigned'; todoId: number; target: string | null }
  | { type: 'attachErrors'; errors: Array<{ path: string; reason: string }>; pathIndex: PathIndex };

const mapRows = (draft: Draft, fn: (row: DraftRow) => DraftRow): Draft => ({ ...draft, rows: draft.rows.map(fn) });
const mapNotes = (draft: Draft, fn: (note: DraftNote) => DraftNote): Draft => ({ ...draft, notes: draft.notes.map(fn) });
const mapNewTodos = (draft: Draft, fn: (todo: DraftNewTodo) => DraftNewTodo): Draft => ({ ...draft, newTodos: draft.newTodos.map(fn) });
const mapTopic = (draft: Draft, key: string, fn: (topic: DraftTopic) => DraftTopic): Draft => ({
  ...draft,
  topics: draft.topics.map((t) => (t.key === key ? fn(t) : t)),
});

/** Adds an area topic (`t:<id>`) to the draft the first time a row is sent to it. */
const ensureTopic = (draft: Draft, key: string): Draft => {
  if (findTopic(draft, key)) return draft;
  const areaTopic = draft.areaTopics.find((t) => `t:${t.id}` === key);
  return areaTopic ? { ...draft, topics: [...draft.topics, draftTopicFromArea(areaTopic)] } : draft;
};

const redirect = (draft: Draft, rowKey: string, target: string): Draft => {
  const next = ensureTopic(draft, target);
  return mapRows(next, (r) =>
    r.key === rowKey
      ? { ...r, target, cascaded: false, error: null, accepted: r.lock === null && topicUsable(next, target) }
      : r
  );
};

/**
 * Sends a new todo to a topic or to No topic. A target that is not usable is
 * refused, so a new todo never points at a dropped or missing topic (its name
 * would serialize as '' and 422). David's choice also forgets `movedFrom`.
 */
const redirectNewTodo = (draft: Draft, todoKey: string, target: string | null): Draft => {
  const next = target === NO_TOPIC ? draft : ensureTopic(draft, target);
  if (target !== NO_TOPIC && !topicUsable(next, target)) return draft;
  return mapNewTodos(next, (t) => (t.key === todoKey ? { ...t, target, movedFrom: null, error: null } : t));
};

const setUnassigned = (draft: Draft, todoId: number, target: string | null): Draft => {
  const without = { ...draft, rows: draft.rows.filter((r) => !(r.origin === 'unassigned' && r.todoId === todoId)) };
  if (target === null) return without;
  const next = ensureTopic(without, target);
  const todo = draft.unassigned.find((t) => t.id === todoId);
  if (!todo) return draft;
  const row: DraftRow = {
    key: `a:${todoId}`, todoId, title: todo.title, completed: false, currentTopic: null, target,
    accepted: topicUsable(next, target), lock: null, cascaded: false, origin: 'unassigned', error: null,
  };
  return { ...next, rows: [...next.rows, row] };
};

const toggleTopic = (draft: Draft, key: string): Draft => {
  const topic = findTopic(draft, key);
  if (!topic || topic.kind !== 'new') return draft;
  const keep = !topic.accepted;
  const next = mapTopic(draft, key, (t) => ({ ...t, accepted: keep, error: null }));
  // Ruling L9: the cascade touches the item, so its error goes. Only items the
  // cascade itself unchecked are restored on re-check (spec §6.3 rule 2).
  const cascade = <T extends { accepted: boolean; cascaded: boolean; error: string | null }>(item: T): T =>
    keep
      ? item.cascaded ? { ...item, accepted: true, cascaded: false, error: null } : { ...item, error: null }
      : item.accepted ? { ...item, accepted: false, cascaded: true, error: null } : { ...item, error: null };
  // Decision 6: a dropped new topic does not drop its new todos; they go to No
  // topic and, on re-check, only those still there come back (spec §7).
  const withTodos = mapNewTodos(next, (t) => {
    if (!keep) return t.target === key ? { ...t, target: NO_TOPIC, movedFrom: key, error: null } : t;
    return t.target === NO_TOPIC && t.movedFrom === key ? { ...t, target: key, movedFrom: null, error: null } : t;
  });
  return mapNotes(
    mapRows(withTodos, (r) => (r.target === key ? cascade(r) : r)),
    (n) => (n.key === key ? cascade(n) : n)
  );
};

/** Turns a taken new topic into the existing one it collides with; its rows and note follow. */
const mergeIntoExisting = (draft: Draft, key: string): Draft => {
  const topic = findTopic(draft, key);
  if (!topic || !canUseExisting(draft, topic) || topic.existingId === null) return draft;
  const newKey = `t:${topic.existingId}`;
  const areaTopic = draft.areaTopics.find((t) => t.id === topic.existingId);
  const replacement: DraftTopic = areaTopic
    ? draftTopicFromArea(areaTopic)
    : { ...topic, key: newKey, kind: 'existing', description: null, taken: false, takenName: null, nameError: null, error: null, accepted: true };
  const topics = findTopic(draft, newKey)
    ? draft.topics.filter((t) => t.key !== key)
    : draft.topics.map((t) => (t.key === key ? replacement : t));
  const moved: Draft = { ...draft, topics };
  return {
    ...mapNewTodos(moved, (t) =>
      t.target === key
        ? { ...t, target: newKey, error: null }
        : t.target === NO_TOPIC && t.movedFrom === key
          ? { ...t, target: newKey, movedFrom: null, error: null }
          : t
    ),
    rows: moved.rows.map((r) =>
      r.target === key ? { ...r, target: newKey, accepted: r.lock === null && (r.accepted || r.cascaded), cascaded: false, error: null } : r
    ),
    notes: moved.notes
      .filter((n) => !(n.key === newKey && moved.notes.some((m) => m.key === key)))
      .map((n) => (n.key === key ? { ...n, key: newKey, accepted: n.accepted || n.cascaded, cascaded: false, error: null } : n)),
  };
};

const addTopic = (draft: Draft, name: string, rowKey?: string, unassignedTodoId?: number, newTodoKey?: string): Draft => {
  if (validateTopicName(draft, name) !== null) return draft;
  const key = `n:${draft.nextSeq}`;
  const topic: DraftTopic = {
    key, kind: 'new', name: name.trim(), description: null, existingId: null, areaId: null,
    archived: false, openCount: null, accepted: true, taken: false, takenName: null, nameError: null, error: null,
  };
  let next: Draft = { ...draft, topics: [...draft.topics, topic], nextSeq: draft.nextSeq + 1 };
  if (rowKey) next = redirect(next, rowKey, key);
  if (unassignedTodoId !== undefined) next = setUnassigned(next, unassignedTodoId, key);
  if (newTodoKey) next = redirectNewTodo(next, newTodoKey, key);
  return recheckNames(next);
};

/**
 * Recomputes every new topic's `nameError` against the current names, so an
 * error goes once its cause does (final review M3). A topic still on its
 * server-reported taken name keeps `taken` and no `nameError` (ruling L14).
 */
const recheckNames = (draft: Draft): Draft => ({
  ...draft,
  topics: draft.topics.map((t) => {
    if (t.kind !== 'new' || t.taken) return t;
    const nameError = validateTopicName(draft, t.name, t.key);
    return nameError === t.nameError ? t : { ...t, nameError };
  }),
});

/**
 * The in-place name field is the "Rename" (spec §6.2). A taken topic stays
 * taken (and keeps Use existing) while its name matches the original taken
 * name; once it differs, plain name validation applies (ruling L14). Every
 * other new topic's name is then rechecked.
 */
const renameTopic = (draft: Draft, key: string, name: string): Draft =>
  recheckNames(
    mapTopic(draft, key, (t) => {
      if (t.kind !== 'new') return t;
      const stillTaken = t.takenName !== null && normName(name) === normName(t.takenName);
      return { ...t, name, taken: stillTaken, nameError: null, error: null };
    })
  );

/** Applies one user action. Every action clears the error of the item it touches. */
export const draftReducer = (draft: Draft, action: DraftAction): Draft => {
  switch (action.type) {
    case 'toggleRow':
      return mapRows(draft, (r) =>
        r.key === action.key && rowCheckable(draft, r) ? { ...r, accepted: !r.accepted, cascaded: false, error: null } : r
      );
    case 'redirectRow':
      return redirect(draft, action.key, action.target);
    case 'toggleTopic':
      return toggleTopic(draft, action.key);
    case 'rejectSection': {
      const next = mapTopic(draft, action.key, (t) => (t.kind === 'new' ? { ...t, accepted: false, error: null } : t));
      // Like unchecking, but not cascaded: the new todos of a rejected new topic go to No topic for good.
      const withTodos =
        findTopic(draft, action.key)?.kind === 'new'
          ? mapNewTodos(next, (t) => (t.target === action.key ? { ...t, target: NO_TOPIC, movedFrom: null, error: null } : t))
          : next;
      return mapNotes(
        mapRows(withTodos, (r) => (r.target === action.key ? { ...r, accepted: false, cascaded: false, error: null } : r)),
        (n) => (n.key === action.key ? { ...n, accepted: false, cascaded: false, error: null } : n)
      );
    }
    case 'renameTopic':
      return renameTopic(draft, action.key, action.name);
    case 'describeTopic':
      return mapTopic(draft, action.key, (t) => (t.kind === 'new' ? { ...t, description: action.description, error: null } : t));
    case 'useExisting':
      return mergeIntoExisting(draft, action.key);
    case 'addTopic':
      return addTopic(draft, action.name, action.rowKey, action.unassignedTodoId, action.newTodoKey);
    case 'toggleNewTodo':
      return mapNewTodos(draft, (t) => (t.key === action.key ? { ...t, accepted: !t.accepted, error: null } : t));
    case 'redirectNewTodo':
      return redirectNewTodo(draft, action.key, action.target);
    case 'toggleNote':
      return mapNotes(draft, (n) =>
        n.key === action.key && topicUsable(draft, n.key) ? { ...n, accepted: !n.accepted, cascaded: false, error: null } : n
      );
    case 'editNote':
      // Ruling L11: an edited note is the user's own, so a later re-check of its topic leaves it alone.
      return mapNotes(draft, (n) => (n.key === action.key ? { ...n, text: action.text, cascaded: false, error: null } : n));
    case 'setUnassigned':
      return setUnassigned(draft, action.todoId, action.target);
    case 'attachErrors':
      return attachErrors(draft, action.errors, action.pathIndex);
  }
};

// ── Serialize and errors ──────────────────────────────────────────────

/** The `accepted` payload for apply, and the draft key behind each index. */
export const serialize = (draft: Draft): { accepted: TopicChangesPayload; pathIndex: PathIndex } => {
  const nameOf = (key: string) => (findTopic(draft, key)?.name ?? '').trim();
  const newTopics = draft.topics.filter((t) => t.kind === 'new' && t.accepted);
  const rows = draft.rows.filter((r) => isRowIncluded(draft, r));
  const notes = draft.notes.filter((n) => isNoteIncluded(draft, n));
  const newTodos = draft.newTodos.filter((t) => t.accepted);
  return {
    accepted: {
      area_id: draft.areaId,
      new_topics: newTopics.map((t) => ({ name: t.name.trim(), description: t.description?.trim() ? t.description.trim() : null })),
      assignments: rows.map((r) => ({ todo_id: r.todoId, topic: nameOf(r.target) })),
      note_edits: notes.map((n) => ({ topic: nameOf(n.key), status_note: n.text })),
      // Apply wants every field echoed as resolved; only the topic may differ.
      new_todos: newTodos.map((t) => ({ ...t.todo, topic: t.target === NO_TOPIC ? null : nameOf(t.target) })),
    },
    pathIndex: {
      new_topics: newTopics.map((t) => t.key),
      assignments: rows.map((r) => r.key),
      note_edits: notes.map((n) => n.key),
      new_todos: newTodos.map((t) => t.key),
    },
  };
};

const ITEM_PATH = /^(new_topics|assignments|note_edits|new_todos)\[(\d+)\]/;

/**
 * Puts a 422's `{ path, reason }` items on the draft items they index, using
 * the pathIndex from the serialize that produced the request. Errors are
 * replaced, not merged. Paths that name no item go to `pageErrors`.
 */
export const attachErrors = (draft: Draft, errors: Array<{ path: string; reason: string }>, pathIndex: PathIndex): Draft => {
  const cleared: Draft = {
    ...draft,
    topics: draft.topics.map((t) => ({ ...t, error: null })),
    rows: draft.rows.map((r) => ({ ...r, error: null })),
    notes: draft.notes.map((n) => ({ ...n, error: null })),
    newTodos: draft.newTodos.map((t) => ({ ...t, error: null })),
    pageErrors: [],
  };
  return errors.reduce<Draft>((d, { path, reason }) => {
    const match = ITEM_PATH.exec(path);
    const list = match?.[1] as keyof PathIndex | undefined;
    const key = match && list ? pathIndex[list][Number(match[2])] : undefined;
    if (list === 'new_topics' && key) return { ...d, topics: d.topics.map((t) => (t.key === key ? { ...t, error: reason } : t)) };
    if (list === 'assignments' && key) return { ...d, rows: d.rows.map((r) => (r.key === key ? { ...r, error: reason } : r)) };
    if (list === 'note_edits' && key) return { ...d, notes: d.notes.map((n) => (n.key === key ? { ...n, error: reason } : n)) };
    if (list === 'new_todos' && key) return { ...d, newTodos: d.newTodos.map((t) => (t.key === key ? { ...t, error: reason } : t)) };
    return { ...d, pageErrors: [...d.pageErrors, path ? `${path}: ${reason}` : reason] };
  }, cleared);
};

export const hasErrors = (draft: Draft): boolean =>
  draft.pageErrors.length > 0 ||
  draft.topics.some((t) => t.error !== null) ||
  draft.rows.some((r) => r.error !== null) ||
  draft.notes.some((n) => n.error !== null) ||
  draft.newTodos.some((t) => t.error !== null);

/** "2 new todos, 2 new topics, 38 assignments, 1 note" (zero parts omitted). */
export const summarizeAccepted = (payload: TopicChangesPayload): string => {
  const part = (n: number, one: string, many: string) => (n === 0 ? null : `${n} ${n === 1 ? one : many}`);
  return [
    part(payload.new_todos?.length ?? 0, 'new todo', 'new todos'),
    part(payload.new_topics.length, 'new topic', 'new topics'),
    part(payload.assignments.length, 'assignment', 'assignments'),
    part(payload.note_edits.length, 'note', 'notes'),
  ]
    .filter((p): p is string => p !== null)
    .join(', ');
};
