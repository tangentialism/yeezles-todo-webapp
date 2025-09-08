import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { 
  renderWithProviders, 
  renderAuthenticated, 
  renderUnauthenticated,
  renderWithAuth,
  renderWithQueryClient
} from './test-utils';
import { 
  createMockUser, 
  createMockArea, 
  createMockTodo, 
  TestScenarios,
  resetFactoryCounters
} from './factories';
import { setupFetchMock, mockApiSuccess } from './api-mocks';

// Simple test component to verify providers are working
const TestComponent: React.FC = () => {
  return (
    <div>
      <h1>Test Component</h1>
      <div data-testid="test-content">Content loaded</div>
    </div>
  );
};

// Component that uses auth context
const AuthTestComponent: React.FC = () => {
  // In a real test, we'd import and use useAuth here
  return (
    <div>
      <h1>Auth Test Component</h1>
      <div data-testid="auth-content">Auth content</div>
    </div>
  );
};

describe('Test Utilities', () => {
  beforeEach(() => {
    resetFactoryCounters();
    vi.clearAllMocks();
  });

  describe('Factory Functions', () => {
    it('should create mock user with default values', () => {
      const user = createMockUser();
      
      expect(user).toEqual({
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg',
      });
    });

    it('should create mock user with overrides', () => {
      const user = createMockUser({
        name: 'Custom User',
        email: 'custom@example.com',
      });
      
      expect(user.name).toBe('Custom User');
      expect(user.email).toBe('custom@example.com');
      expect(user.id).toBe('test-user-123'); // Default value preserved
    });

    it('should create mock area with incremental IDs', () => {
      const area1 = createMockArea();
      const area2 = createMockArea();
      
      expect(area1.id).toBe('area-1');
      expect(area2.id).toBe('area-2');
      expect(area1.name).toBe('Work');
      expect(area1.color).toBe('#3B82F6');
    });

    it('should create mock todo with incremental IDs', () => {
      const todo1 = createMockTodo();
      const todo2 = createMockTodo({ title: 'Custom Todo' });
      
      expect(todo1.id).toBe('todo-1');
      expect(todo2.id).toBe('todo-2');
      expect(todo1.title).toBe('Test Todo');
      expect(todo2.title).toBe('Custom Todo');
    });

    it('should reset factory counters', () => {
      createMockTodo(); // Creates todo-1
      createMockArea(); // Creates area-1
      
      resetFactoryCounters();
      
      const todo = createMockTodo();
      const area = createMockArea();
      
      expect(todo.id).toBe('todo-1'); // Counter reset
      expect(area.id).toBe('area-1'); // Counter reset
    });

    it('should create test scenarios', () => {
      const scenario = TestScenarios.userWithData();
      
      expect(scenario.user).toBeDefined();
      expect(scenario.areas).toHaveLength(3);
      expect(scenario.todos).toHaveLength(5);
      
      // Check todo distribution
      const pendingTodos = scenario.todos.filter(t => t.status === 'pending');
      const completedTodos = scenario.todos.filter(t => t.status === 'completed');
      
      expect(pendingTodos).toHaveLength(4);
      expect(completedTodos).toHaveLength(1);
    });
  });

  describe('Render Functions', () => {
    it('should render with basic providers', () => {
      renderWithProviders(<TestComponent />, {
        includeArea: false, // Don't include AreaProvider to avoid auth dependency
      });
      
      expect(screen.getByText('Test Component')).toBeInTheDocument();
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });

    it('should render with query client only', () => {
      renderWithQueryClient(<TestComponent />);
      
      expect(screen.getByText('Test Component')).toBeInTheDocument();
    });

    it('should render authenticated component', () => {
      renderAuthenticated(<AuthTestComponent />, {
        includeArea: false, // Don't include AreaProvider to avoid complex dependencies
      });
      
      expect(screen.getByText('Auth Test Component')).toBeInTheDocument();
      expect(screen.getByTestId('auth-content')).toBeInTheDocument();
    });

    it('should render unauthenticated component', () => {
      renderUnauthenticated(<AuthTestComponent />, {
        includeArea: false, // Don't include AreaProvider to avoid complex dependencies
      });
      
      expect(screen.getByText('Auth Test Component')).toBeInTheDocument();
    });

    it('should render with custom user', () => {
      const customUser = createMockUser({
        name: 'Custom Test User',
        email: 'custom@test.com',
      });

      renderAuthenticated(<AuthTestComponent />, {
        initialUser: customUser,
        includeArea: false, // Don't include AreaProvider to avoid complex dependencies
      });
      
      expect(screen.getByText('Auth Test Component')).toBeInTheDocument();
    });

    it('should render with auth context only', () => {
      renderWithAuth(<AuthTestComponent />);
      
      expect(screen.getByText('Auth Test Component')).toBeInTheDocument();
    });
  });

  describe('API Mocking', () => {
    it('should setup fetch mock', () => {
      const mockFetch = setupFetchMock();
      
      expect(global.fetch).toBe(mockFetch);
      expect(mockFetch).toBeInstanceOf(Function);
    });

    it('should create successful API responses', () => {
      const todos = [createMockTodo(), createMockTodo()];
      const response = mockApiSuccess.getTodos(todos);
      
      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
    });

    it('should handle API response data', async () => {
      const mockFetch = setupFetchMock();
      const todos = [createMockTodo()];
      
      mockFetch.mockResolvedValueOnce(mockApiSuccess.getTodos(todos));
      
      const response = await fetch('/api/todos');
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data).toEqual(todos);
    });
  });

  describe('Test Scenarios', () => {
    it('should create new user scenario', () => {
      const scenario = TestScenarios.newUser();
      
      expect(scenario.user).toBeDefined();
      expect(scenario.areas).toHaveLength(0);
      expect(scenario.todos).toHaveLength(0);
    });

    it('should create overdue todos scenario', () => {
      const scenario = TestScenarios.overdueTodos();
      
      expect(scenario.user).toBeDefined();
      expect(scenario.areas).toHaveLength(1);
      expect(scenario.todos).toHaveLength(2);
      
      // Check that todos are actually overdue
      const now = new Date();
      scenario.todos.forEach(todo => {
        if (todo.dueDate) {
          const dueDate = new Date(todo.dueDate);
          expect(dueDate.getTime()).toBeLessThan(now.getTime());
        }
      });
    });
  });
});
