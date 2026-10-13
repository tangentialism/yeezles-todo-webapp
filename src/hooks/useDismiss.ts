import { useEffect } from 'react';
import type { RefObject } from 'react';

/**
 * Calls `onDismiss` when the user presses Escape or presses the pointer down
 * outside every element in `refs`. Used by menus and popovers.
 *
 * @param refs - Elements that count as "inside" (e.g. the trigger and the panel).
 * @param onDismiss - Called to close the surface.
 * @param enabled - Listeners are attached only while true (i.e. while open).
 */
export const useDismiss = (
  refs: RefObject<HTMLElement | null>[],
  onDismiss: () => void,
  enabled: boolean
) => {
  useEffect(() => {
    if (!enabled) return;

    const handlePointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (refs.every((ref) => !ref.current || !ref.current.contains(target))) {
        onDismiss();
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss();
    };

    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [refs, onDismiss, enabled]);
};
