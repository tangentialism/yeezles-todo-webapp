/**
 * Splits text into matched and unmatched segments for search highlighting.
 * Mirrors the backend search: the query is split on whitespace and each word
 * is a case-insensitive substring match.
 */

export interface HighlightSegment {
  text: string;
  match: boolean;
}

/**
 * Returns `text` as consecutive segments, with `match: true` on every
 * occurrence of any query word. Overlapping and adjacent matches merge into
 * one segment. Words are matched literally (no regex is built from input) and
 * original casing is preserved.
 */
export const highlightMatches = (text: string, query: string): HighlightSegment[] => {
  if (!text) return [];

  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const haystack = text.toLowerCase();
  const marked: boolean[] = new Array(text.length).fill(false);

  for (const word of words) {
    let from = haystack.indexOf(word);
    while (from !== -1) {
      marked.fill(true, from, from + word.length);
      from = haystack.indexOf(word, from + 1);
    }
  }

  const segments: HighlightSegment[] = [];
  let start = 0;
  for (let i = 1; i <= text.length; i++) {
    if (i === text.length || marked[i] !== marked[start]) {
      segments.push({ text: text.slice(start, i), match: marked[start] });
      start = i;
    }
  }
  return segments;
};
