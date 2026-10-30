/**
 * Person types: a name a todo can be tagged with, optionally linked to a
 * Peopler person (people spec §4). Shapes mirror the backend's `docs/api/API.md` § People.
 */

/** The `{ id, display_name, peopler_id, peopler_url }` the backend attaches to every todo as `people[]`. */
export interface TodoPerson {
  id: number;
  display_name: string;
  peopler_id: number | null;
  peopler_url: string | null;
}

/** A person row as returned by create, update and merge. */
export interface Person extends TodoPerson {
  user_id: number;
  aliases: string[];
  created_at: string;
  updated_at: string;
}

/** A person with their open and done todo counts, as returned by list and get. */
export interface PersonWithCounts extends Person {
  open_count: number;
  done_count: number;
}

/** Request body for `POST /people`. Linking (`peopler_id`) is phase 4. */
export interface CreatePersonRequest {
  display_name: string;
  aliases?: string[];
}

/** Request body for `PUT /people/:id`. Absent keys are left alone; `aliases: []` clears. */
export interface UpdatePersonRequest {
  display_name?: string;
  aliases?: string[];
}

/** A person ref that names an existing person by id: what the webapp sends most. */
export interface PersonIdRef {
  person_id: number;
}

/**
 * A person reference in a proposal (people spec §5). The webapp only ever
 * sends `{ person_id }`, `{ create }` and `{ link }`; `{ peopler_id, name? }`
 * and `{ name }` arrive from MCP callers and are resolved by the server.
 */
export type PersonRef =
  | PersonIdRef
  | { peopler_id: number; name?: string }
  | { name: string }
  | { create: { name: string; peopler_id?: number } }
  | { link: { person_id: number; peopler_id: number } };

/** A candidate person the review chooser offers, with the counts that tell people apart. */
export interface PersonCandidateDetail {
  id: number;
  display_name: string;
  aliases: string[];
  peopler_id: number | null;
  open_count: number;
  done_count: number;
  latest_open_title: string | null;
}
