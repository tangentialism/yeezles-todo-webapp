/**
 * Peopler connection types (people spec §4.4–§4.7). Shapes mirror the
 * backend's `docs/api/API.md` § Peopler.
 */

/**
 * How a person's Peopler link stands: `none` (not linked), `ok` (linked and
 * working), `stale` (the Peopler person is gone or changed), `dormant`
 * (linked, but Peopler is not connected so it cannot be used).
 */
export type PeoplerLink = 'none' | 'ok' | 'stale' | 'dormant';

/** The signed-in user's Peopler connection, as `GET /peopler/connection` answers. */
export type PeoplerConnection =
  | { connected: false }
  | {
      connected: true;
      status: 'ok' | 'broken';
      peopler_email: string;
      peopler_display_name: string | null;
      peopler_account_id: number;
      last_verified_at: string;
    };

/** One person found in the user's Peopler by `GET /peopler/search`. */
export interface PeoplerSearchResult {
  id: number;
  display_name: string;
  company: string | null;
  title: string | null;
  created_at: string;
  /** The id of the person here already linked to this Peopler person, if any. */
  already_linked_person_id: number | null;
}
