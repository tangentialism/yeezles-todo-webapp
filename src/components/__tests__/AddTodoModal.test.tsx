import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddTodoModal from '../AddTodoModal';
import * as useTodoStoreModule from '../../hooks/useTodoStore';
import * as AreaContextModule from '../../contexts/AreaContext';
import type { Area } from '../../types/area';

// Mock the hooks
vi.mock('../../hooks/useTodoStore');
vi.mock('../../contexts/AreaContext');

describe('AddTodoModal', () => {
  const mockCreateTodo = vi.fn();
  const mockOnClose = vi.fn();
  const mockOnTodoAdded = vi.fn();
  
  const mockAreas: Area[] = [
    {
      id: 1,
      name: 'Work',
      description: 'Work tasks',
      color: '#3B82F6',
      user_id: 'test-user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 2,
      name: 'Personal',
      description: 'Personal tasks',
      color: '#10B981',
      user_id: 'test-user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock useTodoStore
    vi.spyOn(useTodoStoreModule, 'useTodoStore').mockReturnValue({
      createTodo: mockCreateTodo,
      isCreating: false,
      todos: [],
      isLoading: false,
      isRefetching: false,
      error: null,
      getTodoDisplayState: vi.fn(),
      toggleTodoCompletion: vi.fn(),
      refetchTodos: vi.fn(),
      updateTodo: vi.fn(),
      deleteTodo: vi.fn(),
    } as any);
    
    // Mock AreaContext
    vi.spyOn(AreaContextModule, 'useArea').mockReturnValue({
      areas: mockAreas,
      currentArea: mockAreas[0],
      setCurrentArea: vi.fn(),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      createArea: vi.fn(),
      updateArea: vi.fn(),
      deleteArea: vi.fn(),
    } as any);
    
    mockCreateTodo.mockResolvedValue({
      id: 1,
      title: 'New Todo',
      description: '',
      completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      due_date: null,
      is_today: false,
      tags: [],
      area_id: null,
      reference_url: null,
    });
  });

  describe('Add to Today List toggle', () => {
    it('should NOT auto-enable "Add to Today List" when currentView is "all"', () => {
      render(
        <AddTodoModal
          isOpen={true}
          onClose={mockOnClose}
          onTodoAdded={mockOnTodoAdded}
          currentView="all"
        />
      );
      
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
    });

    it('should auto-enable "Add to Today List" when currentView is "today"', () => {
      render(
        <AddTodoModal
          isOpen={true}
          onClose={mockOnClose}
          onTodoAdded={mockOnTodoAdded}
          currentView="today"
        />
      );
      
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });

    it('should NOT auto-enable "Add to Today List" when currentView is "accomplishments"', () => {
      render(
        <AddTodoModal
          isOpen={true}
          onClose={mockOnClose}
          onTodoAdded={mockOnTodoAdded}
          currentView="accomplishments"
        />
      );
      
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
    });

    it('should NOT auto-enable "Add to Today List" when currentView is undefined', () => {
      render(
        <AddTodoModal
          isOpen={true}
          onClose={mockOnClose}
          onTodoAdded={mockOnTodoAdded}
        />
      );
      
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
    });

    it('should allow user to manually toggle "Add to Today List" even when on Today tab', async () => {
      const user = userEvent.setup();
      
      render(
        <AddTodoModal
          isOpen={true}
          onClose={mockOnClose}
          onTodoAdded={mockOnTodoAdded}
          currentView="today"
        />
      );
      
      const checkbox = screen.getByRole('checkbox');
      
      // Initially checked because we're on Today tab
      expect(checkbox).toBeChecked();
      
      // User can uncheck it
      await user.click(checkbox);
      expect(checkbox).not.toBeChecked();
      
      // User can check it again
      await user.click(checkbox);
      expect(checkbox).toBeChecked();
    });

    it('should submit todo with is_today=true when created from Today tab', async () => {
      const user = userEvent.setup();
      
      render(
        <AddTodoModal
          isOpen={true}
          onClose={mockOnClose}
          onTodoAdded={mockOnTodoAdded}
          currentView="today"
        />
      );
      
      const titleInput = screen.getByLabelText(/title/i);
      const submitButton = screen.getByRole('button', { name: /add todo/i });
      
      await user.type(titleInput, 'New todo from Today tab');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockCreateTodo).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'New todo from Today tab',
            is_today: true,
          })
        );
      });
    });

    it('should submit todo with is_today=false when created from All Todos tab', async () => {
      const user = userEvent.setup();
      
      render(
        <AddTodoModal
          isOpen={true}
          onClose={mockOnClose}
          onTodoAdded={mockOnTodoAdded}
          currentView="all"
        />
      );
      
      const titleInput = screen.getByLabelText(/title/i);
      const submitButton = screen.getByRole('button', { name: /add todo/i });
      
      await user.type(titleInput, 'New todo from All tab');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockCreateTodo).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'New todo from All tab',
            is_today: false,
          })
        );
      });
    });

    it('should reset "Add to Today List" when modal closes and reopens with different view', async () => {
      const { rerender } = render(
        <AddTodoModal
          isOpen={true}
          onClose={mockOnClose}
          onTodoAdded={mockOnTodoAdded}
          currentView="today"
        />
      );
      
      let checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
      
      // Close modal
      rerender(
        <AddTodoModal
          isOpen={false}
          onClose={mockOnClose}
          onTodoAdded={mockOnTodoAdded}
          currentView="today"
        />
      );
      
      // Reopen with different view
      rerender(
        <AddTodoModal
          isOpen={true}
          onClose={mockOnClose}
          onTodoAdded={mockOnTodoAdded}
          currentView="all"
        />
      );
      
      checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
    });
  });

  describe('Basic functionality', () => {
    it('should render when isOpen is true', () => {
      render(
        <AddTodoModal
          isOpen={true}
          onClose={mockOnClose}
          onTodoAdded={mockOnTodoAdded}
        />
      );
      
      expect(screen.getByText('Add New Todo')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(
        <AddTodoModal
          isOpen={false}
          onClose={mockOnClose}
          onTodoAdded={mockOnTodoAdded}
        />
      );
      
      expect(screen.queryByText('Add New Todo')).not.toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <AddTodoModal
          isOpen={true}
          onClose={mockOnClose}
          onTodoAdded={mockOnTodoAdded}
        />
      );
      
      const closeButton = screen.getByRole('button', { name: '' }); // X button has no text
      await user.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should populate form with initialData when provided', () => {
      const initialData = {
        title: 'Initial Title',
        description: 'Initial Description',
        referenceUrl: 'https://example.com',
      };
      
      render(
        <AddTodoModal
          isOpen={true}
          onClose={mockOnClose}
          onTodoAdded={mockOnTodoAdded}
          initialData={initialData}
        />
      );
      
      expect(screen.getByDisplayValue('Initial Title')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Initial Description')).toBeInTheDocument();
      expect(screen.getByDisplayValue('https://example.com')).toBeInTheDocument();
    });
  });
});

