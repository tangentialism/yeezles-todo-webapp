import { describe, it, expect } from 'vitest';
import { extractTags, stripTags } from '../todoText';

describe('todoText', () => {
  it('extracts tags including hyphenated ones', () => {
    expect(extractTags('Ship it @work @priority-1')).toEqual(['work', 'priority-1']);
    expect(extractTags('No tags here')).toEqual([]);
  });

  it('strips tags and collapses whitespace', () => {
    expect(stripTags('Send invoice @finance for September')).toBe('Send invoice for September');
    expect(stripTags('Plain title')).toBe('Plain title');
  });

  it('keeps the raw title when it is only tags', () => {
    expect(stripTags('@today')).toBe('@today');
  });
});
