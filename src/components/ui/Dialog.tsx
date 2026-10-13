import React, { useEffect } from 'react';
import { CloseIcon } from './Icons';
import { iconButton } from './styles';

/** Props for {@link Dialog}. */
interface DialogProps {
  title: string;
  onClose: () => void;
  /** When true, Escape, the scrim and the close button do nothing (e.g. while saving). */
  closeDisabled?: boolean;
  children: React.ReactNode;
}

/**
 * Modal shell: dimmed scrim, centred panel with a serif title and close button.
 * Closes on Escape or a click on the scrim unless `closeDisabled` is set.
 */
const Dialog: React.FC<DialogProps> = ({ title, onClose, closeDisabled = false, children }) => {
  const titleId = React.useId();

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !closeDisabled) onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose, closeDisabled]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/30 px-4 pt-[8vh] pb-6"
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
          <h2 id={titleId} className="font-serif font-medium text-2xl tracking-[-0.01em]">
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
    </div>
  );
};

export default Dialog;
