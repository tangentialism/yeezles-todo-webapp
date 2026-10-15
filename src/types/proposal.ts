/**
 * Proposal types (topics spec §4.3, §5.4–5.6, as shipped in yeezles-todo
 * #40). Mirrors `ResolvedProposal` in the backend's src/models/Proposal.ts.
 */
import type { TopicRef, TopicWithCounts } from './topic';

/** A todo the proposal would create; `topic` is a name or null (no topic). */
export interface ProposedTodo {
  title: string;
  description: string | null;
  due_date: string | null;
  is_today: boolean;
  completed: boolean;
  topic: string | null;
}

/** The topic-change payload, as stored (normalized) and as sent to apply. */
export interface TopicChangesPayload {
  area_id: number;
  new_topics: Array<{ name: string; description: string | null }>;
  assignments: Array<{ todo_id: number; topic: string }>;
  note_edits: Array<{ topic: string; status_note: string }>;
  /** Absent on rows stored before create proposals existed. */
  new_todos?: ProposedTodo[];
}

export type ProposalStatus = 'pending' | 'applied' | 'rejected';

/** A stored proposal row. `applied` is what apply wrote; null until applied. */
export interface ProposalRecord {
  id: number;
  user_id: number;
  kind: 'topic_changes';
  payload: TopicChangesPayload;
  status: ProposalStatus;
  /** The MCP client's name ("Claude"), or null for a REST-created proposal. */
  source: string | null;
  applied: TopicChangesPayload | null;
  created_at: string;
  resolved_at: string | null;
}

/** One row of `GET /proposals`: no payload. */
export interface ProposalRow {
  id: number;
  kind: 'topic_changes';
  status: ProposalStatus;
  source: string | null;
  created_at: string;
  resolved_at: string | null;
  summary: string;
}

/** One distinct topic name in the payload, resolved against live data. */
export interface ResolvedTopicRef {
  /** The live topic's spelling if it exists, else the payload's. */
  name: string;
  /** Listed in new_topics. */
  is_new: boolean;
  /** A topic of this name exists now. With is_new: the name was taken since. */
  exists: boolean;
  id: number | null;
  area_id: number | null;
  archived: boolean | null;
  open_count: number | null;
  done_count: number | null;
}

/** One proposed assignment, with the todo as it is now. */
export interface ResolvedAssignment {
  todo_id: number;
  /** The topic name as proposed. */
  topic: string;
  /** Deleted, or not the caller's; apply refuses it. */
  missing: boolean;
  title: string | null;
  completed: boolean | null;
  /** The todo's area now; differing from the proposal's means it moved. */
  area_id: number | null;
  current_topic: TopicRef | null;
}

export interface ResolvedNoteEdit {
  topic: string;
  status_note: string;
  current_status_note: string | null;
}

/** `GET /proposals/:id`. */
export interface ResolvedProposal {
  proposal: ProposalRecord;
  summary: string;
  /** Null when the area has since been deleted. */
  area: { id: number; name: string } | null;
  topics: ResolvedTopicRef[];
  assignments: ResolvedAssignment[];
  note_edits: ResolvedNoteEdit[];
  /** Always an array (`[]` for old rows); read this, not `proposal.payload`. */
  new_todos: ProposedTodo[];
  /** The area's active topics, for the per-row dropdown. */
  area_topics: TopicWithCounts[];
  /** Open, topic-less todos in the area that the payload does not name. */
  unassigned: Array<{ id: number; title: string }>;
}

/** `POST /proposals/:id/apply`. */
export interface ApplyResult {
  proposal: ProposalRecord;
  created_topics: TopicRef[];
  created_todos: Array<{ id: number; title: string }>;
}
