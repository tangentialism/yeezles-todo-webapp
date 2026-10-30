import type { PeoplerLink } from '../types/peopler';

/** The two fields that say how a person is linked. `peopler_link` is absent on some candidates and old fixtures. */
interface LinkFields {
  peopler_id: number | null;
  peopler_link?: PeoplerLink;
}

/**
 * The link state of a person. Uses `peopler_link` when present; otherwise
 * (REST 409 candidates, which do not carry it) `ok` if there is a
 * `peopler_id` and `none` if not.
 */
export const peoplerLinkOf = (p: LinkFields): PeoplerLink => p.peopler_link ?? (p.peopler_id !== null ? 'ok' : 'none');

/** True when the link is working: the only state that gets the filled chip and "in Peopler". */
export const isFilledLink = (p: LinkFields): boolean => peoplerLinkOf(p) === 'ok';
