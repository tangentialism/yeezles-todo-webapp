# Yeezles Todo Web Application - Architecture

**Last Updated:** November 20, 2025

---

## Overview

The Yeezles Todo Web Application is a modern, production-ready single-page application (SPA) built with React, TypeScript, and TanStack Query. It implements Google OAuth authentication, optimistic updates, and real-time synchronization for a seamless user experience.

**Architecture Pattern:** Client-Side SPA with Server State Management

---

## System Architecture

### High-Level Architecture

```
┌────────────────────────────────────────────────────────────┐
│                     Browser (Client)                        │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │              React Application (SPA)                   │ │
│  │                                                         │ │
│  │  ┌─────────────────────────────────────────────────┐  │ │
│  │  │  Context Providers (React Context API)          │  │ │
│  │  │  - AuthContext (authentication state)           │  │ │
│  │  │  - ToastContext (notifications)                 │  │ │
│  │  │  - AreaContext (current area selection)         │  │ │
│  │  └─────────────────────────────────────────────────┘  │ │
│  │                        │                               │ │
│  │  ┌─────────────────────▼───────────────────────────┐  │ │
│  │  │  React Query (TanStack Query)                   │  │ │
│  │  │  - Server state management                      │  │ │
│  │  │  - Caching & synchronization                    │  │ │
│  │  │  - Optimistic updates                           │  │ │
│  │  │  - Automatic refetching                         │  │ │
│  │  └─────────────────────┬───────────────────────────┘  │ │
│  │                        │                               │ │
│  │  ┌─────────────────────▼───────────────────────────┐  │ │
│  │  │  Custom Hooks (Business Logic)                  │  │ │
│  │  │  - useApi: Authenticated API client            │  │ │
│  │  │  - useTodoStore: Todo CRUD with optimistic     │  │ │
│  │  │  - useTodayViewStore: Today view management    │  │ │
│  │  │  - useAreaStore: Area management                │  │ │
│  │  │  - useSessionStore: Session health tracking    │  │ │
│  │  └─────────────────────┬───────────────────────────┘  │ │
│  │                        │                               │ │
│  │  ┌─────────────────────▼───────────────────────────┐  │ │
│  │  │  API Client (TokenAwareApiClient)               │  │ │
│  │  │  - Axios-based HTTP client                      │  │ │
│  │  │  - Auto token injection                         │  │ │
│  │  │  - Request/response interceptors                │  │ │
│  │  │  - Error handling                               │  │ │
│  │  └─────────────────────┬───────────────────────────┘  │ │
│  │                        │                               │ │
│  │  ┌─────────────────────▼───────────────────────────┐  │ │
│  │  │  React Components                               │  │ │
│  │  │  - Dashboard (main view)                        │  │ │
│  │  │  - ViewContainer (multi-view switcher)          │  │ │
│  │  │  - TodoList (optimized rendering)               │  │ │
│  │  │  - Modals (add, edit, area management)          │  │ │
│  │  └─────────────────────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────┘  │ │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS
                       │ (JWT Bearer + Cookies)
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              Yeezles Todo Backend API                        │
│                   (Express + PostgreSQL)                     │
└──────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Core Framework
- **React 19.1.1**: Modern React with concurrent features
- **TypeScript 5.8.3**: Type-safe development
- **Vite 7.1.0**: Fast build tool and dev server

### State Management
- **TanStack Query 5.84.2**: Server state management
- **React Context API**: Global client state (auth, toast, area)
- **Custom Hooks**: Encapsulated business logic

### UI & Styling
- **Tailwind CSS 3.4.10**: Utility-first CSS framework
- **PostCSS 8.4.47**: CSS processing
- **Responsive Design**: Mobile-first approach

### Networking
- **Axios 1.11.0**: HTTP client with interceptors
- **Google OAuth**: Authentication via `google-auth-library`

### Routing
- **React Router DOM 7.8.0**: Client-side routing

### Testing
- **Vitest 3.2.4**: Fast unit test runner
- **React Testing Library 16.3.0**: Component testing
- **jsdom 26.1.0**: DOM testing environment

### Development Tools
- **ESLint 9.32.0**: Code linting
- **TypeScript ESLint 8.39.0**: TypeScript-specific linting
- **Vite Plugin React 4.7.0**: Fast refresh and JSX support

---

## Core Components

### 1. Authentication Layer (AuthContext)

**Purpose:** Manage user authentication state and session lifecycle

**Key Responsibilities:**
- Google OAuth integration
- Token management (in-memory)
- Persistent session validation
- Session health monitoring
- Logout functionality

**Implementation:** `src/contexts/AuthContext.tsx`

**State Interface:**

```typescript
interface AuthState {
  user: User | null;
  idToken: string | null;              // Google ID token (in-memory only)
  tokenExpiry: number | null;          // Token expiration timestamp
  isAuthenticated: boolean;
  isLoading: boolean;
  isGoogleReady: boolean;              // Google OAuth script loaded
  authMethod: 'google-oauth' | 'persistent-session' | null;
  hasPersistentSession: boolean;       // Remember Me enabled
  sessionHealth: {
    daysUntilExpiry: number | null;
    needsRefreshWarning: boolean;
    lastChecked: number | null;
  };
}
```

**Key Methods:**

```typescript
interface AuthContextType extends AuthState {
  login: (credentialResponse: GoogleCredentialResponse, rememberMe?: boolean) => Promise<void>;
  logout: (signOutEverywhere?: boolean) => void;
  getValidToken: () => string | null;
  refreshTokenIfNeeded: () => Promise<void>;
  checkPersistentSession: () => Promise<boolean>;
  checkSessionHealth: () => Promise<void>;
}
```

**Authentication Flow:**

```
App Startup
    │
    ▼
┌──────────────────────┐
│ Check localStorage   │──────No user info──────┐
│ for user info        │                        │
└────────┬─────────────┘                        │
         │ Has user info                        │
         ▼                                      │
┌──────────────────────┐                        │
│ Validate Persistent  │                        │
│ Session (Cookie)     │                        │
└────────┬─────────────┘                        │
         │                                      │
    ┌────┴────┐                                 │
    │         │                                 │
Valid        Invalid                            │
Session      Session                            │
    │         │                                 │
    │         └──────────────┬──────────────────┘
    │                        │
    ▼                        ▼
┌──────────────────────┐ ┌──────────────────────┐
│ Restore Auth State   │ │ Show Login Screen    │
│ (Authenticated)      │ │ (Unauthenticated)    │
└──────────────────────┘ └──────────────────────┘
```

**Security Features:**
- ✅ Tokens stored in memory only (never localStorage)
- ✅ HTTP-only cookies for persistent sessions
- ✅ Automatic token validation with 5-minute buffer
- ✅ Session health monitoring with expiration warnings
- ✅ Secure logout with optional "sign out everywhere"

---

### 2. API Client Layer (TokenAwareApiClient)

**Purpose:** Centralized HTTP client with automatic authentication

**Implementation:** `src/services/api.ts`

**Architecture:**

```
Component
    │
    ▼
useApi Hook ──────► getValidToken() from AuthContext
    │
    ▼
TokenAwareApiClient
    │
    ├──► Request Interceptor
    │    ├─ Inject Authorization header
    │    └─ Set withCredentials: true
    │
    ├──► Axios HTTP Request
    │
    └──► Response Interceptor
         ├─ Handle 401/403 → onAuthError()
         └─ Return response or throw error
```

**Request Interceptor:**

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

**Response Interceptor:**

```typescript
this.api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Automatic logout on authentication failure
      this.onAuthError();
    }
    throw error;
  }
);
```

**Key Features:**
- ✅ Automatic token injection on every request
- ✅ Cookie credentials included (withCredentials: true)
- ✅ Centralized error handling
- ✅ Type-safe method signatures
- ✅ Comprehensive API surface (40+ methods)

---

### 3. State Management Layer (Custom Hooks)

#### useTodoStore Hook

**Purpose:** Todo CRUD operations with optimistic updates and caching

**Implementation:** `src/hooks/useTodoStore.ts`

**Key Features:**
- ✅ React Query integration for server state
- ✅ Optimistic updates for instant UI feedback
- ✅ Automatic rollback on errors
- ✅ Background synchronization (60-second intervals)
- ✅ Smart cache invalidation
- ✅ Undo functionality for completions

**Data Flow:**

```
Component Action (e.g., createTodo)
    │
    ▼
┌──────────────────────────────────┐
│ onMutate (Before API Call)       │
│ - Cancel outgoing queries        │
│ - Snapshot current cache         │
│ - Optimistically update UI       │
│   (add temporary todo)           │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│ mutationFn (API Call)            │
│ - await apiClient.createTodo()   │
└──────────┬───────────────────────┘
           │
      ┌────┴─────┐
      │          │
   Success     Error
      │          │
      ▼          ▼
┌────────┐  ┌───────────┐
│onSuccess│  │ onError   │
│- Replace│  │ - Rollback│
│  temp   │  │   cache   │
│  with   │  │ - Show    │
│  real   │  │   toast   │
│  data   │  └───────────┘
│- Show   │
│  toast  │
└─────────┘
```

**Optimistic Update Example:**

```typescript
const createTodoMutation = useMutation({
  mutationFn: async (newTodo) => {
    const response = await apiClient.createTodo(newTodo);
    return response.data;
  },
  onMutate: async (newTodo) => {
    // 1. Cancel outgoing refetches
    await queryClient.cancelQueries(['todos', filters]);

    // 2. Snapshot previous value for rollback
    const previousTodos = queryClient.getQueryData(['todos', filters]);

    // 3. Optimistically update cache
    const optimisticTodo = {
      id: Date.now(), // Temporary ID
      ...newTodo,
      completed: false,
      created_at: new Date().toISOString(),
      _optimistic: true,
      _pendingAction: 'create'
    };

    queryClient.setQueryData(['todos', filters], (old) => 
      [optimisticTodo, ...old]
    );

    return { previousTodos, optimisticTodo };
  },
  onError: (err, newTodo, context) => {
    // Rollback on error
    queryClient.setQueryData(['todos', filters], context.previousTodos);
  },
  onSuccess: (serverData, variables, context) => {
    // Replace optimistic todo with real server data
    queryClient.setQueryData(['todos', filters], (old) =>
      old.map(todo => 
        todo.id === context.optimisticTodo.id ? serverData : todo
      )
    );
  },
});
```

**Public Interface:**

```typescript
interface TodoStoreInterface {
  // Data
  todos: OptimisticTodo[];
  isLoading: boolean;
  isRefetching: boolean;
  error: Error | null;

  // Actions
  createTodo: (todo: CreateTodoRequest) => Promise<Todo>;
  updateTodo: (id: number, updates: UpdateTodoRequest) => Promise<Todo>;
  deleteTodo: (id: number) => Promise<void>;
  moveToToday: (id: number) => Promise<Todo>;
  removeFromToday: (id: number) => Promise<Todo>;
  toggleTodoCompletion: (todo: Todo) => Promise<{ canUndo: boolean; undoId?: string }>;
  refetchTodos: () => Promise<void>;

  // Utilities
  getTodoDisplayState: (todo: OptimisticTodo) => DisplayState;

  // Mutation States
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isMovingToToday: boolean;
  isRemovingFromToday: boolean;

  // Cache key
  queryKey: QueryKey;
}
```

**Background Sync Configuration:**

```typescript
const { data: todos } = useQuery({
  queryKey: ['todos', filters],
  queryFn: fetchTodosFn,
  staleTime: 30000,                    // Fresh for 30 seconds
  refetchInterval: 60000,              // Sync every 60 seconds
  refetchIntervalInBackground: true,   // Sync even when tab inactive
  refetchOnWindowFocus: true,          // Sync when user returns to tab
});
```

---

#### useTodayViewStore Hook

**Purpose:** Smart today view with intelligent categorization

**Implementation:** `src/hooks/useTodayViewStore.ts`

**Data Structure:**

```typescript
interface TodayView {
  focus: {
    today_tagged: Todo[];    // Manually tagged for today
    due_today: Todo[];       // Due date = today
    overdue: Todo[];         // Past due
    total_today: number;
    total_focus: number;
  };
  upcoming: {
    coming_soon: Todo[];     // Due within X days
    total_coming_soon: number;
  };
  summary: {
    total_today_items: number;
    total_overdue: number;
    total_coming_soon: number;
    total_focus_items: number;
    needs_attention: boolean;
  };
}
```

**Smart Categorization Logic:**

```
All Incomplete Todos
        │
        ▼
┌──────────────────┐
│ Is overdue?      │────Yes────► Overdue Section
│ (due < today)    │
└────────┬─────────┘
         │ No
         ▼
┌──────────────────┐
│ Due today?       │────Yes────► Due Today Section
│ (due = today)    │
└────────┬─────────┘
         │ No
         ▼
┌──────────────────┐
│ Tagged for today?│────Yes────► Today Tagged Section
│ (is_today=true)  │
└────────┬─────────┘
         │ No
         ▼
┌──────────────────┐
│ Due within X days│────Yes────► Coming Soon Section
│ (configurable)   │
└────────┬─────────┘
         │ No
         ▼
    Not Displayed
```

**Deduplication:** Todos only appear in the highest-priority category

**Priority Order:**
1. Overdue (highest priority)
2. Due Today
3. Today Tagged
4. Coming Soon (lowest priority)

---

#### useAreaStore Hook

**Purpose:** Area selection and management with statistics

**Implementation:** `src/hooks/useAreaStore.ts`

**Key Features:**
- ✅ Current area selection persistence
- ✅ Area statistics (todo counts, completion rates)
- ✅ Material Design color system
- ✅ Default area management

---

#### useSessionStore Hook

**Purpose:** Session health monitoring and management

**Implementation:** `src/hooks/useSessionStore.ts`

**Key Features:**
- ✅ Session expiration tracking
- ✅ Automatic health checks (hourly)
- ✅ Multi-device session management
- ✅ Session revocation (single or all)

---

### 4. Context Providers

#### ToastContext

**Purpose:** Global notification system

**Implementation:** `src/contexts/ToastContext.tsx`

**Toast Types:**
- ✅ Success (green)
- ✅ Error (red)
- ✅ Warning (yellow)
- ✅ Info (blue)

**Features:**
- ✅ Auto-dismiss with configurable duration
- ✅ Action buttons (e.g., "Undo")
- ✅ Manual dismiss
- ✅ Stacking toasts
- ✅ Accessible (ARIA labels)

**Usage:**

```typescript
const { showToast, hideToast } = useToast();

const toastId = showToast({
  message: 'Todo completed!',
  type: 'success',
  duration: 2000,
  action: {
    label: 'Undo',
    onClick: () => {
      // Undo logic
      hideToast(toastId);
    }
  }
});
```

---

#### AreaContext

**Purpose:** Global area selection state

**Implementation:** `src/contexts/AreaContext.tsx`

**State:**

```typescript
interface AreaContextType {
  currentArea: Area | null;
  setCurrentArea: (area: Area | null) => void;
  areas: Area[];
  isLoading: boolean;
  refetchAreas: () => Promise<void>;
}
```

**Persistence:** Selected area stored in localStorage

---

### 5. Component Architecture

#### Component Hierarchy

```
App (Root)
│
├─ QueryClientProvider (TanStack Query)
│  │
│  └─ ToastProvider (Global notifications)
│     │
│     └─ AuthProvider (Authentication state)
│        │
│        └─ BrowserRouter (React Router)
│           │
│           └─ AppContent (Protected routes)
│              │
│              ├─ AreaProvider (Area selection state)
│              │  │
│              │  ├─ Dashboard (Main authenticated view)
│              │  │  │
│              │  │  ├─ Header
│              │  │  │  ├─ Logo
│              │  │  │  ├─ Add Todo Button
│              │  │  │  ├─ User Profile
│              │  │  │  └─ Logout Button
│              │  │  │
│              │  │  ├─ Navigation (View switcher)
│              │  │  │  ├─ Today Tab
│              │  │  │  ├─ All Todos Tab
│              │  │  │  ├─ Completed Tab
│              │  │  │  └─ Area Filter
│              │  │  │
│              │  │  ├─ ViewContainer (Multi-view router)
│              │  │  │  │
│              │  │  │  ├─ TodayView
│              │  │  │  │  ├─ Focus Section
│              │  │  │  │  │  ├─ Overdue (red badge)
│              │  │  │  │  │  ├─ Due Today (orange badge)
│              │  │  │  │  │  └─ Today Tagged (blue badge)
│              │  │  │  │  │
│              │  │  │  │  └─ Upcoming Section
│              │  │  │  │     └─ Coming Soon (gray badge)
│              │  │  │  │
│              │  │  │  ├─ TodoList (All or Completed)
│              │  │  │  │  └─ TodoItem (Optimized rendering)
│              │  │  │  │     ├─ Checkbox (completion toggle)
│              │  │  │  │     ├─ Title & Description
│              │  │  │  │     ├─ Tags (color-coded)
│              │  │  │  │     ├─ Due Date Badge
│              │  │  │  │     ├─ Area Badge
│              │  │  │  │     └─ TodoActions (Dropdown menu)
│              │  │  │  │        ├─ Edit
│              │  │  │  │        ├─ Move to Today / Remove from Today
│              │  │  │  │        ├─ Delete
│              │  │  │  │        └─ Copy Reference (#123)
│              │  │  │  │
│              │  │  │  └─ Loading / Empty States
│              │  │  │
│              │  │  ├─ ApiStatus (Connection indicator)
│              │  │  │
│              │  │  └─ Modals
│              │  │     ├─ AddTodoModal
│              │  │     ├─ EditTodoModal
│              │  │     └─ AreaManagementModal
│              │  │
│              │  ├─ CreateTodoFromExternal (Special route for external links)
│              │  │
│              │  └─ CreateMultipleTodos (Bulk creation route)
│              │
│              └─ LoginButton (Unauthenticated view)
│
└─ ReactQueryDevtools (Development only)
```

---

#### Key Components

##### Dashboard

**Purpose:** Main authenticated view container

**File:** `src/components/Dashboard.tsx`

**Responsibilities:**
- Header with user profile and actions
- Navigation tabs (Today, All, Completed)
- View container routing
- Add todo modal management
- API status monitoring

**State Management:**

```typescript
const [currentView, setCurrentView] = useState('all');
const [isAddModalOpen, setIsAddModalOpen] = useState(false);
const [refreshTrigger, setRefreshTrigger] = useState(0);
const [newTodoId, setNewTodoId] = useState<number | null>(null);
const [isViewTransitioning, setIsViewTransitioning] = useState(false);
```

**View Transitions:**

```typescript
const handleViewChange = (newView: string) => {
  if (newView !== currentView) {
    setIsViewTransitioning(true);
    setCurrentView(newView);
    
    // End transition after animation
    setTimeout(() => {
      setIsViewTransitioning(false);
    }, 200); // Match CSS transition duration
  }
};
```

---

##### ViewContainer

**Purpose:** Multi-view router with smooth transitions

**File:** `src/components/ViewContainer.tsx`

**Views:**
- `today` - TodayView component
- `all` - TodoList (incomplete todos)
- `completed` - TodoList (completed todos)

**Transition System:**

```typescript
<div className={`
  transition-opacity duration-200
  ${isTransitioning ? 'opacity-0' : 'opacity-100'}
`}>
  {currentView === 'today' && <TodayView />}
  {currentView === 'all' && <TodoList view="all" />}
  {currentView === 'completed' && <TodoList view="completed" />}
</div>
```

---

##### TodoList

**Purpose:** Optimized todo rendering with virtual scrolling support

**File:** `src/components/TodoList.tsx`

**Key Features:**
- ✅ Optimistic update animations
- ✅ Completion animations (fade-out)
- ✅ New todo animations (slide-in)
- ✅ Empty state handling
- ✅ Loading skeletons

**Optimistic State Rendering:**

```typescript
const renderTodo = (todo: OptimisticTodo) => {
  const state = getTodoDisplayState(todo);
  
  return (
    <div className={`
      transition-all duration-300
      ${state.isPending ? 'opacity-50' : 'opacity-100'}
      ${state.isRemoving ? 'opacity-0 transform scale-95' : ''}
      ${state.isCreating ? 'animate-slide-in' : ''}
    `}>
      <TodoItem todo={todo} />
    </div>
  );
};
```

---

##### TodoActions

**Purpose:** Dropdown menu for todo actions

**File:** `src/components/TodoActions.tsx`

**Actions:**
- Edit todo
- Move to today / Remove from today
- Delete todo
- Copy reference link (#123)

**Implementation:**

```typescript
<DropdownMenu>
  <MenuItem onClick={() => handleEdit(todo)}>
    Edit
  </MenuItem>
  
  {!todo.is_today ? (
    <MenuItem onClick={() => moveToToday(todo.id)}>
      Move to Today
    </MenuItem>
  ) : (
    <MenuItem onClick={() => removeFromToday(todo.id)}>
      Remove from Today
    </MenuItem>
  )}
  
  <MenuItem onClick={() => handleDelete(todo)}>
    Delete
  </MenuItem>
  
  <MenuItem onClick={() => copyReference(todo.id)}>
    Copy Reference (#{todo.id})
  </MenuItem>
</DropdownMenu>
```

---

##### AddTodoModal / EditTodoModal

**Purpose:** Form modals for todo creation and editing

**Files:**
- `src/components/AddTodoModal.tsx`
- `src/components/EditTodoModal.tsx`

**Form Fields:**
- Title (required)
- Description (optional, multiline)
- Due date (date-time picker)
- Is today (checkbox)
- Area (dropdown)
- Reference URL (optional)

**Validation:**

```typescript
const validateForm = (data: CreateTodoRequest): string[] => {
  const errors: string[] = [];
  
  if (!data.title?.trim()) {
    errors.push('Title is required');
  }
  
  if (data.title && data.title.length > 500) {
    errors.push('Title must be 500 characters or less');
  }
  
  if (data.due_date) {
    const dueDate = new Date(data.due_date);
    if (isNaN(dueDate.getTime())) {
      errors.push('Invalid due date');
    }
  }
  
  return errors;
};
```

---

##### AreaManagementModal

**Purpose:** Area CRUD operations

**File:** `src/components/AreaManagementModal.tsx`

**Features:**
- ✅ Create new areas
- ✅ Edit existing areas
- ✅ Delete areas (with protection)
- ✅ Color picker (Material Design colors)
- ✅ Set default area
- ✅ View area statistics

**Color Picker:**

```typescript
const MATERIAL_COLORS = [
  { name: 'Blue', value: '#1976D2', use: 'Work, Professional' },
  { name: 'Green', value: '#388E3C', use: 'Home, Personal' },
  { name: 'Purple', value: '#7B1FA2', use: 'Projects, Creative' },
  { name: 'Orange', value: '#F57C00', use: 'Personal, Hobbies' },
  { name: 'Red', value: '#D32F2F', use: 'Urgent, Important' },
  { name: 'Teal', value: '#00796B', use: 'Health, Wellness' },
  { name: 'Indigo', value: '#303F9F', use: 'Learning, Education' },
  { name: 'Brown', value: '#5D4037', use: 'Finance, Admin' },
];
```

---

##### SessionHealthWarning

**Purpose:** Persistent session expiration warnings

**File:** `src/components/SessionHealthWarning.tsx`

**Display Logic:**

```typescript
if (
  authMethod === 'persistent-session' &&
  sessionHealth.needsRefreshWarning &&
  sessionHealth.daysUntilExpiry !== null
) {
  return (
    <Banner type="warning">
      Your session expires in {sessionHealth.daysUntilExpiry} days.
      <Button onClick={handleRefresh}>Refresh Session</Button>
    </Banner>
  );
}
```

---

### 6. Routing Architecture

**Router:** React Router DOM v7

**Routes:**

```typescript
<Routes>
  {/* Main dashboard (protected) */}
  <Route path="/*" element={
    isAuthenticated ? (
      <AreaProvider>
        <Dashboard />
      </AreaProvider>
    ) : (
      <LoginButton />
    )
  } />
  
  {/* Special route for creating todos from external sources */}
  <Route path="/create-todo-from-external" element={
    isAuthenticated ? (
      <AreaProvider>
        <CreateTodoFromExternal />
      </AreaProvider>
    ) : (
      <LoginButton />
    )
  } />
  
  {/* Bulk todo creation */}
  <Route path="/create-multiple-todos" element={
    isAuthenticated ? (
      <AreaProvider>
        <CreateMultipleTodos />
      </AreaProvider>
    ) : (
      <LoginButton />
    )
  } />
</Routes>
```

**Protected Routes Pattern:**

```typescript
const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};
```

---

## Data Flow

### Todo Creation Flow

```
1. User clicks "Add Todo" button
   │
   ▼
2. Dashboard opens AddTodoModal
   │
   ▼
3. User fills form and clicks "Create"
   │
   ▼
4. Modal calls createTodo from useTodoStore
   │
   ▼
5. useTodoStore.createTodo mutation starts
   │
   ├─► onMutate: Optimistic update
   │   ├─ Cancel outgoing queries
   │   ├─ Snapshot cache
   │   └─ Add temporary todo to UI (id: Date.now())
   │
   ├─► mutationFn: API call
   │   └─ await apiClient.createTodo()
   │
   └─► Result handler
       │
       ├─► onSuccess:
       │   ├─ Replace temporary todo with real data
       │   ├─ Invalidate related queries (todayView)
       │   ├─ Show success toast
       │   └─ Return new todo ID for animation
       │
       └─► onError:
           ├─ Rollback cache to snapshot
           ├─ Show error toast
           └─ Keep modal open
   │
   ▼
6. Modal closes, Dashboard highlights new todo
   │
   ▼
7. TodoList renders with slide-in animation
```

---

### Todo Completion Flow with Undo

```
1. User clicks checkbox on todo
   │
   ▼
2. TodoItem calls toggleTodoCompletion
   │
   ▼
3. useTodoStore.toggleTodoCompletion starts
   │
   ├─► Update mutation (completed: true)
   │   │
   │   ├─► onMutate: Optimistic update
   │   │   └─ Mark todo as completed instantly
   │   │
   │   └─► mutationFn: API call
   │       └─ await apiClient.updateTodo(id, { completed: true })
   │
   └─► Show undo toast
       │
       ├─ "Completed 'Todo Title' • Click to undo"
       ├─ Success type (green)
       ├─ 2-second duration
       │
       └─ Action button: "Undo"
           │
           └─► If clicked within 2 seconds:
               ├─ Cancel removal animation
               ├─ Update mutation (completed: false)
               ├─ Hide undo toast
               └─ Todo restored instantly
   │
   ▼
4. After 100ms delay: Mark todo for removal animation
   │
   ▼
5. Fade-out animation (450ms)
   │
   ▼
6. Remove from cache after animation completes
```

---

### Background Synchronization Flow

```
Component mounts with useTodoStore
│
├─► Initial query
│   └─ Fetch todos from API
│
├─► Background sync (every 60 seconds)
│   │
│   └─► If data is stale (> 30 seconds old):
│       ├─ Fetch fresh data from API
│       ├─ Merge with cache (preserve optimistic updates)
│       └─ Update UI seamlessly
│
└─► Window focus sync
    │
    └─► User returns to tab:
        ├─ Check if data is stale
        └─ Refetch if needed
```

---

## Performance Optimizations

### React Query Caching Strategy

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,     // Fresh for 5 minutes
      cacheTime: 1000 * 60 * 10,    // Keep in cache for 10 minutes
      refetchOnMount: true,          // Refetch on component mount
      refetchOnWindowFocus: true,    // Refetch on tab focus
      refetchOnReconnect: true,      // Refetch on network reconnect
    },
  },
});
```

### Query Key Structure

Consistent query keys enable smart cache invalidation:

```typescript
// Hierarchical query keys
const QUERY_KEYS = {
  todos: (filters?: TodoFilters) => ['todos', filters],
  todo: (id: number) => ['todo', id],
  todayView: () => ['todayView'],
  areas: (includeStats?: boolean) => ['areas', { includeStats }],
  area: (id: number) => ['area', id],
  sessions: () => ['sessions'],
  sessionHealth: () => ['sessionHealth'],
};

// Cache invalidation examples
queryClient.invalidateQueries(['todos']); // Invalidate all todo queries
queryClient.invalidateQueries(['todos', { area_id: 1 }]); // Specific area
queryClient.invalidateQueries(['todayView']); // Today view only
```

### Optimistic Updates

Instant UI feedback reduces perceived latency:

```typescript
// User sees immediate feedback
onMutate: async (data) => {
  // Update UI instantly
  queryClient.setQueryData(['todos'], (old) => [...optimisticUpdate, ...old]);
  
  // API call happens in background
  return { previousData };
};

// If API fails, rollback seamlessly
onError: (err, data, context) => {
  queryClient.setQueryData(['todos'], context.previousData);
};
```

### Request Deduplication

React Query automatically deduplicates simultaneous requests:

```typescript
// Multiple components request same data
useQuery(['todos', { completed: false }]);
useQuery(['todos', { completed: false }]);
useQuery(['todos', { completed: false }]);

// Only 1 network request is made
// All components share the same cached data
```

### Lazy Loading & Code Splitting

```typescript
// Lazy load heavy components
const AreaManagementModal = lazy(() => import('./AreaManagementModal'));
const EditTodoModal = lazy(() => import('./EditTodoModal'));

// Render with Suspense
<Suspense fallback={<LoadingSpinner />}>
  <AreaManagementModal />
</Suspense>
```

---

## Security Architecture

### Authentication Security

**Token Storage:**
- ✅ ID tokens in memory only (React state)
- ✅ Never stored in localStorage or sessionStorage
- ✅ Automatically cleared on logout or page refresh

**Persistent Sessions:**
- ✅ HTTP-only cookies (not accessible to JavaScript)
- ✅ Secure flag (HTTPS only)
- ✅ SameSite=Strict (CSRF protection)
- ✅ 30-day expiration with automatic rotation

**Token Validation:**

```typescript
const isTokenValid = (token: string | null, expiry: number | null): boolean => {
  if (!token || !expiry) return false;
  // Add 5-minute buffer to prevent race conditions
  return Date.now() < (expiry - 300) * 1000;
};
```

### API Security

**Request Security:**
- ✅ HTTPS only in production
- ✅ Bearer token authentication
- ✅ Cookie credentials included
- ✅ CORS properly configured

**Error Handling:**
- ✅ Automatic logout on 401/403
- ✅ Sensitive data never logged
- ✅ Generic error messages to users

### XSS Prevention

**Content Sanitization:**
- ✅ React auto-escapes all text content
- ✅ HTML mode for rich content uses DOMPurify (backend)
- ✅ No `dangerouslySetInnerHTML` for user input

### CSRF Protection

- ✅ SameSite=Strict cookies
- ✅ Backend validates origin
- ✅ State validation in OAuth flow

---

## Environment Configuration

### Environment Variables

```bash
# .env.local (development)
VITE_API_BASE_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# .env.production (production)
VITE_API_BASE_URL=https://api.yeezlestodo.com
VITE_GOOGLE_CLIENT_ID=your-production-google-client-id.apps.googleusercontent.com
```

### Vite Configuration

**File:** `vite.config.ts`

```typescript
export default defineConfig({
  plugins: [react()],
  
  // Development server
  server: {
    port: 5173,
    host: '0.0.0.0'
  },
  
  // Production preview
  preview: {
    port: Number(process.env.PORT) || 4173,
    host: '0.0.0.0',
    allowedHosts: [
      'yeezles-todo-webapp-production.up.railway.app',
      'yeezlestodo.com'
    ],
    strictPort: true
  }
});
```

---

## Build & Deployment

### Build Process

```bash
# Development
npm run dev          # Start Vite dev server (port 5173)

# Production build
npm run build        # TypeScript compile + Vite build
                     # Output: dist/

# Preview production build
npm run preview      # Serve dist/ (port 4173)
```

### Build Output

```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js       # Main app bundle
│   ├── vendor-[hash].js      # Third-party dependencies
│   ├── index-[hash].css      # Compiled CSS
│   └── logo-[hash].png       # Static assets
├── manifest.json             # PWA manifest (if enabled)
└── robots.txt
```

### Deployment (Railway)

**Configuration:** `railway.toml`

```toml
[build]
builder = "nixpacks"
buildCommand = "npm run build"

[deploy]
startCommand = "npm run preview"
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 10

[[healthcheck]]
path = "/"
timeout = 100
interval = 60
```

### CI/CD Pipeline

**Automatic Deployment:**
- ✅ Push to `main` branch triggers build
- ✅ Railway builds and deploys automatically
- ✅ Environment variables from Railway dashboard
- ✅ Automatic HTTPS with custom domain

---

## Related Documentation

- **[API.md](./api/API.md)** - Frontend API consumption patterns
- **[STATUS.md](./STATUS.md)** - Current implementation status
- **[FEATURES.md](./FEATURES.md)** - Feature specifications
- **[TESTING.md](./TESTING.md)** - Testing strategies and patterns
- **[Backend Architecture](../../yeezles-todo/docs/ARCHITECTURE.md)** - Backend system design

---

## Change Log

### Version 1.0.0 (November 20, 2025)
- ✅ Initial architecture documentation
- ✅ React 19 with TypeScript
- ✅ TanStack Query state management
- ✅ Optimistic updates system
- ✅ Google OAuth authentication
- ✅ Persistent session support
- ✅ Component hierarchy
- ✅ Data flow diagrams
- ✅ Performance optimizations
- ✅ Security architecture


