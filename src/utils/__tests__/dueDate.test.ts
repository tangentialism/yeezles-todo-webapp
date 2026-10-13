import { describe, it, expect } from 'vitest';
import { getDueInfo } from '../dueDate';

// Tuesday, 13 October 2026, mid-afternoon local time
const NOW = new Date(2026, 9, 13, 15, 30);

describe('getDueInfo', () => {
  it('returns none for a missing or unparseable date', () => {
    expect(getDueInfo(null, NOW)).toEqual({ kind: 'none', label: '' });
    expect(getDueInfo('', NOW)).toEqual({ kind: 'none', label: '' });
    expect(getDueInfo('not a date', NOW)).toEqual({ kind: 'none', label: '' });
  });

  it('labels today, using the calendar day of a UTC-midnight timestamp', () => {
    expect(getDueInfo('2026-10-13', NOW)).toEqual({ kind: 'today', label: 'Today' });
    expect(getDueInfo('2026-10-13T00:00:00.000Z', NOW)).toEqual({ kind: 'today', label: 'Today' });
  });

  it('counts days overdue', () => {
    expect(getDueInfo('2026-10-12', NOW)).toEqual({ kind: 'overdue', label: '−1 day' });
    expect(getDueInfo('2026-10-09T00:00:00.000Z', NOW)).toEqual({ kind: 'overdue', label: '−4 days' });
  });

  it('uses weekday and day within the coming week', () => {
    expect(getDueInfo('2026-10-15', NOW)).toEqual({ kind: 'soon', label: 'Thu 15' });
    expect(getDueInfo('2026-10-19', NOW)).toEqual({ kind: 'soon', label: 'Mon 19' });
  });

  it('uses month and day further out, adding the year when it differs', () => {
    expect(getDueInfo('2026-10-26', NOW)).toEqual({ kind: 'later', label: 'Oct 26' });
    expect(getDueInfo('2027-01-04', NOW)).toEqual({ kind: 'later', label: 'Jan 4, 2027' });
  });
});
