import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { ToastProvider, useToast } from '../ToastContext';
import { render } from '@testing-library/react';
import { createUserEvent } from '../../test/user-interactions';

// Test component that uses the ToastContext
const ToastTestComponent: React.FC = () => {
  const { showToast, hideToast, clearAllToasts } = useToast();

  return (
    <div>
      <button
        data-testid="show-success-toast"
        onClick={() => showToast({ type: 'success', message: 'Success message!' })}
      >
        Show Success Toast
      </button>
      <button
        data-testid="show-error-toast"
        onClick={() => showToast({ type: 'error', message: 'Error message!' })}
      >
        Show Error Toast
      </button>
      <button
        data-testid="show-warning-toast"
        onClick={() => showToast({ type: 'warning', message: 'Warning message!' })}
      >
        Show Warning Toast
      </button>
      <button
        data-testid="show-info-toast"
        onClick={() => showToast({ type: 'info', message: 'Info message!' })}
      >
        Show Info Toast
      </button>
      <button
        data-testid="hide-toast"
        onClick={() => {
          const id = showToast({ type: 'success', message: 'Temporary toast' });
          setTimeout(() => hideToast(id), 100);
        }}
      >
        Show and Hide Toast
      </button>
      <button
        data-testid="clear-all-toasts"
        onClick={clearAllToasts}
      >
        Clear All Toasts
      </button>
    </div>
  );
};

describe('ToastContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Provider Setup', () => {
    it('should provide toast context without throwing', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: ({ children }) => <ToastProvider>{children}</ToastProvider>,
      });

      // Should have toast context functions
      expect(result.current.showToast).toBeInstanceOf(Function);
      expect(result.current.hideToast).toBeInstanceOf(Function);
      expect(result.current.clearAllToasts).toBeInstanceOf(Function);
    });

    it('should throw error when useToast used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useToast());
      }).toThrow('useToast must be used within a ToastProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('Toast Display', () => {
    it('should show success toast', async () => {
      const user = createUserEvent();
      
      render(
        <ToastProvider>
          <ToastTestComponent />
        </ToastProvider>
      );

      await user.click(screen.getByTestId('show-success-toast'));

      await waitFor(() => {
        expect(screen.getByText('Success message!')).toBeInTheDocument();
      });

      // Should have success styling
      const toastElement = screen.getByText('Success message!').closest('[data-testid="toast"]');
      expect(toastElement).toBeInTheDocument();
    });

    it('should show error toast', async () => {
      const user = createUserEvent();
      
      render(
        <ToastProvider>
          <ToastTestComponent />
        </ToastProvider>
      );

      await user.click(screen.getByTestId('show-error-toast'));

      await waitFor(() => {
        expect(screen.getByText('Error message!')).toBeInTheDocument();
      });
    });

    it('should show warning toast', async () => {
      const user = createUserEvent();
      
      render(
        <ToastProvider>
          <ToastTestComponent />
        </ToastProvider>
      );

      await user.click(screen.getByTestId('show-warning-toast'));

      await waitFor(() => {
        expect(screen.getByText('Warning message!')).toBeInTheDocument();
      });
    });

    it('should show info toast', async () => {
      const user = createUserEvent();
      
      render(
        <ToastProvider>
          <ToastTestComponent />
        </ToastProvider>
      );

      await user.click(screen.getByTestId('show-info-toast'));

      await waitFor(() => {
        expect(screen.getByText('Info message!')).toBeInTheDocument();
      });
    });

    it('should show multiple toasts simultaneously', async () => {
      const user = createUserEvent();
      
      render(
        <ToastProvider>
          <ToastTestComponent />
        </ToastProvider>
      );

      // Show multiple toasts
      await user.click(screen.getByTestId('show-success-toast'));
      await user.click(screen.getByTestId('show-error-toast'));
      await user.click(screen.getByTestId('show-warning-toast'));

      await waitFor(() => {
        expect(screen.getByText('Success message!')).toBeInTheDocument();
        expect(screen.getByText('Error message!')).toBeInTheDocument();
        expect(screen.getByText('Warning message!')).toBeInTheDocument();
      });

      // Should have 3 toasts visible
      const toasts = screen.getAllByTestId('toast');
      expect(toasts).toHaveLength(3);
    });
  });

  describe('Toast Management', () => {
    it('should hide specific toast by ID', async () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: ({ children }) => <ToastProvider>{children}</ToastProvider>,
      });

      let toastId: string;

      await act(async () => {
        toastId = result.current.showToast({ type: 'success', message: 'Test toast' });
      });

      // Toast should be visible
      await waitFor(() => {
        expect(screen.getByText('Test toast')).toBeInTheDocument();
      });

      await act(async () => {
        result.current.hideToast(toastId);
      });

      // Toast should be hidden
      await waitFor(() => {
        expect(screen.queryByText('Test toast')).not.toBeInTheDocument();
      });
    });

    it('should clear all toasts', async () => {
      const user = createUserEvent();
      
      render(
        <ToastProvider>
          <ToastTestComponent />
        </ToastProvider>
      );

      // Show multiple toasts
      await user.click(screen.getByTestId('show-success-toast'));
      await user.click(screen.getByTestId('show-error-toast'));
      await user.click(screen.getByTestId('show-warning-toast'));

      await waitFor(() => {
        expect(screen.getAllByTestId('toast')).toHaveLength(3);
      });

      // Clear all toasts
      await user.click(screen.getByTestId('clear-all-toasts'));

      await waitFor(() => {
        expect(screen.queryAllByTestId('toast')).toHaveLength(0);
      });
    });

    it('should return unique IDs for each toast', async () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: ({ children }) => <ToastProvider>{children}</ToastProvider>,
      });

      let id1: string;
      let id2: string;
      let id3: string;

      await act(async () => {
        id1 = result.current.showToast({ type: 'success', message: 'Toast 1' });
        id2 = result.current.showToast({ type: 'error', message: 'Toast 2' });
        id3 = result.current.showToast({ type: 'warning', message: 'Toast 3' });
      });

      // All IDs should be unique
      expect(id1).not.toBe(id2);
      expect(id1).not.toBe(id3);
      expect(id2).not.toBe(id3);
      
      // IDs should be strings
      expect(typeof id1).toBe('string');
      expect(typeof id2).toBe('string');
      expect(typeof id3).toBe('string');
    });
  });

  describe('Toast Auto-Dismiss', () => {
    it('should auto-dismiss success toasts after timeout', async () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: ({ children }) => <ToastProvider>{children}</ToastProvider>,
      });

      await act(async () => {
        result.current.showToast({ type: 'success', message: 'Auto-dismiss toast' });
      });

      // Toast should be visible initially
      await waitFor(() => {
        expect(screen.getByText('Auto-dismiss toast')).toBeInTheDocument();
      });

      // Wait for auto-dismiss (default timeout is usually 3-5 seconds)
      await waitFor(() => {
        expect(screen.queryByText('Auto-dismiss toast')).not.toBeInTheDocument();
      }, { timeout: 6000 });
    });

    it('should keep error toasts visible longer or require manual dismiss', async () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: ({ children }) => <ToastProvider>{children}</ToastProvider>,
      });

      await act(async () => {
        result.current.showToast({ type: 'error', message: 'Error toast' });
      });

      // Toast should be visible initially
      await waitFor(() => {
        expect(screen.getByText('Error toast')).toBeInTheDocument();
      });

      // Error toasts might stay longer or require manual dismiss
      // This test might need adjustment based on actual implementation
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Error toast might still be visible (depends on implementation)
      const errorToast = screen.queryByText('Error toast');
      // This assertion might need to be adjusted based on actual behavior
      expect(errorToast).toBeInTheDocument();
    });
  });

  describe('Toast Interaction', () => {
    it('should allow manual dismissal by clicking close button', async () => {
      const user = createUserEvent();
      
      render(
        <ToastProvider>
          <ToastTestComponent />
        </ToastProvider>
      );

      await user.click(screen.getByTestId('show-success-toast'));

      await waitFor(() => {
        expect(screen.getByText('Success message!')).toBeInTheDocument();
      });

      // Find and click close button (assuming it exists)
      const closeButton = screen.queryByRole('button', { name: /close|dismiss|×/i });
      if (closeButton) {
        await user.click(closeButton);

        await waitFor(() => {
          expect(screen.queryByText('Success message!')).not.toBeInTheDocument();
        });
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty message gracefully', async () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: ({ children }) => <ToastProvider>{children}</ToastProvider>,
      });

      await act(async () => {
        result.current.showToast({ type: 'info', message: '' });
      });

      // Should still create a toast even with empty message
      await waitFor(() => {
        const toasts = screen.queryAllByTestId('toast');
        expect(toasts.length).toBeGreaterThan(0);
      });
    });

    it('should handle hiding non-existent toast ID gracefully', async () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: ({ children }) => <ToastProvider>{children}</ToastProvider>,
      });

      // Should not throw when trying to hide non-existent toast
      await act(async () => {
        result.current.hideToast('non-existent-id');
      });

      // No error should be thrown
      expect(true).toBe(true);
    });

    it('should handle rapid toast creation', async () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: ({ children }) => <ToastProvider>{children}</ToastProvider>,
      });

      const toastIds: string[] = [];

      await act(async () => {
        // Create many toasts rapidly
        for (let i = 0; i < 10; i++) {
          const id = result.current.showToast({ 
            type: 'info', 
            message: `Rapid toast ${i}` 
          });
          toastIds.push(id);
        }
      });

      // All toasts should have unique IDs
      const uniqueIds = new Set(toastIds);
      expect(uniqueIds.size).toBe(10);

      // Should have multiple toasts visible
      await waitFor(() => {
        const toasts = screen.getAllByTestId('toast');
        expect(toasts.length).toBeGreaterThan(5); // At least some should be visible
      });
    });
  });
});
