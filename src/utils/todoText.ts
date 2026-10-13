/**
 * Helpers for the inline `@tag` syntax used in todo titles.
 */

const TAG_PATTERN = /@(\w+(?:-\w+)*)/g;

/** Returns the tag names (without `@`) found in a title, in order. */
export const extractTags = (title: string): string[] => {
  return Array.from(title.matchAll(TAG_PATTERN), (match) => match[1]);
};

/**
 * Returns the title with `@tags` removed and whitespace collapsed, for display
 * next to the tags shown separately. Falls back to the raw title if stripping
 * would leave nothing (e.g. a title that is only tags).
 */
export const stripTags = (title: string): string => {
  const stripped = title.replace(TAG_PATTERN, '').replace(/\s+/g, ' ').trim();
  return stripped || title;
};
