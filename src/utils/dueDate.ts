/**
 * Compact due-date labels for todo rows ("Today", "−3 days", "Thu 15", "Oct 26").
 */

export type DueKind = 'none' | 'overdue' | 'today' | 'soon' | 'later';

export interface DueInfo {
  kind: DueKind;
  /** Short label for the row's date column; empty when there is no due date. */
  label: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The calendar day the user picked, read from the date part of the stored
 * value so a UTC-midnight timestamp does not slip to the previous local day.
 */
const toCalendarDay = (value: string): number | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
};

/**
 * Classifies a todo's due date relative to `now` and formats its label.
 * @param dueDate - ISO date or datetime string, or null.
 * @param now - Reference time (defaults to the current time; injectable for tests).
 */
export const getDueInfo = (dueDate: string | null | undefined, now: Date = new Date()): DueInfo => {
  if (!dueDate) return { kind: 'none', label: '' };
  const due = toCalendarDay(dueDate);
  if (due === null) return { kind: 'none', label: '' };

  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((due - today) / DAY_MS);
  const date = new Date(due);

  if (diff < 0) {
    const days = -diff;
    return { kind: 'overdue', label: `−${days} ${days === 1 ? 'day' : 'days'}` };
  }
  if (diff === 0) return { kind: 'today', label: 'Today' };
  if (diff <= 6) {
    const weekday = date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
    return { kind: 'soon', label: `${weekday} ${date.getUTCDate()}` };
  }
  const sameYear = date.getUTCFullYear() === now.getFullYear();
  return {
    kind: 'later',
    label: date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      ...(sameYear ? {} : { year: 'numeric' }),
      timeZone: 'UTC',
    }),
  };
};
