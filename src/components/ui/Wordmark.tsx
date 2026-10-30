import React from 'react';

/** Props for {@link Wordmark}. */
interface WordmarkProps {
  /** Type styles for the word; the mark scales with the font size. */
  className?: string;
}

/**
 * The Yeezles lockup: the Rising Hash mark in front of the wordmark.
 * Geometry is `docs/brand/yeezles-mark.svg` in the workspace repo; never redraw it.
 * The mark is 1.1em tall with a 0.4em gap, so it sits at the height of the letters
 * at any size. It is decorative: assistive tech hears "Yeezles" once.
 */
const Wordmark: React.FC<WordmarkProps> = ({ className = '' }) => (
  <span className={`inline-flex items-center gap-[0.4em] ${className}`}>
    <svg aria-hidden="true" focusable="false" viewBox="7 12 86 83" className="h-[1.1em] w-auto flex-none">
      {/* Spaces: ink bars */}
      <path d="M12 42 H23 M51 42 H88 M12 68 H49 M77 68 H88" fill="none" className="stroke-ink" strokeWidth="10" strokeLinecap="round" />
      {/* Topics: blue strands (the right strand passes under the top bar) */}
      <path d="M37 17 V54 M37 82 V90 M63 56 V90" fill="none" className="stroke-accent" strokeWidth="10" strokeLinecap="round" />
      {/* Today: the logo sun. Brand art, so the logo orange (--today-logo), not the UI's --today. */}
      <circle cx="63" cy="22" r="10" fill="#F4893A" />
    </svg>
    <span>Yeezles</span>
  </span>
);

export default Wordmark;
