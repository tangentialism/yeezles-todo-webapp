# Yeezles Todo Web Application - API Documentation

**Version:** 1.0.0  
**Last Updated:** November 20, 2025

---

## Overview

The Yeezles Todo Web Application is a React-based single-page application (SPA) that consumes the Yeezles Todo Backend API. This document describes the frontend API consumption patterns, client architecture, authentication flow, and state management strategies.

**Architecture:** React Client → Google OAuth → Backend API → PostgreSQL

---

## Base URLs

### Frontend Application
- **Production**: `https://yeezlestodo.com`
- **Local Development**: `http://localhost:5173`

### Backend API
- **Production**: `https://api.yeezlestodo.com`
- **Local Development**: Configured via `VITE_API_BASE_URL` environment variable

---

## API Client Architecture

### TokenAwareApiClient

The webapp uses a custom `TokenAwareApiClient` class that wraps Axios and provides:
- **Automatic token injection**: Includes Google ID token in `Authorization` header
- **Cookie-based sessions**: Supports persistent "Remember Me" sessions
- **Request/response interceptors**: Centralized error handling and authentication
- **Type-safe interfaces**: Full TypeScript support

**Implementation Location:** `src/services/api.ts`

**Example:**

```typescript
// Create authenticated API client
const apiClient = createAuthenticatedApiClient(
  getValidToken,    // Function to retrieve current auth token
  onAuthError       // Callback for 401/403 errors
);

// The client automatically includes:
// - Authorization: Bearer <google-id-token>
// - withCredentials: true (for cookies)
// - Content-Type: application/json
```

### Request Interceptor Pattern

The API client automatically injects authentication tokens on every request:

```typescript
this.api.interceptors.request.use(
  (config) => {
    const token = this.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  }
);
```

### Response Interceptor Pattern

Automatic error handling with auth error detection:

```typescript
this.api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Trigger logout and redirect to login
      this.onAuthError();
    }
    throw error;
  }
);
```

---

## Authentication Flow

### Google OAuth 2.0

The webapp uses Google OAuth for user authentication with optional persistent sessions.

#### Authentication Architecture

```
┌──────────────┐
│  User Visits │
│   Webapp     │
└──────┬───────┘
       │
       ▼
┌────────────────────────┐
│  AuthContext Provider  │
│  - Check localStorage  │
│  - Validate session    │
└──────┬─────────────────┘
       │
       ▼
┌────────────────────────┐     ┌──────────────────┐
│ Has Persistent Session?│────▶│ Restore Session  │
└──────┬─────────────────┘     │ + User Info      │
       │ No                     └──────────────────┘
       ▼
┌────────────────────────┐
│  Show Login Button     │
│  (Google Sign-In)      │
└──────┬─────────────────┘
       │ User clicks
       ▼
┌────────────────────────┐
│  Google OAuth Popup    │
│  - User authenticates  │
│  - Consent screen      │
└──────┬─────────────────┘
       │ Returns credential
       ▼
┌────────────────────────┐
│  Frontend Processing   │
│  - Decode JWT          │
│  - Extract user info   │
│  - Store in memory     │
└──────┬─────────────────┘
       │ Optional
       ▼
┌────────────────────────┐
│  "Remember Me" Flow    │
│  - POST /auth/login    │
│  - Backend creates     │
│    persistent session  │
│  - Sets HTTP-only      │
│    cookie              │
└──────┬─────────────────┘
       │
       ▼
┌────────────────────────┐
│  Authenticated State   │
│  - Show Dashboard      │
│  - Enable API calls    │
└────────────────────────┘
```

#### Authentication Methods

The webapp supports two authentication methods:

**1. Google OAuth (In-Memory Tokens)**
- **Duration**: Token expires after ~1 hour
- **Storage**: ID token stored in memory only (React state)
- **Security**: High - no token persistence
- **Use Case**: Default authentication, requires re-login after browser close

**2. Persistent Session (Remember Me)**
- **Duration**: 30 days with automatic rotation
- **Storage**: HTTP-only secure cookie (managed by backend)
- **Security**: High - cookie not accessible to JavaScript
- **Use Case**: "Remember Me" checkbox on login

#### Login Process

**Component:** `src/contexts/AuthContext.tsx`

```typescript
// 1. User clicks Google Sign-In button
const login = async (
  credentialResponse: GoogleCredentialResponse,
  rememberMe: boolean = false
) => {
  // 2. Decode JWT to extract user info
  const payload = JSON.parse(atob(credentialResponse.credential.split('.')[1]));
  
  const user = {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
  };

  // 3. Store user in localStorage (but NOT the token)
  localStorage.setItem('user', JSON.stringify(user));
  
  // 4. Store token in memory for API calls
  setAuthState({
    user,
    idToken: credentialResponse.credential,
    tokenExpiry: payload.exp,
    isAuthenticated: true,
    authMethod: 'google-oauth',
  });

  // 5. Optional: Create persistent session for "Remember Me"
  if (rememberMe) {
    await apiClient.login({
      googleToken: credentialResponse.credential,
      rememberMe: true
    });
    // Backend sets HTTP-only cookie for future sessions
  }
};
```

#### Session Validation on App Startup

**Component:** `src/contexts/AuthContext.tsx`

```typescript
// Check for valid persistent session on app load
const checkPersistentSession = async () => {
  try {
    // Call backend with cookie credentials
    const response = await apiClient.validatePersistentSession();
    
    if (response.success && response.data.user) {
      // Restore authenticated state without requiring new login
      setAuthState({
        user: {
          id: response.data.user.email,
          email: response.data.user.email,
          name: response.data.user.name,
        },
        isAuthenticated: true,
        authMethod: 'persistent-session',
        hasPersistentSession: true,
      });
      return true;
    }
  } catch (error) {
    console.log('No valid persistent session found');
  }
  return false;
};
```

#### Token Management

The webapp implements smart token validation:

```typescript
// Check if token is still valid (with 5-minute buffer)
const isTokenValid = (token: string | null, expiry: number | null): boolean => {
  if (!token || !expiry) return false;
  // Add 5-minute buffer for network delays
  return Date.now() < (expiry - 300) * 1000;
};

// Get valid token for API calls
const getValidToken = (): string | null => {
  if (isTokenValid(authState.idToken, authState.tokenExpiry)) {
    return authState.idToken;
  }
  return null; // Token expired or invalid
};
```

#### Session Health Monitoring

For persistent sessions, the webapp monitors session health:

```typescript
// Check session expiration and health
const checkSessionHealth = async () => {
  if (authMethod !== 'persistent-session') return;

  const response = await apiClient.getSessionHealth();
  
  if (response.data.needsRefreshWarning) {
    // Show warning: "Your session expires in X days"
    showToast({
      message: `Session expires in ${response.data.daysUntilExpiry} days`,
      type: 'warning',
      action: {
        label: 'Refresh Session',
        onClick: () => {
          // Trigger re-authentication to extend session
          window.google.accounts.id.prompt();
        }
      }
    });
  }
};

// Check every hour for active sessions
useEffect(() => {
  if (hasPersistentSession) {
    checkSessionHealth();
    const interval = setInterval(checkSessionHealth, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }
}, [hasPersistentSession]);
```

#### Logout Process

```typescript
const logout = async (signOutEverywhere: boolean = false) => {
  if (signOutEverywhere) {
    // Revoke all persistent sessions across all devices
    await apiClient.revokeAllSessions();
  }

  // Clear local state
  localStorage.removeItem('user');
  setAuthState({
    user: null,
    idToken: null,
    isAuthenticated: false,
    authMethod: null,
    hasPersistentSession: false,
  });
  
  // Revoke Google session
  if (window.google) {
    window.google.accounts.id.revoke(user.email);
  }
};
```

---

## API Consumption Patterns

### useApi Hook

The webapp provides a custom hook that integrates the API client with authentication:

**Implementation:** `src/hooks/useApi.ts`

```typescript
export const useApi = (): TokenAwareApiClient => {
  const { getValidToken, logout } = useAuth();

  const apiClient = useMemo(() => {
    const handleAuthError = () => {
      console.warn('Authentication error detected, logging out user');
      logout(); // Force logout on 401/403 errors
    };

    return createAuthenticatedApiClient(getValidToken, handleAuthError);
  }, [getValidToken, logout]);

  return apiClient;
};
```

**Usage in Components:**

```typescript
import { useApi } from '../hooks/useApi';

function MyComponent() {
  const apiClient = useApi();
  
  // Make authenticated API calls
  const todos = await apiClient.getTodos({ completed: false });
  const todo = await apiClient.createTodo({ title: 'New Todo' });
}
```

### React Query Integration

The webapp uses TanStack Query (React Query) for server state management:

**Configuration:** `src/App.tsx`

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on authentication errors
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          return false;
        }
        return failureCount < 3; // Retry other errors up to 3 times
      },
    },
    mutations: {
      retry: 1, // Retry mutations once on failure
    },
  },
});
```

### State Management with useTodoStore

The webapp uses a custom hook that combines React Query with optimistic updates:

**Implementation:** `src/hooks/useTodoStore.ts`

```typescript
export const useTodoStore = (options = {}) => {
  const apiClient = useApi();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // Fetch todos with React Query
  const { data: todos, isLoading } = useQuery({
    queryKey: ['todos', filters],
    queryFn: async () => {
      const response = await apiClient.getTodos(filters);
      return response.data;
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Background sync every 60 seconds
  });

  // Create mutation with optimistic updates
  const createTodoMutation = useMutation({
    mutationFn: async (newTodo) => {
      const response = await apiClient.createTodo(newTodo);
      return response.data;
    },
    onMutate: async (newTodo) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries(['todos']);

      // Snapshot previous value
      const previousTodos = queryClient.getQueryData(['todos']);

      // Optimistically update cache
      const optimisticTodo = {
        id: Date.now(), // Temporary ID
        ...newTodo,
        completed: false,
        created_at: new Date().toISOString(),
        _optimistic: true,
      };

      queryClient.setQueryData(['todos'], (old) => [optimisticTodo, ...old]);

      return { previousTodos, optimisticTodo };
    },
    onError: (err, newTodo, context) => {
      // Rollback on error
      queryClient.setQueryData(['todos'], context.previousTodos);
      showToast({ message: 'Failed to create todo', type: 'error' });
    },
    onSuccess: (data, variables, context) => {
      // Replace optimistic todo with real data from server
      queryClient.setQueryData(['todos'], (old) =>
        old.map(todo => 
          todo.id === context.optimisticTodo.id ? data : todo
        )
      );
      showToast({ message: 'Todo created!', type: 'success' });
    },
  });

  return {
    todos,
    isLoading,
    createTodo: createTodoMutation.mutateAsync,
    // ... other actions
  };
};
```

**Benefits:**
- ✅ Instant UI feedback with optimistic updates
- ✅ Automatic rollback on errors
- ✅ Background synchronization
- ✅ Smart caching and refetching
- ✅ Request deduplication

---

## API Methods

### Authentication Endpoints

#### POST /auth/login

Create persistent session with "Remember Me" functionality.

**Request:**

```typescript
interface LoginRequest {
  googleToken: string;  // Google ID token from OAuth
  rememberMe?: boolean; // Default: false
}

await apiClient.login({
  googleToken: credentialResponse.credential,
  rememberMe: true
});
```

**Response:**

```typescript
interface LoginResponse {
  success: boolean;
  data: {
    user: {
      email: string;
      name: string;
      picture?: string;
    };
    sessionCreated: boolean;
    rememberMeEnabled: boolean;
  };
}
```

**Side Effects:**
- Sets HTTP-only secure cookie: `persistent_session_token`
- Cookie duration: 30 days
- Cookie attributes: `HttpOnly, Secure, SameSite=Strict`

---

#### POST /auth/validate-persistent

Validate persistent session from cookie.

**Request:**

```typescript
// No parameters - uses cookie automatically
await apiClient.validatePersistentSession();
```

**Response:**

```typescript
interface ValidatePersistentResponse {
  success: boolean;
  data: {
    user: {
      email: string;
      name: string;
      authMethod: string;
    };
    session: {
      id: number;
      platform: string;
      lastUsed: string;
      expiresAt: string;
    };
    tokenRotated: boolean; // True if cookie was refreshed
  };
}
```

**Token Rotation:**
- Automatically rotates token if < 7 days until expiry
- Extends session by 30 days on rotation
- Seamless to user - happens in background

---

#### GET /auth/sessions

Get all active sessions for current user.

**Request:**

```typescript
await apiClient.getUserSessions();
```

**Response:**

```typescript
interface SessionsResponse {
  success: boolean;
  data: {
    sessions: UserSession[];
    totalCount: number;
  };
}

interface UserSession {
  id: number;
  platform: string;        // e.g., "web-chrome-macos"
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  userAgentHash: string;
  isCurrent: boolean;      // True for current session
}
```

**Use Case:** Display active sessions in settings page

---

#### DELETE /auth/sessions/:sessionId

Revoke specific session (sign out from one device).

**Request:**

```typescript
await apiClient.revokeSession(sessionId);
```

**Response:**

```typescript
{
  success: boolean;
  data: {
    sessionId: number;
    revoked: boolean;
  };
}
```

---

#### DELETE /auth/sessions

Revoke all sessions (sign out everywhere).

**Request:**

```typescript
await apiClient.revokeAllSessions();
```

**Response:**

```typescript
{
  success: boolean;
  data: {
    revokedCount: number;
    message: string;
  };
}
```

**Use Case:** "Sign Out Everywhere" button in settings

---

#### GET /auth/session-health

Check current session health and expiration.

**Request:**

```typescript
await apiClient.getSessionHealth();
```

**Response:**

```typescript
interface SessionHealthResponse {
  success: boolean;
  data: {
    hasSession: boolean;
    isValid: boolean;
    sessionId?: number;
    platform?: string;
    expiresAt?: string;
    daysUntilExpiry?: number;
    needsRefreshWarning?: boolean; // True if < 7 days
    lastUsedAt?: string;
    userEmail?: string;
    message?: string;
  };
}
```

**Use Case:** Session expiration warnings

---

### Todo Management Endpoints

#### GET /todos

Retrieve todos with filtering and sorting.

**Request:**

```typescript
interface TodoFilters {
  completed?: boolean;
  tags?: string[];
  tag_mode?: 'AND' | 'OR';
  due_date_from?: string;
  due_date_to?: string;
  search?: string;
  sort_by?: 'created_at' | 'updated_at' | 'due_date' | 'completed_at';
  sort_order?: 'ASC' | 'DESC';
  limit?: number;
  html?: boolean;
  area_id?: number;
  area_name?: string;
  include_all_areas?: boolean;
}

// Examples:
await apiClient.getTodos();
await apiClient.getTodos({ completed: false });
await apiClient.getTodos({ tags: ['priority-1'], search: 'meeting' });
await apiClient.getTodos({ area_id: 1, completed: false });
```

**Response:**

```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  message?: string;
}

// Returns: ApiResponse<Todo[]>
```

---

#### POST /todos

Create new todo.

**Request:**

```typescript
interface CreateTodoRequest {
  title: string;
  description?: string;
  due_date?: string;
  is_today?: boolean;
  area_id?: number | null;
  reference_url?: string;
}

// Examples:
await apiClient.createTodo({
  title: 'Review pull requests',
  description: 'Check team PRs from this morning',
  is_today: true,
  area_id: 1
});

await apiClient.createTodo({
  title: 'Call dentist',
  due_date: '2025-11-25T14:00:00Z',
  area_id: 2
});
```

**Response:**

```typescript
// Returns: ApiResponse<Todo>
```

**Auto-Processing:**
- Tags extracted from `@tagname` format in title/description
- Cross-references detected from `#123` format
- Area assignment validated
- Timestamps auto-generated

---

#### GET /todos/:id

Get single todo by ID.

**Request:**

```typescript
await apiClient.getTodo(123);
await apiClient.getTodo(123, true); // With HTML processing
```

**Response:**

```typescript
// Without HTML: ApiResponse<Todo>
// With HTML: ApiResponse<TodoWithHtml>

interface TodoWithHtml extends Todo {
  title_html: string;
  description_html: string;
  tags?: Tag[];
  cross_references: {
    incoming: Array<{ id: number; title: string }>;
    outgoing: Array<{ id: number; title: string }>;
  };
  link_processing: {
    title: {
      references: number[];
      broken_references: number[];
    };
    description: {
      references: number[];
      broken_references: number[];
    };
  };
}
```

---

#### PUT /todos/:id

Update todo.

**Request:**

```typescript
interface UpdateTodoRequest {
  title?: string;
  description?: string;
  completed?: boolean;
  due_date?: string;
  is_today?: boolean;
  area_id?: number | null;
  reference_url?: string;
}

// Examples:
await apiClient.updateTodo(123, {
  completed: true
});

await apiClient.updateTodo(123, {
  title: 'Updated title',
  due_date: '2025-11-26T10:00:00Z'
});
```

**Response:**

```typescript
// Returns: ApiResponse<Todo>
```

**Automatic Fields:**
- `updated_at` - Set to current timestamp
- `completed_at` - Set when completed=true, cleared when completed=false

---

#### DELETE /todos/:id

Soft delete todo.

**Request:**

```typescript
await apiClient.deleteTodo(123);
```

**Response:**

```typescript
// Returns: ApiResponse<void>
```

**Note:** Soft delete - todo remains in database with `deleted_at` timestamp

---

#### POST /todos/:id/move-to-today

Add todo to today list.

**Request:**

```typescript
await apiClient.moveToToday(123);
await apiClient.moveToToday(123, true); // With HTML processing
```

**Response:**

```typescript
// Returns: ApiResponse<Todo>
```

**Side Effect:** Sets `is_today = true` on the todo

---

#### POST /todos/:id/remove-from-today

Remove todo from today list.

**Request:**

```typescript
await apiClient.removeFromToday(123);
await apiClient.removeFromToday(123, true); // With HTML processing
```

**Response:**

```typescript
// Returns: ApiResponse<Todo>
```

**Side Effect:** Sets `is_today = false` on the todo

---

#### GET /todos/today

Get smart today view with categorization.

**Request:**

```typescript
await apiClient.getTodayView();
await apiClient.getTodayView(true, 3); // Include due today, 3 days ahead
await apiClient.getTodayView(false, 7); // Exclude due today, 7 days ahead
```

**Response:**

```typescript
interface TodayView {
  focus: {
    today_tagged: Todo[];    // is_today = true
    due_today: Todo[];       // due_date = today
    overdue: Todo[];         // due_date < today
    total_today: number;
    total_focus: number;
  };
  upcoming: {
    coming_soon: Todo[];     // due within X days
    total_coming_soon: number;
  };
  summary: {
    total_today_items: number;
    total_overdue: number;
    total_coming_soon: number;
    total_focus_items: number;
    needs_attention: boolean; // True if overdue > 0
  };
}

// Returns: ApiResponse<TodayView>
```

**Smart Categorization:**
- **Overdue**: Past due date, incomplete
- **Due Today**: Due date = today, incomplete
- **Today Tagged**: `is_today = true`, incomplete
- **Coming Soon**: Due within configured days ahead
- **Deduplication**: Todos don't appear in multiple categories

---

### Area Management Endpoints

#### GET /areas

Get all areas (optionally with statistics).

**Request:**

```typescript
await apiClient.getAreas();
await apiClient.getAreas(true); // Include statistics
```

**Response:**

```typescript
// Without stats: ApiResponse<Area[]>
// With stats: ApiResponse<AreaWithStats[]>

interface Area {
  id: number;
  name: string;
  description: string;
  color: string;
  reference_code: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface AreaWithStats extends Area {
  stats: {
    total_todos: number;
    completed_todos: number;
    incomplete_todos: number;
    completion_rate: number;
  };
}
```

---

#### POST /areas

Create new area.

**Request:**

```typescript
interface CreateAreaRequest {
  name: string;
  description?: string;
  color: string;
  is_default?: boolean;
}

await apiClient.createArea({
  name: 'Work',
  description: 'Professional tasks',
  color: '#1976D2', // Material Design Blue
  is_default: true
});
```

**Response:**

```typescript
// Returns: ApiResponse<Area>
```

**Auto-Processing:**
- Reference code auto-generated from name (URL-safe)
- Default area constraint enforced (only one default)
- Color validated against Material Design palette

---

#### GET /areas/:id

Get single area by ID.

**Request:**

```typescript
await apiClient.getArea(1);
```

**Response:**

```typescript
// Returns: ApiResponse<Area>
```

---

#### GET /areas/:id/stats

Get area with detailed statistics.

**Request:**

```typescript
await apiClient.getAreaStats(1);
```

**Response:**

```typescript
// Returns: ApiResponse<AreaWithStats>
```

---

#### PUT /areas/:id

Update area.

**Request:**

```typescript
interface UpdateAreaRequest {
  name?: string;
  description?: string;
  color?: string;
  is_default?: boolean;
}

await apiClient.updateArea(1, {
  name: 'Updated Name',
  color: '#388E3C' // Material Design Green
});
```

**Response:**

```typescript
// Returns: ApiResponse<Area>
```

---

#### DELETE /areas/:id

Delete area (with protection).

**Request:**

```typescript
await apiClient.deleteArea(1);
```

**Response:**

```typescript
// Returns: ApiResponse<void>
```

**Protection:**
- Cannot delete area with incomplete todos
- Returns error if area has active tasks

---

#### GET /areas/colors

Get available Material Design colors.

**Request:**

```typescript
await apiClient.getAvailableColors();
```

**Response:**

```typescript
// Returns: ApiResponse<string[]>
// Example: ["#1976D2", "#388E3C", "#7B1FA2", ...]
```

---

### Data Export/Import

#### GET /export

Export all todos and related data.

**Request:**

```typescript
await apiClient.exportData();
await apiClient.exportData(true, true); // Include completed, include tags
```

**Response:**

```json
{
  "success": true,
  "data": {
    "export_date": "2025-11-20T12:00:00Z",
    "total_todos": 150,
    "todos": [...],
    "tags": [...],
    "areas": [...]
  }
}
```

---

#### POST /import

Import todos from JSON.

**Request:**

```typescript
await apiClient.importData(exportedData, {
  merge: true,  // Merge with existing data
  overwrite: false
});
```

**Response:**

```json
{
  "success": true,
  "data": {
    "imported": 150,
    "skipped": 5,
    "errors": []
  }
}
```

---

## Error Handling

### Error Response Format

All API errors follow a consistent format:

```typescript
interface ApiError {
  success: false;
  message: string;
  error?: string;
  code?: string;
}
```

### Common HTTP Status Codes

| Status | Meaning | Frontend Action |
|--------|---------|----------------|
| 200 | Success | Process response data |
| 201 | Created | Process created resource |
| 400 | Bad Request | Show validation errors to user |
| 401 | Unauthorized | Logout user, redirect to login |
| 403 | Forbidden | Show "Access denied" message |
| 404 | Not Found | Show "Resource not found" |
| 429 | Too Many Requests | Show "Please try again later" |
| 500 | Server Error | Show generic error, retry |

### Error Handling in Components

```typescript
import { useToast } from '../contexts/ToastContext';

function MyComponent() {
  const { showToast } = useToast();
  const apiClient = useApi();

  const handleAction = async () => {
    try {
      await apiClient.createTodo({ title: 'New Todo' });
      showToast({ message: 'Success!', type: 'success' });
    } catch (error) {
      if (error.response?.status === 401) {
        // Automatic logout handled by interceptor
        return;
      }
      
      if (error.response?.status === 400) {
        // Validation error
        showToast({
          message: error.response.data.message || 'Invalid input',
          type: 'error'
        });
        return;
      }

      // Generic error
      showToast({
        message: 'Something went wrong. Please try again.',
        type: 'error'
      });
    }
  };
}
```

### Automatic Retry Logic

React Query handles automatic retries:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Never retry auth errors
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          return false;
        }
        
        // Never retry 400 (bad request)
        if (error?.response?.status === 400) {
          return false;
        }
        
        // Retry other errors up to 3 times
        return failureCount < 3;
      },
    },
  },
});
```

---

## Type Definitions

### Core Types

**Todo:**

```typescript
interface Todo {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  due_date: string | null;
  is_today: boolean;
  area_id: number | null;
  reference_url: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}
```

**Area:**

```typescript
interface Area {
  id: number;
  name: string;
  description: string;
  color: string;
  reference_code: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}
```

**Tag:**

```typescript
interface Tag {
  id: number;
  name: string;
  usage_count: number;
  created_at: string;
  last_used: string;
}
```

### Response Types

All API responses use the `ApiResponse<T>` wrapper:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  message?: string;
  html_processed?: boolean;
}
```

---

## Related Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Component architecture and state management
- **[STATUS.md](./STATUS.md)** - Current implementation status
- **[FEATURES.md](./FEATURES.md)** - Feature specifications
- **[TESTING.md](./TESTING.md)** - Testing strategies and patterns
- **[Backend API Documentation](../../yeezles-todo/docs/api/API.md)** - Full backend API reference

---

## Change Log

### Version 1.0.0 (November 20, 2025)
- ✅ Initial documentation
- ✅ Google OAuth authentication flow
- ✅ Persistent session management
- ✅ React Query integration
- ✅ Optimistic updates
- ✅ Comprehensive error handling
- ✅ Type-safe API client

