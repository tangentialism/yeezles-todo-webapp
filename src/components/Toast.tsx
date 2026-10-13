import React, { useEffect, useState } from 'react';
import { TOAST_ENTRANCE_DELAY_MS, TOAST_EXIT_ANIMATION_MS } from '../constants';
import { CloseIcon } from './ui/Icons';

/** Data model for a single toast notification. */
export interface Toast {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  /** Auto-dismiss duration in ms. Set to 0 for sticky toasts. */
  duration?: number;
  /** Optional action button (e.g. "Undo") displayed alongside the message. */
  action?: {
    label: string;
    onClick: () => void;
  };
}

/** Props for {@link ToastComponent}. */
interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

/**
 * Individual toast notification with entrance/exit animations.
 * Renders a compact ink pill (success/info) or a tinted card (error/warning)
 * with the message, an optional action button, and a dismiss button. Auto-dismisses after the configured duration.
 */
const ToastComponent: React.FC<ToastProps> = ({ toast, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), TOAST_ENTRANCE_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast.duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onClose(toast.id), TOAST_EXIT_ANIMATION_MS); // Match exit animation duration
  };

  const TYPE_STYLES = {
    success: 'bg-ink text-paper',
    info: 'bg-ink text-paper',
    error: 'bg-surface text-danger border border-danger/30',
    warning: 'bg-amber-50 text-amber-900 border border-amber-200',
  } as const;
  const type = toast.type || 'info';
  const isDark = type === 'success' || type === 'info';
  const shown = isVisible && !isExiting;

  return (
    <div
      data-testid="toast"
      role={type === 'error' ? 'alert' : 'status'}
      className={`flex items-center gap-3 pl-4 pr-1.5 py-1.5 min-h-[48px] rounded-[14px] shadow-menu text-sm transition-all duration-200 ease-in-out ${
        TYPE_STYLES[type]
      } ${shown ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}
    >
      <span className="flex-1 font-medium">{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          onClick={toast.action.onClick}
          className={`h-8 px-3 rounded-full text-sm font-medium transition-colors ${
            isDark ? 'text-[#A9BEFF] hover:bg-white/10 hover:text-white' : 'text-accent hover:bg-accent-soft'
          }`}
        >
          {toast.action.label}
        </button>
      )}
      <button
        type="button"
        onClick={handleClose}
        aria-label="Dismiss"
        className={`w-8 h-8 inline-flex items-center justify-center rounded-full transition-colors ${
          isDark ? 'text-paper/70 hover:text-paper hover:bg-white/10' : 'opacity-70 hover:opacity-100 hover:bg-black/5'
        }`}
      >
        <CloseIcon className="w-4 h-4" />
      </button>
    </div>
  );
};

export default ToastComponent;
