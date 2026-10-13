import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon } from './Icons';
import { iconButton } from './styles';

/** Props for {@link Dialog}. */
interface DialogProps {
  title: string;
  /** Colour dot before the title (e.g. the area being edited). */
  titleDotColor?: string;
  onClose: () => void;
  /** When true, Escape, the scrim and the close button do nothing (e.g. while saving). */
  closeDisabled?: boolean;
  children: React.ReactNode;
}

interface DialogEntry {
  onClose: () => void;
  closeDisabled: boolean;
}

/** Open dialogs, outermost first. Only the last one acts on Escape. */
const openDialogs: DialogEntry[] = [];

/** One document listener for all dialogs: the topmost handles Escape, even if disabled. */
const handleEscape = (event: KeyboardEvent) => {
  if (event.key !== 'Escape') return;
  const top = openDialogs[openDialogs.length - 1];
  if (top && !top.closeDisabled) top.onClose();
};

/**
 * Modal shell: dimmed scrim, centred panel with a serif title and close button.
 * Closes on Escape or a click on the scrim unless `closeDisabled` is set.
 */
const Dialog: React.FC<DialogProps> = ({ title, titleDotColor, onClose, closeDisabled = false, children }) => {
  const titleId = React.useId();

  // Escape is decided by the module-level stack below, not by listener order
  // or DOM presence, so it cannot fall through to a dialog underneath. The refs
  // keep the entry stable across re-renders that change onClose.
  const entryRef = React.useRef<DialogEntry>({ onClose, closeDisabled });
  useEffect(() => {
    entryRef.current.onClose = onClose;
    entryRef.current.closeDisabled = closeDisabled;
  });
  useEffect(() => {
    const entry = entryRef.current;
    openDialogs.push(entry);
    if (openDialogs.length === 1) document.addEventListener('keydown', handleEscape);
    return () => {
      openDialogs.splice(openDialogs.indexOf(entry), 1);
      if (openDialogs.length === 0) document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  // Portalled to <body>: a dialog opened from inside the sticky, blurred
  // header would otherwise be positioned and clipped by it.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/30 px-3 sm:px-4 pt-[6vh] sm:pt-[8vh] pb-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !closeDisabled) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-[560px] rounded-[18px] bg-surface shadow-dialog animate-dialog-rise"
      >
        <div className="flex items-center justify-between pl-7 pr-[18px] pt-5 pb-1">
          <h2 id={titleId} className="flex items-center gap-3 font-serif font-medium text-2xl tracking-[-0.01em]">
            {titleDotColor && (
              <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full flex-none" style={{ backgroundColor: titleDotColor }} />
            )}
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={closeDisabled}
            aria-label="Close"
            className={iconButton}
          >
            <CloseIcon className="w-[18px] h-[18px]" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
};

export default Dialog;
