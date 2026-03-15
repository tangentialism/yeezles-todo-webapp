import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Navigation from '../Navigation';
import * as AreaContextModule from '../../contexts/AreaContext';

// Mock the AreaContext
vi.mock('../../contexts/AreaContext');
// Mock the AreaManagementModal since it has complex dependencies
vi.mock('../AreaManagementModal', () => ({
  default: () => null,
}));

describe('Navigation', () => {
  const mockOnViewChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default Area context mock
    vi.spyOn(AreaContextModule, 'useArea').mockReturnValue({
      areas: [],
      currentArea: null,
      setCurrentArea: vi.fn(),
      isLoading: false,
      availableColors: [],
      refreshAreas: vi.fn(),
      createArea: vi.fn(),
      updateArea: vi.fn(),
      deleteArea: vi.fn(),
      getAreaStats: vi.fn(),
      getAreaDisplayState: vi.fn().mockReturnValue({ isPending: false, isDeleting: false, isCreating: false }),
    } as any);
  });

  describe('Tab Rendering', () => {
    it('should render all tab options', () => {
      render(<Navigation currentView="all" onViewChange={mockOnViewChange} />);

      // The component renders tab labels with icons
      // On small screens the labels are hidden but still in DOM
      expect(screen.getByText('All Todos')).toBeInTheDocument();
      expect(screen.getByText('Today')).toBeInTheDocument();
      expect(screen.getByText('Accomplishments')).toBeInTheDocument();
    });
  });

  describe('Active Tab Highlighting', () => {
    it('should highlight active tab with distinct styling', () => {
      render(<Navigation currentView="today" onViewChange={mockOnViewChange} />);

      // Find buttons by their data-tab attribute
      const todayButton = screen.getByText('Today').closest('button');
      const allButton = screen.getByText('All Todos').closest('button');

      // The active tab should have text-indigo-600 class
      expect(todayButton).toHaveClass('text-indigo-600');
      // Non-active tabs should have text-gray-500
      expect(allButton).toHaveClass('text-gray-500');
    });

    it('should highlight "all" tab when currentView is "all"', () => {
      render(<Navigation currentView="all" onViewChange={mockOnViewChange} />);

      const allButton = screen.getByText('All Todos').closest('button');
      expect(allButton).toHaveClass('text-indigo-600');
    });

    it('should highlight "accomplishments" tab when currentView is "accomplishments"', () => {
      render(<Navigation currentView="accomplishments" onViewChange={mockOnViewChange} />);

      const accomplishmentsButton = screen.getByText('Accomplishments').closest('button');
      expect(accomplishmentsButton).toHaveClass('text-indigo-600');
    });
  });

  describe('Tab Click Handling', () => {
    it('should call onViewChange with "today" when Today tab is clicked', async () => {
      const user = userEvent.setup();

      render(<Navigation currentView="all" onViewChange={mockOnViewChange} />);

      const todayButton = screen.getByText('Today').closest('button')!;
      await user.click(todayButton);

      expect(mockOnViewChange).toHaveBeenCalledWith('today');
    });

    it('should call onViewChange with "all" when All Todos tab is clicked', async () => {
      const user = userEvent.setup();

      render(<Navigation currentView="today" onViewChange={mockOnViewChange} />);

      const allButton = screen.getByText('All Todos').closest('button')!;
      await user.click(allButton);

      expect(mockOnViewChange).toHaveBeenCalledWith('all');
    });

    it('should call onViewChange with "accomplishments" when Accomplishments tab is clicked', async () => {
      const user = userEvent.setup();

      render(<Navigation currentView="all" onViewChange={mockOnViewChange} />);

      const accompButton = screen.getByText('Accomplishments').closest('button')!;
      await user.click(accompButton);

      expect(mockOnViewChange).toHaveBeenCalledWith('accomplishments');
    });
  });

  describe('Area Switcher', () => {
    it('should show "All Areas" when no area is selected', () => {
      render(<Navigation currentView="all" onViewChange={mockOnViewChange} />);

      expect(screen.getByText('All Areas')).toBeInTheDocument();
    });

    it('should show current area name when an area is selected', () => {
      vi.spyOn(AreaContextModule, 'useArea').mockReturnValue({
        areas: [
          { id: 1, name: 'Work', color: '#3B82F6', user_id: 'test', reference_code: 'work', description: null, is_default: true, created_at: '', updated_at: '' },
        ],
        currentArea: { id: 1, name: 'Work', color: '#3B82F6', user_id: 'test', reference_code: 'work', description: null, is_default: true, created_at: '', updated_at: '' },
        setCurrentArea: vi.fn(),
        isLoading: false,
        availableColors: [],
        refreshAreas: vi.fn(),
        createArea: vi.fn(),
        updateArea: vi.fn(),
        deleteArea: vi.fn(),
        getAreaStats: vi.fn(),
        getAreaDisplayState: vi.fn().mockReturnValue({ isPending: false, isDeleting: false, isCreating: false }),
      } as any);

      render(<Navigation currentView="all" onViewChange={mockOnViewChange} />);

      expect(screen.getByText('Work')).toBeInTheDocument();
    });
  });
});
