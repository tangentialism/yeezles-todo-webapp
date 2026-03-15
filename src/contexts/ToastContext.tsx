/**
 * Toast notification context.
 *
 * Manages a stack of toast messages rendered in a fixed container at the
 * bottom-right of the viewport. Toasts auto-dismiss after their `duration`
 * and can optionally include action buttons (e.g. "Undo").
 */
import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import ToastComponent, { type Toast } from '../components/Toast';
import { DEFAULT_TOAST_DURATION_MS } from '../constants';

interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => string;
  hideToast: (id: string) => void;
  clearAllToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

/**
 * Access toast notification actions. Must be called within a {@link ToastProvider}.
 * @returns `showToast` (returns toast ID), `hideToast`, and `clearAllToasts`.
 */
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

/**
 * Renders the toast container and provides `showToast`/`hideToast` to descendants.
 * Each toast receives a unique ID and a default duration of {@link DEFAULT_TOAST_DURATION_MS}.
 */
export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (toastData: Omit<Toast, 'id'>): string => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const toast: Toast = {
      id,
      duration: DEFAULT_TOAST_DURATION_MS,
      ...toastData,
    };

    setToasts(prev => [...prev, toast]);
    return id;
  };

  const hideToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const clearAllToasts = () => {
    setToasts([]);
  };

  return (
    <ToastContext.Provider value={{ showToast, hideToast, clearAllToasts }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
        {toasts.map(toast => (
          <ToastComponent
            key={toast.id}
            toast={toast}
            onClose={hideToast}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};
