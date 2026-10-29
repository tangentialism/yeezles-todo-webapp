import { useEffect, useState } from 'react';

/** How long typing must pause before a search runs. */
export const SEARCH_DEBOUNCE_MS = 200;

/** `value`, but only after it has stopped changing for `delayMs`. */
export const useDebouncedValue = <T>(value: T, delayMs: number = SEARCH_DEBOUNCE_MS): T => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
};
