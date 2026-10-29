import { useEffect, useState } from 'react';

/** Below Tailwind's `sm` breakpoint (640px). */
const PHONE_QUERY = '(max-width: 639px)';

const matches = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(PHONE_QUERY).matches
    : false;

/**
 * True while the viewport is phone-width. For the few places that need a JS
 * breakpoint (layout alone should use Tailwind's `sm:`). False when
 * `matchMedia` is missing, as in jsdom.
 */
export const useIsPhone = (): boolean => {
  const [isPhone, setIsPhone] = useState(matches);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(PHONE_QUERY);
    const onChange = () => setIsPhone(query.matches);
    onChange();
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return isPhone;
};
