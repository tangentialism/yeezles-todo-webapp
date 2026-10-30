/**
 * Vertical placement for popovers that hang under an anchor (the person
 * chooser, the people typeahead list).
 *
 * A fixed bar pinned over the bottom of the viewport (the proposal review's
 * Apply bar) marks itself with {@link VIEWPORT_FLOOR_ATTR}. Its top edge, not
 * the window's bottom, is then the lowest a popover may reach: anything below
 * it is painted over.
 */
export const VIEWPORT_FLOOR_ATTR = 'data-viewport-floor';

/** Space kept between a popover and the floor or the top of the window. */
const MARGIN = 8;

/** The lowest visible y: the window bottom, or the top of the highest fixed bar over it. */
export const viewportFloor = (): number => {
  let floor = window.innerHeight;
  document.querySelectorAll(`[${VIEWPORT_FLOOR_ATTR}]`).forEach((el) => {
    const rect = el.getBoundingClientRect();
    // A bar that is not laid out (no height) covers nothing.
    if (rect.height > 0) floor = Math.min(floor, rect.top);
  });
  return floor;
};

/**
 * Whether a popover measured at its natural place below its anchor should
 * open above it instead: it does when it would cross the floor and either
 * fits fully above, or has more room above than below.
 *
 * @param popover the popover's rect, measured while placed below the anchor
 * @param anchorTop the anchor's top edge (viewport y)
 * @param gap the space between anchor and popover (e.g. `mt-1` is 4)
 */
export const shouldOpenUpward = (popover: { top: number; bottom: number }, anchorTop: number, gap: number): boolean => {
  const floor = viewportFloor() - MARGIN;
  if (popover.bottom <= floor) return false;
  const height = popover.bottom - popover.top;
  const roomAbove = anchorTop - gap - MARGIN;
  const roomBelow = floor - popover.top;
  return roomAbove >= height || roomAbove > roomBelow;
};
