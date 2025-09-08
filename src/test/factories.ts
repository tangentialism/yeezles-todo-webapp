import type { Todo, TodoStatus } from '../types/todo';
import type { Area } from '../types/area';
import type { User } from '../contexts/AuthContext';

/**
 * Factory functions for creating test data
 * These help create realistic, consistent test data across all tests
 */

let todoIdCounter = 1;
let areaIdCounter = 1;

export const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'test-user-123',
  email: 'test@example.com',
  name: 'Test User',
  picture: 'https://example.com/avatar.jpg',
  ...overrides,
});

export const createMockArea = (overrides: Partial<Area> = {}): Area => ({
  id: `area-${areaIdCounter++}`,
  name: 'Work',
  description: 'Work-related tasks',
  color: '#3B82F6',
  isActive: true,
  userId: 'test-user-123',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const createMockTodo = (overrides: Partial<Todo> = {}): Todo => ({
  id: `todo-${todoIdCounter++}`,
  title: 'Test Todo',
  description: 'This is a test todo item',
  status: 'pending' as TodoStatus,
  priority: 'medium',
  dueDate: null,
  scheduledDate: null,
  completedAt: null,
  areaId: 'area-1',
  userId: 'test-user-123',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const createMockTodos = (count: number, overrides: Partial<Todo> = {}): Todo[] => {
  return Array.from({ length: count }, (_, index) => 
    createMockTodo({
      title: `Test Todo ${index + 1}`,
      ...overrides,
    })
  );
};

export const createMockAreas = (count: number, overrides: Partial<Area> = {}): Area[] => {
  const areaNames = ['Work', 'Personal', 'Health', 'Learning', 'Projects'];
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
  
  return Array.from({ length: count }, (_, index) => 
    createMockArea({
      name: areaNames[index % areaNames.length],
      color: colors[index % colors.length],
      ...overrides,
    })
  );
};

/**
 * Google OAuth response factory
 */
export const createMockGoogleCredentialResponse = (overrides: Partial<any> = {}) => ({
  credential: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjdkYzBiMjJhYmZkMzAzNmI4NzdhOTk3N2Y0NzE5ZjRmMzYwYWI5ZjUiLCJ0eXAiOiJKV1QifQ.mock-jwt-token',
  select_by: 'btn',
  ...overrides,
});

/**
 * API Response factories
 */
export const createMockApiResponse = <T>(data: T, overrides: Partial<any> = {}) => ({
  success: true,
  data,
  message: 'Success',
  ...overrides,
});

export const createMockApiError = (message: string = 'API Error', status: number = 400) => ({
  success: false,
  error: message,
  status,
});

/**
 * Reset factory counters (useful for test isolation)
 */
export const resetFactoryCounters = () => {
  todoIdCounter = 1;
  areaIdCounter = 1;
};

/**
 * Common test scenarios
 */
export const TestScenarios = {
  // User with multiple areas and todos
  userWithData: () => {
    const user = createMockUser();
    const areas = createMockAreas(3, { userId: user.id });
    const todos = [
      ...createMockTodos(2, { areaId: areas[0].id, userId: user.id, status: 'pending' }),
      ...createMockTodos(1, { areaId: areas[0].id, userId: user.id, status: 'completed' }),
      ...createMockTodos(2, { areaId: areas[1].id, userId: user.id, status: 'pending' }),
    ];
    return { user, areas, todos };
  },

  // Empty user (new account)
  newUser: () => {
    const user = createMockUser();
    return { user, areas: [], todos: [] };
  },

  // Overdue todos scenario
  overdueTodos: () => {
    const user = createMockUser();
    const area = createMockArea({ userId: user.id });
    const todos = [
      createMockTodo({ 
        areaId: area.id, 
        userId: user.id, 
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
        title: 'Overdue Todo 1'
      }),
      createMockTodo({ 
        areaId: area.id, 
        userId: user.id, 
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        title: 'Overdue Todo 2'
      }),
    ];
    return { user, areas: [area], todos };
  },
};
