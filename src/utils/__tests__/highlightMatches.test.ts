import { describe, it, expect } from 'vitest';
import { highlightMatches } from '../highlightMatches';

describe('highlightMatches', () => {
  it('splits text around a partial-word match', () => {
    expect(highlightMatches('Draft Q1 budget', 'budg')).toEqual([
      { text: 'Draft Q1 ', match: false },
      { text: 'budg', match: true },
      { text: 'et', match: false },
    ]);
  });

  it('is case-insensitive and preserves original case', () => {
    expect(highlightMatches('Draft BUDGET', 'budget')).toEqual([
      { text: 'Draft ', match: false },
      { text: 'BUDGET', match: true },
    ]);
  });

  it('marks every occurrence of a word', () => {
    expect(highlightMatches('a b a', 'a')).toEqual([
      { text: 'a', match: true },
      { text: ' b ', match: false },
      { text: 'a', match: true },
    ]);
  });

  it('merges overlapping matches from different words', () => {
    expect(highlightMatches('abcdef', 'bcd cde')).toEqual([
      { text: 'a', match: false },
      { text: 'bcde', match: true },
      { text: 'f', match: false },
    ]);
  });

  it('merges adjacent matches', () => {
    expect(highlightMatches('abcd', 'ab cd')).toEqual([{ text: 'abcd', match: true }]);
  });

  it('treats regex metacharacters literally', () => {
    expect(highlightMatches('50% (off)', '(off')).toEqual([
      { text: '50% ', match: false },
      { text: '(off', match: true },
      { text: ')', match: false },
    ]);
  });

  it('returns one unmatched segment for a blank query', () => {
    expect(highlightMatches('Draft', '   ')).toEqual([{ text: 'Draft', match: false }]);
    expect(highlightMatches('Draft', '')).toEqual([{ text: 'Draft', match: false }]);
  });

  it('returns one unmatched segment when nothing matches', () => {
    expect(highlightMatches('Draft', 'zzz')).toEqual([{ text: 'Draft', match: false }]);
  });

  it('returns no segments for empty text', () => {
    expect(highlightMatches('', 'a')).toEqual([]);
  });
});
