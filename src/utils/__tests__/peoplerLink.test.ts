import { describe, it, expect } from 'vitest';
import { isFilledLink, peoplerLinkOf } from '../peoplerLink';
import type { PeoplerLink } from '../../types/peopler';

describe('peoplerLinkOf', () => {
  it.each(['none', 'ok', 'stale', 'dormant'] as PeoplerLink[])('returns a stored %s unchanged', (link) => {
    expect(peoplerLinkOf({ peopler_id: 4, peopler_link: link })).toBe(link);
  });

  it('keeps dormant even with a peopler_id', () => {
    expect(peoplerLinkOf({ peopler_id: 4, peopler_link: 'dormant' })).toBe('dormant');
  });

  it('falls back to ok when linked and no peopler_link is present', () => {
    expect(peoplerLinkOf({ peopler_id: 4 })).toBe('ok');
  });

  it('falls back to none when unlinked and no peopler_link is present', () => {
    expect(peoplerLinkOf({ peopler_id: null })).toBe('none');
  });
});

describe('isFilledLink', () => {
  it('is true only for ok', () => {
    expect(isFilledLink({ peopler_id: 1, peopler_link: 'ok' })).toBe(true);
    expect(isFilledLink({ peopler_id: 1, peopler_link: 'stale' })).toBe(false);
    expect(isFilledLink({ peopler_id: 1, peopler_link: 'dormant' })).toBe(false);
    expect(isFilledLink({ peopler_id: null, peopler_link: 'none' })).toBe(false);
    expect(isFilledLink({ peopler_id: 1 })).toBe(true);
  });
});
