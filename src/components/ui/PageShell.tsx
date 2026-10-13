import React from 'react';

/** Props for {@link PageShell}. */
interface PageShellProps {
  children: React.ReactNode;
  /** When set, the wordmark links here (e.g. back to the app). */
  homeHref?: string;
}

/**
 * Frame for full pages outside the dashboard (consent, Obsidian imports):
 * the paper ground with the wordmark in the same place as the app header.
 */
const PageShell: React.FC<PageShellProps> = ({ children, homeHref }) => {
  const wordmark = 'font-serif font-medium text-xl sm:text-[22px] tracking-[-0.01em] text-ink';
  return (
    <div className="min-h-screen bg-paper">
      <header className="max-w-[1120px] mx-auto px-5 sm:px-10 py-4 flex items-center">
        {homeHref ? (
          <a href={homeHref} className={`${wordmark} no-underline hover:text-ink-2`}>
            Yeezles
          </a>
        ) : (
          <span className={wordmark}>Yeezles</span>
        )}
      </header>
      {children}
    </div>
  );
};

export default PageShell;
