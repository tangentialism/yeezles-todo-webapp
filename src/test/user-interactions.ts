import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

/**
 * User interaction helpers for common testing patterns
 * These functions encapsulate complex user interactions and make tests more readable
 */

/**
 * Setup user event instance with default configuration
 */
export const createUserEvent = () => userEvent.setup();

/**
 * Form interaction helpers
 */
export const formHelpers = {
  /**
   * Fill out a form field by label or placeholder
   */
  fillField: async (user: ReturnType<typeof userEvent.setup>, labelOrPlaceholder: string, value: string) => {
    const field = screen.getByLabelText(labelOrPlaceholder) || 
                  screen.getByPlaceholderText(labelOrPlaceholder) ||
                  screen.getByDisplayValue('');
    await user.clear(field);
    await user.type(field, value);
  },

  /**
   * Submit a form by finding and clicking submit button
   */
  submitForm: async (user: ReturnType<typeof userEvent.setup>, buttonText: string = 'Submit') => {
    const submitButton = screen.getByRole('button', { name: new RegExp(buttonText, 'i') });
    await user.click(submitButton);
  },

  /**
   * Select an option from a dropdown/select
   */
  selectOption: async (user: ReturnType<typeof userEvent.setup>, selectLabel: string, optionText: string) => {
    const select = screen.getByLabelText(selectLabel);
    await user.selectOptions(select, optionText);
  },
};

/**
 * Todo-specific interaction helpers
 */
export const todoHelpers = {
  /**
   * Add a new todo
   */
  addTodo: async (user: ReturnType<typeof userEvent.setup>, title: string, description?: string) => {
    // Open add todo modal
    const addButton = screen.getByRole('button', { name: /add.*todo/i });
    await user.click(addButton);

    // Fill in the form
    await formHelpers.fillField(user, 'Title', title);
    if (description) {
      await formHelpers.fillField(user, 'Description', description);
    }

    // Submit
    await formHelpers.submitForm(user, 'Add Todo');
  },

  /**
   * Mark a todo as complete
   */
  completeTodo: async (user: ReturnType<typeof userEvent.setup>, todoTitle: string) => {
    const todoItem = screen.getByText(todoTitle).closest('[data-testid="todo-item"]') ||
                     screen.getByText(todoTitle).closest('li');
    const checkbox = todoItem?.querySelector('input[type="checkbox"]') ||
                     screen.getByRole('checkbox', { name: new RegExp(todoTitle, 'i') });
    
    if (checkbox) {
      await user.click(checkbox);
    }
  },

  /**
   * Edit a todo
   */
  editTodo: async (user: ReturnType<typeof userEvent.setup>, todoTitle: string, newTitle: string, newDescription?: string) => {
    // Find and click edit button for the todo
    const todoItem = screen.getByText(todoTitle).closest('[data-testid="todo-item"]') ||
                     screen.getByText(todoTitle).closest('li');
    const editButton = todoItem?.querySelector('[data-testid="edit-button"]') ||
                       screen.getByRole('button', { name: /edit.*todo/i });
    
    if (editButton) {
      await user.click(editButton);
    }

    // Update the form
    await formHelpers.fillField(user, 'Title', newTitle);
    if (newDescription !== undefined) {
      await formHelpers.fillField(user, 'Description', newDescription);
    }

    // Submit
    await formHelpers.submitForm(user, 'Save');
  },

  /**
   * Delete a todo
   */
  deleteTodo: async (user: ReturnType<typeof userEvent.setup>, todoTitle: string) => {
    const todoItem = screen.getByText(todoTitle).closest('[data-testid="todo-item"]') ||
                     screen.getByText(todoTitle).closest('li');
    const deleteButton = todoItem?.querySelector('[data-testid="delete-button"]') ||
                         screen.getByRole('button', { name: /delete.*todo/i });
    
    if (deleteButton) {
      await user.click(deleteButton);
    }

    // Confirm deletion if confirmation dialog appears
    try {
      const confirmButton = screen.getByRole('button', { name: /confirm|delete|yes/i });
      await user.click(confirmButton);
    } catch {
      // No confirmation dialog, deletion was immediate
    }
  },
};

/**
 * Area management interaction helpers
 */
export const areaHelpers = {
  /**
   * Create a new area
   */
  createArea: async (user: ReturnType<typeof userEvent.setup>, name: string, color?: string) => {
    // Open area management modal
    const manageAreasButton = screen.getByRole('button', { name: /manage.*areas?/i });
    await user.click(manageAreasButton);

    // Click add area button
    const addAreaButton = screen.getByRole('button', { name: /add.*area/i });
    await user.click(addAreaButton);

    // Fill in the form
    await formHelpers.fillField(user, 'Area Name', name);
    
    if (color) {
      // Select color (this might need adjustment based on actual color picker implementation)
      const colorInput = screen.getByLabelText(/color/i);
      await user.click(colorInput);
      // Additional color selection logic would go here
    }

    // Submit
    await formHelpers.submitForm(user, 'Create Area');
  },

  /**
   * Switch to a different area
   */
  switchArea: async (user: ReturnType<typeof userEvent.setup>, areaName: string) => {
    const areaButton = screen.getByRole('button', { name: new RegExp(areaName, 'i') });
    await user.click(areaButton);
  },

  /**
   * Delete an area
   */
  deleteArea: async (user: ReturnType<typeof userEvent.setup>, areaName: string) => {
    // Open area management
    const manageAreasButton = screen.getByRole('button', { name: /manage.*areas?/i });
    await user.click(manageAreasButton);

    // Find and delete the area
    const areaItem = screen.getByText(areaName).closest('[data-testid="area-item"]');
    const deleteButton = areaItem?.querySelector('[data-testid="delete-button"]');
    
    if (deleteButton) {
      await user.click(deleteButton);
    }

    // Confirm deletion
    const confirmButton = screen.getByRole('button', { name: /confirm|delete|yes/i });
    await user.click(confirmButton);
  },
};

/**
 * Authentication interaction helpers
 */
export const authHelpers = {
  /**
   * Simulate Google login
   */
  loginWithGoogle: async (user: ReturnType<typeof userEvent.setup>) => {
    const loginButton = screen.getByRole('button', { name: /sign.*in.*google/i });
    await user.click(loginButton);
  },

  /**
   * Logout
   */
  logout: async (user: ReturnType<typeof userEvent.setup>) => {
    const logoutButton = screen.getByRole('button', { name: /logout|sign.*out/i });
    await user.click(logoutButton);
  },
};

/**
 * Navigation helpers
 */
export const navigationHelpers = {
  /**
   * Navigate to different views
   */
  goToToday: async (user: ReturnType<typeof userEvent.setup>) => {
    const todayButton = screen.getByRole('button', { name: /today/i });
    await user.click(todayButton);
  },

  goToAllTodos: async (user: ReturnType<typeof userEvent.setup>) => {
    const allTodosButton = screen.getByRole('button', { name: /all.*todos?/i });
    await user.click(allTodosButton);
  },
};

/**
 * Wait for specific conditions
 */
export const waitHelpers = {
  /**
   * Wait for loading to complete
   */
  waitForLoading: async () => {
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
  },

  /**
   * Wait for error message to disappear
   */
  waitForErrorToClear: async () => {
    await waitFor(() => {
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });
  },

  /**
   * Wait for toast notification
   */
  waitForToast: async (message: string) => {
    await waitFor(() => {
      expect(screen.getByText(new RegExp(message, 'i'))).toBeInTheDocument();
    });
  },

  /**
   * Wait for modal to open
   */
  waitForModal: async (modalTitle: string) => {
    await waitFor(() => {
      expect(screen.getByText(new RegExp(modalTitle, 'i'))).toBeInTheDocument();
    });
  },

  /**
   * Wait for modal to close
   */
  waitForModalToClose: async (modalTitle: string) => {
    await waitFor(() => {
      expect(screen.queryByText(new RegExp(modalTitle, 'i'))).not.toBeInTheDocument();
    });
  },
};

/**
 * Assertion helpers
 */
export const assertHelpers = {
  /**
   * Assert todo is visible in the list
   */
  expectTodoVisible: (todoTitle: string) => {
    expect(screen.getByText(todoTitle)).toBeInTheDocument();
  },

  /**
   * Assert todo is not visible
   */
  expectTodoNotVisible: (todoTitle: string) => {
    expect(screen.queryByText(todoTitle)).not.toBeInTheDocument();
  },

  /**
   * Assert area is selected
   */
  expectAreaSelected: (areaName: string) => {
    const areaButton = screen.getByRole('button', { name: new RegExp(areaName, 'i') });
    expect(areaButton).toHaveClass(/selected|active|current/);
  },

  /**
   * Assert user is logged in
   */
  expectUserLoggedIn: (userName?: string) => {
    if (userName) {
      expect(screen.getByText(new RegExp(userName, 'i'))).toBeInTheDocument();
    }
    expect(screen.queryByText(/sign.*in/i)).not.toBeInTheDocument();
  },

  /**
   * Assert user is logged out
   */
  expectUserLoggedOut: () => {
    expect(screen.getByText(/sign.*in/i)).toBeInTheDocument();
  },
};
