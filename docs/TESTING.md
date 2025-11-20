# Yeezles Todo Web Application - Testing Guide

**Last Updated:** November 20, 2025

This project follows **Test-Driven Development (TDD)** practices. Tests should be written BEFORE implementing features.

---

## Philosophy

> "If it's not tested, it's broken."

We prioritize:
1. **Red → Green → Refactor**: Write failing test, make it pass, improve code
2. **High coverage**: Aim for >80% code coverage
3. **Deterministic tests**: Same input = same output, always
4. **Fast tests**: Unit tests run in milliseconds
5. **Readable tests**: Tests serve as documentation
6. **Test in isolation**: Mock dependencies, test one thing at a time

---

## Current Testing Status

**⚠️ PRIORITY**: Improving test coverage is a top priority for this project.

### Current Coverage
- Overall: ~40% (Target: >80%)
- Components: Limited coverage (~20%) (Target: >85%)
- Hooks: Good coverage (~70%) (Target: >90%)
- Contexts: Good coverage (~75%) (Target: >90%)
- Services: Partial coverage (~60%) (Target: >85%)
- Utils: Good coverage (~80%) (Target: >90%)

### Target Coverage Goals
- **Overall**: >80% code coverage
- **Business Logic**: >95% (todo operations, state management, auth)
- **Components**: >85% (UI components, modals, views)
- **Hooks**: >90% (custom hooks, state management)
- **Contexts**: >90% (auth, toast, area providers)
- **Services**: >85% (API client, networking)
- **Utils**: >90% (helper functions)

---

## Quick Start

### Running Tests

**All tests:**
```bash
npm test
```

**Watch mode (re-run on changes):**
```bash
npm run test:watch
```

**Coverage report:**
```bash
npm run test:coverage
```

**UI mode (Vitest UI):**
```bash
npm run test:ui
```

**Specific test file:**
```bash
npm test -- src/hooks/useApi.test.ts
```

**Specific test suite:**
```bash
npm test -- --grep "useTodoStore"
```

---

## Testing Stack

### Core Testing Framework
- **Vitest 3.2.4**: Fast unit test runner (Vite-native)
- **React Testing Library 16.3.0**: Component testing
- **jsdom 26.1.0**: DOM testing environment
- **@testing-library/user-event 14.6.1**: User interaction simulation

### Assertions & Utilities
- **Vitest matchers**: Built-in assertions (expect, toBe, toEqual, etc.)
- **@testing-library/jest-dom 6.8.0**: Custom DOM matchers
- **React Query testing utils**: Query client testing

### Mocking
- **Vitest mocks**: Built-in mocking (vi.fn, vi.mock, vi.spyOn)
- **Mock Service Worker (planned)**: API mocking for integration tests

---

## TDD Workflow

### Step 1: Write Failing Test (RED)

Before writing any implementation code, write a test that describes expected behavior:

```typescript
// src/hooks/__tests__/useTodoStore.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useTodoStore } from '../useTodoStore';
import { createWrapper } from '../../test/test-utils';

describe('useTodoStore', () => {
  it('should create a new todo optimistically', async () => {
    const { result } = renderHook(() => useTodoStore({ view: 'all' }), {
      wrapper: createWrapper(),
    });

    // Test will fail initially (RED)
    await waitFor(() => {
      expect(result.current.todos).toHaveLength(0);
    });

    await result.current.createTodo({
      title: 'Test Todo',
      description: 'Test Description',
    });

    // Should see optimistic update immediately
    await waitFor(() => {
      expect(result.current.todos).toHaveLength(1);
      expect(result.current.todos[0].title).toBe('Test Todo');
    });
  });
});
```

Run the test - it should **FAIL** (RED):
```bash
npm test -- useTodoStore.test.ts
```

---

### Step 2: Make Test Pass (GREEN)

Implement the minimum code needed to make the test pass:

```typescript
// src/hooks/useTodoStore.ts
export const useTodoStore = (options = {}) => {
  const apiClient = useApi();
  const queryClient = useQueryClient();

  const createTodoMutation = useMutation({
    mutationFn: async (newTodo) => {
      const response = await apiClient.createTodo(newTodo);
      return response.data;
    },
    onMutate: async (newTodo) => {
      // Optimistic update
      const optimisticTodo = {
        id: Date.now(),
        ...newTodo,
        completed: false,
        created_at: new Date().toISOString(),
      };
      
      queryClient.setQueryData(['todos', filters], (old) => 
        [optimisticTodo, ...old]
      );

      return { optimisticTodo };
    },
  });

  return {
    todos,
    createTodo: createTodoMutation.mutateAsync,
  };
};
```

Run the test - it should **PASS** (GREEN):
```bash
npm test -- useTodoStore.test.ts
```

---

### Step 3: Refactor (REFACTOR)

Improve code quality without changing behavior:

```typescript
// Refactored for clarity
export const useTodoStore = (options = {}) => {
  const apiClient = useApi();
  const queryClient = useQueryClient();

  // Extract helper for optimistic updates
  const createOptimisticTodo = (newTodo: CreateTodoRequest): Todo => ({
    id: Date.now(),
    title: newTodo.title,
    description: newTodo.description || '',
    completed: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    due_date: newTodo.due_date || null,
    is_today: newTodo.is_today || false,
    completed_at: null,
    area_id: newTodo.area_id || null,
    reference_url: newTodo.reference_url || null,
  });

  const createTodoMutation = useMutation({
    mutationFn: async (newTodo) => {
      const response = await apiClient.createTodo(newTodo);
      return response.data;
    },
    onMutate: async (newTodo) => {
      const optimisticTodo = createOptimisticTodo(newTodo);
      
      queryClient.setQueryData(['todos', filters], (old) => 
        [optimisticTodo, ...old]
      );

      return { optimisticTodo };
    },
  });

  return {
    todos,
    createTodo: createTodoMutation.mutateAsync,
  };
};
```

Run the test again - it should still **PASS**:
```bash
npm test -- useTodoStore.test.ts
```

---

## Test Organization

### Directory Structure

```
src/
├── components/
│   └── __tests__/
│       ├── Dashboard.test.tsx
│       ├── TodoList.test.tsx
│       └── TodoItem.test.tsx
├── hooks/
│   └── __tests__/
│       ├── useApi.test.ts
│       ├── useTodoStore.test.ts
│       └── useTodoCompletion.test.ts
├── contexts/
│   └── __tests__/
│       ├── AuthContext.test.tsx
│       ├── ToastContext.test.tsx
│       └── AreaContext.test.tsx
├── services/
│   └── __tests__/
│       └── api.test.ts
├── utils/
│   └── __tests__/
│       └── date.test.ts
└── test/
    ├── setup.ts             # Global test setup
    ├── test-utils.tsx       # Testing utilities
    ├── test-utils.test.tsx  # Test utility tests
    ├── factories.ts         # Test data factories
    ├── api-mocks.ts         # API mock responses
    └── user-interactions.ts # Common user interactions
```

### File Naming

- Test files: `*.test.ts` or `*.test.tsx`
- Test utilities: `test-utils.ts`, `test-utils.tsx`
- Test setup: `setup.ts`
- Mock data: `*-mocks.ts`, `factories.ts`

---

## Testing Patterns

### Component Testing

**Goal:** Test component behavior and user interactions, not implementation details.

#### Basic Component Test

```typescript
// src/components/__tests__/TodoItem.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TodoItem } from '../TodoItem';
import { createTodo } from '../../test/factories';

describe('TodoItem', () => {
  it('should render todo title and description', () => {
    const todo = createTodo({ 
      title: 'Test Todo',
      description: 'Test Description'
    });

    render(<TodoItem todo={todo} />);

    expect(screen.getByText('Test Todo')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  it('should toggle completion when checkbox is clicked', async () => {
    const user = userEvent.setup();
    const todo = createTodo({ completed: false });
    const onToggle = vi.fn();

    render(<TodoItem todo={todo} onToggle={onToggle} />);

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    expect(onToggle).toHaveBeenCalledWith(todo);
  });

  it('should show due date badge when todo has due date', () => {
    const todo = createTodo({ 
      due_date: '2025-11-25T10:00:00Z'
    });

    render(<TodoItem todo={todo} />);

    expect(screen.getByText(/Due:/i)).toBeInTheDocument();
  });
});
```

#### Component with Context

```typescript
// src/components/__tests__/Dashboard.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dashboard } from '../Dashboard';
import { createWrapper } from '../../test/test-utils';
import { createTodo } from '../../test/factories';

describe('Dashboard', () => {
  it('should display user profile', async () => {
    render(<Dashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/Test User/i)).toBeInTheDocument();
    });
  });

  it('should open add todo modal when add button is clicked', async () => {
    const user = userEvent.setup();
    render(<Dashboard />, { wrapper: createWrapper() });

    const addButton = screen.getByRole('button', { name: /Add Todo/i });
    await user.click(addButton);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText(/Title/i)).toBeInTheDocument();
  });
});
```

---

### Hook Testing

**Goal:** Test custom hooks in isolation with proper wrappers.

#### Basic Hook Test

```typescript
// src/hooks/__tests__/useApi.test.ts
import { renderHook } from '@testing-library/react';
import { useApi } from '../useApi';
import { createWrapper } from '../../test/test-utils';

describe('useApi', () => {
  it('should return authenticated API client', () => {
    const { result } = renderHook(() => useApi(), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBeDefined();
    expect(result.current.getTodos).toBeDefined();
    expect(result.current.createTodo).toBeDefined();
  });

  it('should inject auth token in requests', async () => {
    const { result } = renderHook(() => useApi(), {
      wrapper: createWrapper({ isAuthenticated: true }),
    });

    // Mock API call
    const spy = vi.spyOn(result.current, 'getTodos');
    await result.current.getTodos();

    expect(spy).toHaveBeenCalled();
  });
});
```

#### Hook with State Management

```typescript
// src/hooks/__tests__/useTodoStore.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useTodoStore } from '../useTodoStore';
import { createWrapper } from '../../test/test-utils';
import { createTodo } from '../../test/factories';

describe('useTodoStore', () => {
  it('should fetch todos on mount', async () => {
    const { result } = renderHook(() => useTodoStore({ view: 'all' }), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.todos).toHaveLength(0);
    });
  });

  it('should create todo with optimistic update', async () => {
    const { result } = renderHook(() => useTodoStore({ view: 'all' }), {
      wrapper: createWrapper(),
    });

    const newTodo = {
      title: 'New Todo',
      description: 'Description',
    };

    await result.current.createTodo(newTodo);

    // Should see optimistic update immediately
    await waitFor(() => {
      expect(result.current.todos).toHaveLength(1);
      expect(result.current.todos[0].title).toBe('New Todo');
    });
  });

  it('should rollback on error', async () => {
    const { result } = renderHook(() => useTodoStore({ view: 'all' }), {
      wrapper: createWrapper({ apiError: true }),
    });

    const newTodo = {
      title: 'New Todo',
      description: 'Description',
    };

    await expect(result.current.createTodo(newTodo)).rejects.toThrow();

    // Should rollback optimistic update
    await waitFor(() => {
      expect(result.current.todos).toHaveLength(0);
    });
  });
});
```

---

### Context Testing

**Goal:** Test context providers and their consumers.

```typescript
// src/contexts/__tests__/AuthContext.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';

describe('AuthContext', () => {
  it('should start with unauthenticated state', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('should authenticate user on login', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    const credentialResponse = {
      credential: 'mock-jwt-token',
      select_by: 'btn',
    };

    await result.current.login(credentialResponse);

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toBeDefined();
    });
  });

  it('should clear auth state on logout', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    // Login first
    await result.current.login({
      credential: 'mock-jwt-token',
      select_by: 'btn',
    });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    // Logout
    await result.current.logout();

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });
});
```

---

### API Client Testing

**Goal:** Test API client methods and error handling.

```typescript
// src/services/__tests__/api.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { createAuthenticatedApiClient } from '../api';

vi.mock('axios');

describe('TokenAwareApiClient', () => {
  let apiClient: ReturnType<typeof createAuthenticatedApiClient>;
  let getToken: vi.Mock;
  let onAuthError: vi.Mock;

  beforeEach(() => {
    getToken = vi.fn(() => 'mock-token');
    onAuthError = vi.fn();
    apiClient = createAuthenticatedApiClient(getToken, onAuthError);
  });

  it('should inject authorization token', async () => {
    const mockResponse = { data: { success: true, data: [] } };
    vi.mocked(axios.create).mockReturnValue({
      get: vi.fn().mockResolvedValue(mockResponse),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    } as any);

    await apiClient.getTodos();

    expect(getToken).toHaveBeenCalled();
  });

  it('should call onAuthError on 401 response', async () => {
    const mockError = {
      response: { status: 401, data: { message: 'Unauthorized' } },
    };

    vi.mocked(axios.create).mockReturnValue({
      get: vi.fn().mockRejectedValue(mockError),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn((success, error) => error(mockError)) },
      },
    } as any);

    try {
      await apiClient.getTodos();
    } catch (error) {
      // Expected error
    }

    expect(onAuthError).toHaveBeenCalled();
  });
});
```

---

## Testing Utilities

### Test Wrapper

**Purpose:** Provide necessary context providers for tests.

```typescript
// src/test/test-utils.tsx
import React, { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { ToastProvider } from '../contexts/ToastContext';
import { AreaProvider } from '../contexts/AreaContext';

interface WrapperOptions {
  isAuthenticated?: boolean;
  user?: any;
  apiError?: boolean;
}

export const createWrapper = (options: WrapperOptions = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries in tests
        cacheTime: 0, // No caching in tests
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <AreaProvider>
              {children}
            </AreaProvider>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};
```

### Test Factories

**Purpose:** Generate test data with sensible defaults.

```typescript
// src/test/factories.ts
import { Todo, Area, Tag } from '../types';

let idCounter = 1;

export const createTodo = (overrides: Partial<Todo> = {}): Todo => ({
  id: idCounter++,
  title: 'Test Todo',
  description: 'Test Description',
  completed: false,
  due_date: null,
  is_today: false,
  area_id: null,
  reference_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  completed_at: null,
  ...overrides,
});

export const createArea = (overrides: Partial<Area> = {}): Area => ({
  id: idCounter++,
  name: 'Test Area',
  description: 'Test Description',
  color: '#1976D2',
  reference_code: 'TST',
  is_default: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const createTag = (overrides: Partial<Tag> = {}): Tag => ({
  id: idCounter++,
  name: 'test-tag',
  usage_count: 1,
  created_at: new Date().toISOString(),
  last_used: new Date().toISOString(),
  ...overrides,
});

export const createTodoList = (count: number): Todo[] => {
  return Array.from({ length: count }, (_, i) =>
    createTodo({ id: i + 1, title: `Todo ${i + 1}` })
  );
};
```

### User Interaction Helpers

**Purpose:** Encapsulate common user interactions.

```typescript
// src/test/user-interactions.ts
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';

export const userInteractions = {
  /**
   * Fill and submit the add todo form
   */
  async addTodo(title: string, description?: string) {
    const user = userEvent.setup();
    
    // Open modal
    const addButton = screen.getByRole('button', { name: /Add Todo/i });
    await user.click(addButton);

    // Fill form
    const titleInput = screen.getByLabelText(/Title/i);
    await user.type(titleInput, title);

    if (description) {
      const descInput = screen.getByLabelText(/Description/i);
      await user.type(descInput, description);
    }

    // Submit
    const submitButton = screen.getByRole('button', { name: /Create/i });
    await user.click(submitButton);
  },

  /**
   * Toggle todo completion checkbox
   */
  async toggleTodoCompletion(todoTitle: string) {
    const user = userEvent.setup();
    
    const todoRow = screen.getByText(todoTitle).closest('[data-testid="todo-item"]');
    const checkbox = todoRow?.querySelector('input[type="checkbox"]') as HTMLInputElement;
    
    if (checkbox) {
      await user.click(checkbox);
    }
  },

  /**
   * Delete a todo
   */
  async deleteTodo(todoTitle: string) {
    const user = userEvent.setup();
    
    const todoRow = screen.getByText(todoTitle).closest('[data-testid="todo-item"]');
    const actionsButton = todoRow?.querySelector('[data-testid="todo-actions"]') as HTMLElement;
    
    if (actionsButton) {
      await user.click(actionsButton);
      
      const deleteButton = screen.getByRole('menuitem', { name: /Delete/i });
      await user.click(deleteButton);
      
      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: /Confirm/i });
      await user.click(confirmButton);
    }
  },

  /**
   * Change view (Today, All, Completed)
   */
  async changeView(viewName: 'Today' | 'All' | 'Completed') {
    const user = userEvent.setup();
    
    const viewButton = screen.getByRole('button', { name: viewName });
    await user.click(viewButton);
  },

  /**
   * Login with Google
   */
  async login(rememberMe: boolean = false) {
    const user = userEvent.setup();
    
    if (rememberMe) {
      const rememberCheckbox = screen.getByLabelText(/Remember Me/i);
      await user.click(rememberCheckbox);
    }

    const loginButton = screen.getByRole('button', { name: /Sign in with Google/i });
    await user.click(loginButton);
  },
};
```

---

## Best Practices

### 1. Test Behavior, Not Implementation

**Bad:**
```typescript
it('should call setState with correct value', () => {
  const setState = vi.fn();
  render(<Component setState={setState} />);
  expect(setState).toHaveBeenCalledWith('value');
});
```

**Good:**
```typescript
it('should display updated value when button is clicked', async () => {
  const user = userEvent.setup();
  render(<Component />);
  
  const button = screen.getByRole('button');
  await user.click(button);
  
  expect(screen.getByText('Updated Value')).toBeInTheDocument();
});
```

---

### 2. Use Accessible Queries

**Query Priority:**
1. `getByRole` (preferred)
2. `getByLabelText` (for forms)
3. `getByPlaceholderText` (forms)
4. `getByText` (content)
5. `getByTestId` (last resort)

**Good:**
```typescript
const button = screen.getByRole('button', { name: /Submit/i });
const input = screen.getByLabelText(/Email/i);
```

**Bad:**
```typescript
const button = screen.getByTestId('submit-button');
```

---

### 3. Async Testing

**Use `waitFor` for async updates:**

```typescript
it('should display todos after loading', async () => {
  render(<TodoList />);

  // Wait for loading to complete
  await waitFor(() => {
    expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
  });

  // Check for todos
  expect(screen.getByText('Test Todo')).toBeInTheDocument();
});
```

---

### 4. Mock External Dependencies

**Mock API calls:**

```typescript
// src/test/api-mocks.ts
export const mockApiResponse = {
  getTodos: {
    success: true,
    data: [
      createTodo({ id: 1, title: 'Mock Todo 1' }),
      createTodo({ id: 2, title: 'Mock Todo 2' }),
    ],
    count: 2,
  },
};

// In test
vi.mock('../services/api', () => ({
  createAuthenticatedApiClient: () => ({
    getTodos: vi.fn().mockResolvedValue(mockApiResponse.getTodos),
  }),
}));
```

---

### 5. Clean Up After Tests

**Use `beforeEach` and `afterEach`:**

```typescript
describe('MyComponent', () => {
  beforeEach(() => {
    // Setup
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Cleanup
    vi.restoreAllMocks();
  });

  it('should render correctly', () => {
    // Test
  });
});
```

---

## Coverage Reports

### Generate Coverage

```bash
npm run test:coverage
```

### Coverage Output

```
---------------------------|---------|----------|---------|---------|-------------------
File                       | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
---------------------------|---------|----------|---------|---------|-------------------
All files                  |   78.45 |    72.31 |   81.22 |   79.12 |
 src/                      |   85.23 |    78.91 |   88.76 |   86.45 |
  App.tsx                  |     100 |      100 |     100 |     100 |
  main.tsx                 |       0 |        0 |       0 |       0 | 1-15
 src/components/           |   72.34 |    65.78 |   75.23 |   73.45 |
  Dashboard.tsx            |   68.45 |    60.23 |   70.12 |   69.34 | 45-67, 89-102
  TodoList.tsx             |   78.90 |    72.34 |   80.45 |   79.67 | 123-145
  TodoItem.tsx             |   85.67 |    78.90 |   88.23 |   86.78 | 234-245
 src/hooks/                |   82.45 |    75.67 |   85.34 |   83.56 |
  useApi.ts                |   90.12 |    82.34 |   92.45 |   91.23 |
  useTodoStore.ts          |   78.90 |    70.45 |   82.12 |   80.34 | 345-367
 src/contexts/             |   88.23 |    82.45 |   90.12 |   89.34 |
  AuthContext.tsx          |   92.34 |    85.67 |   94.23 |   93.45 |
  ToastContext.tsx         |   84.12 |    79.23 |   86.01 |   85.23 |
 src/services/             |   75.67 |    68.90 |   78.45 |   76.89 |
  api.ts                   |   75.67 |    68.90 |   78.45 |   76.89 | 456-478, 501-523
---------------------------|---------|----------|---------|---------|-------------------
```

### Coverage Targets

- ✅ Overall: >80% (Current: ~78%)
- ⚠️ Components: >85% (Current: ~72%)
- ✅ Hooks: >90% (Current: ~82%)
- ✅ Contexts: >90% (Current: ~88%)
- ⚠️ Services: >85% (Current: ~76%)

---

## Integration Testing (Planned)

### E2E Testing with Playwright (Planned)

**Setup:**
```bash
npm install -D @playwright/test
npx playwright install
```

**Example E2E Test:**

```typescript
// e2e/todo-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Todo Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app and login
    await page.goto('http://localhost:5173');
    await page.click('text=Sign in with Google');
    // Mock Google OAuth (with test credentials)
  });

  test('should create, complete, and delete a todo', async ({ page }) => {
    // Create todo
    await page.click('button:has-text("Add Todo")');
    await page.fill('input[name="title"]', 'E2E Test Todo');
    await page.fill('textarea[name="description"]', 'This is an E2E test');
    await page.click('button:has-text("Create")');

    // Verify todo appears
    await expect(page.locator('text=E2E Test Todo')).toBeVisible();

    // Complete todo
    await page.click('[data-testid="todo-item"]:has-text("E2E Test Todo") input[type="checkbox"]');
    await expect(page.locator('text=E2E Test Todo')).toHaveClass(/completed/);

    // Delete todo
    await page.click('[data-testid="todo-actions"]:near(:text("E2E Test Todo"))');
    await page.click('text=Delete');
    await page.click('button:has-text("Confirm")');

    // Verify todo is gone
    await expect(page.locator('text=E2E Test Todo')).not.toBeVisible();
  });
});
```

---

## CI/CD Integration (Planned)

### GitHub Actions (Example)

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test -- --coverage
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

---

## Related Documentation

- **[API.md](./api/API.md)** - Frontend API consumption patterns
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture
- **[STATUS.md](./STATUS.md)** - Current implementation status
- **[FEATURES.md](./FEATURES.md)** - Feature specifications
- **[Backend Testing](../../yeezles-todo/docs/TESTING.md)** - Backend testing guide

---

## Change Log

### Version 1.0.0 (November 20, 2025)
- ✅ Initial testing documentation
- ✅ TDD workflow established
- ✅ Testing utilities and factories
- ✅ Component testing patterns
- ✅ Hook testing patterns
- ✅ Context testing patterns
- ✅ API client testing patterns
- ⚠️ Current coverage ~40% (Target: >80%)
- 🔄 E2E testing planned (Playwright)
- 🔄 CI/CD integration planned

