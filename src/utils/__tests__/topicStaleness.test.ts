import { describe, it, expect } from 'vitest';
import { isStale } from '../topicStaleness';

const now = new Date('2026-10-13T12:00:00.000Z');
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString();

describe('isStale', () => {
  it('is stale when open todos exist and the note is more than 14 days old', () => {
    expect(isStale({ open_count: 1, status_note: 'x', status_note_updated_at: daysAgo(15) }, now)).toBe(true);
  });

  it('is not stale at exactly 14 days', () => {
    expect(isStale({ open_count: 1, status_note: 'x', status_note_updated_at: daysAgo(14) }, now)).toBe(false);
  });

  it('is not stale with no open todos', () => {
    expect(isStale({ open_count: 0, status_note: 'x', status_note_updated_at: daysAgo(90) }, now)).toBe(false);
  });

  it('is not stale with no note', () => {
    expect(isStale({ open_count: 5, status_note: null, status_note_updated_at: daysAgo(90) }, now)).toBe(false);
    expect(isStale({ open_count: 5, status_note: 'x', status_note_updated_at: null }, now)).toBe(false);
  });
});
