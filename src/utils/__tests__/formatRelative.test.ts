import { describe, it, expect } from 'vitest';
import { formatRelative } from '../date';

const now = new Date('2026-10-13T12:00:00.000Z');
const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe('formatRelative', () => {
  it.each([
    [ago(20_000), 'just now'],
    [ago(MIN), '1 minute ago'],
    [ago(20 * MIN), '20 minutes ago'],
    [ago(HOUR), '1 hour ago'],
    [ago(5 * HOUR), '5 hours ago'],
    [ago(DAY), 'yesterday'],
    [ago(3 * DAY), '3 days ago'],
    [ago(40 * DAY), '40 days ago'],
  ])('%s reads %s', (iso, expected) => {
    expect(formatRelative(iso, now)).toBe(expected);
  });

  it('treats a future time as just now and an invalid one as empty', () => {
    expect(formatRelative(new Date(now.getTime() + HOUR).toISOString(), now)).toBe('just now');
    expect(formatRelative('nope', now)).toBe('');
  });
});
