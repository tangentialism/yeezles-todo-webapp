/**
 * The proposal review screen's state, as plain data and pure functions (spec
 * §6.3): initDraft builds it from GET /proposals/:id, draftReducer applies
 * user actions, serialize produces the `accepted` payload with a pathIndex,
 * and attachErrors maps a 422's paths back to items. Components only render
 * and dispatch.
 */
import type { ResolvedProposal } from '../types/proposal';
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

export interface Draft {
  proposalId: number;
  areaId: number;
  topics: DraftTopic[];
  rows: DraftRow[];
  notes: DraftNote[];
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

/** "N of M accepted": rows, new topics and note edits. */
export const counts = (draft: Draft) => {
  const newTopics = draft.topics.filter((t) => t.kind === 'new');
  return {
    total: draft.rows.length + newTopics.length + draft.notes.length,
    accepted:
      draft.rows.filter((r) => isRowIncluded(draft, r)).length +
      newTopics.filter((t) => t.accepted).length +
      draft.notes.filter((n) => isNoteIncluded(draft, n)).length,
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

/**
 * Topics shown as sections: every new topic, and any topic with a row or note.
 * An existing topic whose rows were all redirected away is hidden (ruling L12;
 * spec §6.2 says one section per topic).
 */
export const sections = (draft: Draft): DraftTopic[] =>
  draft.topics.filter(
    (t) => t.kind === 'new' || draft.rows.some((r) => r.target === t.key) || draft.notes.some((n) => n.key === t.key)
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
      archived: false, openCount: null, accepted: true, taken: false, nameError: null, error: null,
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
