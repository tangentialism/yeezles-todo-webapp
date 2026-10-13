/**
 * Topic types: a named group of todos inside one area, with a status note
 * (topics spec §4). Shapes mirror the backend's `docs/api/API.md`.
 */

/** The `{ id, name }` the backend attaches to every todo as `topic`. */
export interface TopicRef {
  id: number;
  name: string;
}

/** A topic row as returned by create, update and note. */
export interface Topic {
  id: number;
  user_id: number;
  area_id: number;
  name: string;
  /** What the topic is, in David's words. */
  description: string | null;
  /** Where it stands; written by David or, through a proposal, by Claude. */
  status_note: string | null;
  /** Set only by the note endpoint; a rename does not touch it. */
  status_note_updated_at: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

/** A topic with its todo counts (list and get). */
export interface TopicWithCounts extends Topic {
  open_count: number;
  done_count: number;
}

/** Body for `POST /topics`. */
export interface CreateTopicRequest {
  name: string;
  area_id: number;
  description?: string | null;
}

/** Body for `PUT /topics/:id`; never touches the note. */
export interface UpdateTopicRequest {
  name?: string;
  description?: string | null;
  area_id?: number;
  archived?: boolean;
}
