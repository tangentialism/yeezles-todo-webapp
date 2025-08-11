import React, { useEffect, useState } from 'react';

export interface Toast {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

const ToastComponent: React.FC<ToastProps> = ({ toast, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10);
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
    setTimeout(() => onClose(toast.id), 200); // Match exit animation duration
  };

  const getToastStyles = () => {
    const baseStyles = "flex items-center justify-between p-4 rounded-lg shadow-lg border transition-all duration-200 ease-in-out";
    
    if (isExiting) {
      return `${baseStyles} transform translate-y-2 opacity-0`;
    }
    
    if (!isVisible) {
      return `${baseStyles} transform translate-y-2 opacity-0`;
    }

    const typeStyles = {
      success: "bg-green-50 border-green-200 text-green-800",
      error: "bg-red-50 border-red-200 text-red-800",
      warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
      info: "bg-blue-50 border-blue-200 text-blue-800"
    };

    return `${baseStyles} transform translate-y-0 opacity-100 ${typeStyles[toast.type || 'info']}`;
  };

  const getIconForType = () => {
    switch (toast.type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className={getToastStyles()}>
      <div className="flex items-center space-x-3">
        <span className="text-lg">{getIconForType()}</span>
        <span className="font-medium">{toast.message}</span>
      </div>
      
      <div className="flex items-center space-x-2">
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="px-3 py-1 text-sm font-medium bg-white rounded border border-current hover:bg-gray-50 transition-colors"
          >
            {toast.action.label}
          </button>
        )}
        <button
          onClick={handleClose}
          className="p-1 hover:bg-black hover:bg-opacity-10 rounded transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ToastComponent;
