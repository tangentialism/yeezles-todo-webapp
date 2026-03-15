# Webapp Refactoring Roadmap

**Date:** 2026-03-14
**Status:** Spec (not yet implemented)
**Purpose:** Capture structural improvements identified during the cleanup effort for future implementation. Detailed enough to serve as input for a `writing-plans` session.

---

## Table of Contents

1. [Large Component Decomposition](#1-large-component-decomposition)
2. [Error Boundaries](#2-error-boundaries)
3. [Unified Error Handling](#3-unified-error-handling)
4. [Missing Loading States](#4-missing-loading-states)
5. [API Client Cleanup](#5-api-client-cleanup)
6. [Complex Hook Simplification](#6-complex-hook-simplification)
7. [Priority & Dependency Order](#7-priority--dependency-order)

---

## 1. Large Component Decomposition

### 1a. AddTodoModal (328 LOC)

**File:** `src/components/AddTodoModal.tsx`

**Problem:** This component handles form state for 6 fields, AI categorization logic (lines 68-94), form submission with area resolution, toast notifications, and all the modal/form JSX. The AI categorization flow is interleaved with submission logic, making both hard to test independently.

**Recommended Extractions:**

#### `useAiCategorization` hook

Extract the AI categorization logic (lines 63-94 of `handleSubmit`) into a dedicated hook.

```typescript
// src/hooks/useAiCategorization.ts
interface CategorizationResult {
  areaId: number | null;
  areaName: string | null;
  confidence: 'high' | 'medium' | 'low';
}

interface UseAiCategorization {
  categorize: (title: string, description?: string) => Promise<CategorizationResult | null>;
  isCategorizing: boolean;
}
```

This hook would own the `apiClient.categorizeTodo` call, the `isCategorizing` state, and the fallback behavior when categorization fails. The modal would call `categorize()` in its submit handler and get back a result or null.

**Estimated complexity:** Small

#### `AddTodoForm` component

Extract the form JSX (lines 163-320) into a presentational component that receives field values and change handlers as props. The modal would own the state and submission logic; the form would own the layout.

```typescript
// src/components/AddTodoForm.tsx
interface AddTodoFormProps {
  title: string;
  onTitleChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  dueDate: string;
  onDueDateChange: (value: string) => void;
  isToday: boolean;
  onIsTodayChange: (value: boolean) => void;
  selectedAreaId: number | null;
  onAreaChange: (areaId: number | null) => void;
  referenceUrl: string;
  onReferenceUrlChange: (value: string) => void;
  areas: Area[];
  isSubmitting: boolean;
  isCategorizing: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}
```

**Estimated complexity:** Medium (many props to thread through, but straightforward)

---

### 1b. EditTodoModal (275 LOC)

**File:** `src/components/EditTodoModal.tsx`

**Problem:** Nearly identical form fields to `AddTodoModal` (title, description, referenceUrl, area selector, due date, today toggle) are duplicated with only minor differences (e.g., Edit has a "completed" checkbox, Add has AI categorization hint text). Lines 103-267 of the form JSX are ~80% identical to `AddTodoModal`.

**Recommended Extractions:**

#### Shared `TodoFormFields` component

Extract the common form fields (title, description, reference URL, area selector, due date, today toggle) into a shared component used by both modals.

```typescript
// src/components/TodoFormFields.tsx
interface TodoFormFieldsProps {
  values: {
    title: string;
    description: string;
    referenceUrl: string;
    selectedAreaId: number | null;
    dueDate: string;
    isToday: boolean;
  };
  onChange: {
    title: (v: string) => void;
    description: (v: string) => void;
    referenceUrl: (v: string) => void;
    selectedAreaId: (v: number | null) => void;
    dueDate: (v: string) => void;
    isToday: (v: boolean) => void;
  };
  areas: Area[];
  isSubmitting: boolean;
  /** ID prefix for form labels (e.g., "add" or "edit") to avoid DOM ID collisions. */
  idPrefix: string;
  /** Optional slot rendered below the area selector (e.g., AI categorization hint). */
  areaHint?: React.ReactNode;
}
```

**Key differences to handle:**
- `AddTodoModal` area selector shows "Auto-categorize with AI" as default option; `EditTodoModal` shows "No area (shows in all views)".
- `AddTodoModal` shows an AI hint below the area selector; `EditTodoModal` does not.
- `EditTodoModal` has a "Mark as completed" checkbox that `AddTodoModal` does not.

These are handled via the `areaHint` slot and by keeping modal-specific fields (completed checkbox) outside the shared component.

#### `EditTodoForm` component

Thin wrapper that composes `TodoFormFields` with the completed checkbox and edit-specific submit/cancel buttons.

**Estimated complexity:** Medium (requires careful prop design to handle the differences without over-abstracting)

---

### 1c. TodoActions (247 LOC)

**File:** `src/components/TodoActions.tsx`

**Problem:** Mixes dropdown positioning logic, portal rendering, click-outside handling, and five distinct action handlers (edit, toggle complete, move to today, remove from today, delete). Each action handler follows the same pattern: call store method, handle error with logger, close dropdown.

**Recommended Extractions:**

#### `ActionDropdown` component

Extract the dropdown menu rendering (lines 124-241) into a generic portal-based dropdown component.

```typescript
// src/components/ActionDropdown.tsx
interface ActionDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement>;
  children: React.ReactNode;
}
```

This component would own:
- Portal rendering to `document.body`
- Position calculation from anchor element's bounding rect
- Click-outside handling via the existing `useEffect` pattern

#### `useTodoActions` hook

Extract the five action handlers into a hook that takes a `todo` and callbacks.

```typescript
// src/hooks/useTodoActions.ts
interface UseTodoActionsOptions {
  todo: Todo;
  onUpdate: () => void;
  onEdit: (todo: Todo) => void;
  onToggleComplete?: (todo: Todo) => void;
}

interface UseTodoActions {
  handleEdit: () => void;
  handleToggleComplete: () => Promise<void>;
  handleMoveToToday: () => Promise<void>;
  handleRemoveFromToday: () => Promise<void>;
  handleDelete: () => Promise<void>;
  isDeleting: boolean;
  isMovingToToday: boolean;
  isRemovingFromToday: boolean;
}
```

**Estimated complexity:** Medium

---

## 2. Error Boundaries

**Current state:** The app has no React error boundaries. An unhandled exception in any component's render path will crash the entire app with a white screen.

### Recommended Implementation

#### `ErrorBoundary` wrapper component

```typescript
// src/components/ErrorBoundary.tsx
interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Fallback UI to show when an error is caught. */
  fallback?: React.ReactNode;
  /** Called when an error is caught, for logging/reporting. */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}
```

This must be a class component (React error boundaries require `componentDidCatch` / `getDerivedStateFromError`).

#### Default fallback UI

A simple card with:
- "Something went wrong" heading
- Error message (in development only)
- "Try Again" button that calls `setState({ hasError: false, error: null })` to re-mount children
- "Reload Page" link as a last resort

#### Where to apply

1. **Around `Dashboard`** in `App.tsx` -- catches errors in the main authenticated view (todo list rendering, area management, navigation).

2. **Around `ViewContainer`** in `Dashboard.tsx` -- catches errors in individual views (TodoList, TodayView, AccomplishmentsView) without taking down the entire dashboard header/navigation.

3. **Around each modal** (`AddTodoModal`, `EditTodoModal`, `AreaManagementModal`) -- prevents a modal rendering error from crashing the whole page. Fallback can simply close the modal and show a toast.

#### Integration with logger

The `onError` callback should call `logger.error('React Error Boundary caught:', error)` so errors are captured consistently.

**Estimated complexity:** Small (standard React pattern, well-documented)

---

## 3. Unified Error Handling

### Current Patterns (Audit)

The codebase uses three distinct error handling patterns inconsistently:

**Pattern A: try-catch + logger.error (silent to user)**
Found in:
- `src/components/AddTodoModal.tsx` line 127: `logger.error('Error creating todo:', error)` with comment "Error handling is done in the store with toast" -- but the store toast may not fire if the error happens before the store call.
- `src/components/TodoActions.tsx` lines 52, 81, 93: `logger.error(...)` with same delegation comment.
- `src/components/EditTodoModal.tsx` line 73: Same pattern.
- `src/components/AreaManagementModal.tsx` lines 124, 137: Same pattern.

**Pattern B: try-catch + showToast (user-visible)**
Found in:
- `src/hooks/useTodoStore.ts` mutation `onError` handlers (lines 161, 227, 304, 404, 460): Always show error toast to user.
- `src/hooks/useAreaStore.ts` mutation `onError` handlers (lines 159, 220, 274, 309): Always show error toast to user.

**Pattern C: try-catch + logger + return null (silent failure)**
Found in:
- `src/hooks/useAreaStore.ts` `getAreaStats` (line 307-313): Catches, toasts, returns null.
- `src/contexts/AreaContext.tsx` `createArea`/`updateArea`/`deleteArea` (lines 95, 119, 140): Catches and returns null.

**Pattern D: No error handling (silent drop)**
Found in:
- `src/components/CreateMultipleTodos.tsx` line 92: `logger.error('Failed to create todos:', error)` -- user sees no feedback if batch creation partially fails.

### Proposed Unified Strategy

**Principle:** Every error should result in exactly one user-visible notification (toast) and one developer-visible log entry (logger). No silent failures for user-initiated actions.

#### Layer 1: API Response Interceptor (already exists)

The axios response interceptor in `src/services/api.ts` (lines 149-168) already handles:
- 401 responses (triggers auth error/logout)
- Network errors (logged)
- Generic errors (logged and re-thrown)

**Enhancement:** Add a flag or custom error class so downstream code can distinguish "already handled by interceptor" errors from other errors. This prevents double-logging.

```typescript
class ApiError extends Error {
  status: number;
  logged: boolean; // true if the interceptor already logged it
}
```

#### Layer 2: Store Mutation Error Handlers (keep as-is)

The TanStack Query `onError` callbacks in `useTodoStore` and `useAreaStore` are the right place to show user-facing toasts for mutation failures. These already work correctly.

#### Layer 3: Component-Level Catch Blocks (simplify)

Component-level `try-catch` blocks should be reduced to just re-throwing or removed entirely, since the store's `onError` already handles the user notification. The current pattern of `logger.error()` in components plus `showToast()` in stores can lead to double-logging.

**Recommendation:** Remove `logger.error()` calls from component-level catch blocks where the store already handles the error. Only keep component-level error handling for logic that runs outside the store (e.g., AI categorization in `AddTodoModal`, URL parsing in `CreateMultipleTodos`).

#### Layer 4: Context-Level Error Handling (standardize)

`AreaContext.tsx` methods (`createArea`, `updateArea`, `deleteArea`) should either:
- Propagate errors to callers (let the calling component or store handle it), OR
- Show a toast themselves

Currently they catch and return null, which hides failures from callers.

**Estimated complexity:** Medium (requires auditing all catch blocks, but each change is small)

---

## 4. Missing Loading States

### 4a. Area Delete in AreaManagementModal

**File:** `src/components/AreaManagementModal.tsx`, line 252-259

**Problem:** The "Delete Area" button (line 252) checks `isSubmitting` for the disabled state, but `isSubmitting` is derived from the editing area's `isPending` state, not the delete mutation's `isDeleting` state. During deletion, the button text remains "Delete Area" with no spinner or visual feedback.

**Fix:** Add `isDeleting` from the area store's `getAreaDisplayState` and show a spinner on the delete button during deletion.

```typescript
const isDeleting = editingArea ? getAreaDisplayState(editingArea).isDeleting : false;
```

**Estimated complexity:** Small

### 4b. Bulk Creation Progress in CreateMultipleTodos

**File:** `src/components/CreateMultipleTodos.tsx`, lines 74-94

**Problem:** The `handleCreateTodos` function loops through selected todos and creates them sequentially with `await createTodo(todoData)` (line 87). During this loop, the button shows "Creating..." but there is no progress indicator showing which todo is being created or how many are done.

**Fix:** Add a progress counter:

```typescript
const [creationProgress, setCreationProgress] = useState<{ current: number; total: number } | null>(null);

// In handleCreateTodos:
setCreationProgress({ current: 0, total: selectedTodoItems.length });
for (let i = 0; i < selectedTodoItems.length; i++) {
  setCreationProgress({ current: i + 1, total: selectedTodoItems.length });
  await createTodo(todoData);
}
setCreationProgress(null);
```

Button text: `Creating 3 of 7...`

**Estimated complexity:** Small

### 4c. Session Revocation Loading State

**File:** `src/services/api.ts` methods `revokeSession` (line 224) and `revokeAllSessions` (line 232)

**Problem:** There is no loading state exposed for session revocation. The session list UI (wherever it is rendered) should show a spinner or disabled state while a revocation request is in-flight.

**Fix:** This depends on where sessions are displayed. The fix would involve wrapping the revocation calls in a mutation (or adding local `isRevoking` state) and disabling the revoke button during the request.

**Estimated complexity:** Small

---

## 5. API Client Cleanup

### 5a. The `html: boolean` Parameter Pattern

**File:** `src/services/api.ts`

**Problem:** Six methods accept an `html: boolean = false` parameter:
- `getTodos` (line 269, via `filters.html`)
- `getTodo` (line 283)
- `createTodo` (line 294)
- `updateTodo` (line 322)
- `moveToToday` (line 342)
- `removeFromToday` (line 353)
- `getTodayView` (line 368)

This parameter is never passed as `true` anywhere in the webapp codebase. It exists for the MCP server and other API consumers that want server-rendered HTML. Having it as a parameter on every method adds noise.

**Option A: Remove the parameter entirely from the webapp client.** If the webapp never needs HTML rendering, drop it. Other consumers (MCP server) have their own API client.

**Option B: Move to a client-level config option.**

```typescript
class TokenAwareApiClient {
  private includeHtml: boolean;

  constructor(baseURL, getToken, onAuthError, options?: { includeHtml?: boolean }) {
    this.includeHtml = options?.includeHtml ?? false;
  }
}
```

**Option C: Create separate method variants.** E.g., `getTodoHtml(id)` vs `getTodo(id)`. This is overly verbose and not recommended.

**Recommendation:** Option A. The webapp never uses HTML rendering. Remove the parameter from all methods in the webapp's API client. If a future need arises, it can be added back.

**Estimated complexity:** Small

---

## 6. Complex Hook Simplification

### 6a. useTodoStore (537 LOC)

**File:** `src/hooks/useTodoStore.ts`

**Problem:** This single hook contains:
- Filter building from view + area (lines 63-85)
- Main query configuration (lines 88-107)
- Optimistic update helper (lines 110-117)
- 5 separate mutations (create, update, delete, moveToToday, removeFromToday) each with `onMutate`/`onError`/`onSuccess` (lines 120-492)
- Completion toggle with undo logic (lines 333-380)
- Display state helper (lines 495-502)
- Public interface assembly (lines 504-534)

At 537 lines, the hook is the single largest file in the codebase. Individual mutations follow the same optimistic-update-with-rollback pattern, making the file repetitive but not truly complex. The main readability issue is that you must scroll through 400+ lines of mutation definitions to find the one you want.

**Recommended Extractions:**

#### `useTodoMutations` hook

Extract all 5 mutations + the `toggleTodoCompletion` function into a separate hook that receives the query client, filters, broadcast function, toast functions, and optimistic update helper as parameters (or accesses them via context).

```typescript
// src/hooks/useTodoMutations.ts
interface UseTodoMutationsOptions {
  filters: TodoFilters;
  view: string;
}

interface UseTodoMutations {
  createTodo: (data: CreateTodoRequest) => Promise<Todo>;
  updateTodo: (id: number, updates: UpdateTodoRequest) => Promise<Todo>;
  deleteTodo: (id: number) => Promise<number>;
  moveToToday: (id: number) => Promise<Todo>;
  removeFromToday: (id: number) => Promise<Todo>;
  toggleTodoCompletion: (todo: Todo) => Promise<{ canUndo: boolean; undoId?: string }>;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isMovingToToday: boolean;
  isRemovingFromToday: boolean;
}
```

#### `useTodoFilters` hook

Extract the filter-building logic (lines 63-85) into a hook that takes view and area and returns computed filters.

```typescript
// src/hooks/useTodoFilters.ts
function useTodoFilters(view: string): TodoFilters
```

This is a small extraction but improves testability -- you can unit test filter building without mocking the entire query/mutation infrastructure.

**After extraction, `useTodoStore` becomes a composition root:**

```typescript
export const useTodoStore = (options: UseTodoStoreOptions = {}) => {
  const filters = useTodoFilters(options.view);
  const query = useTodoQuery(filters, options);
  const mutations = useTodoMutations({ filters, view: options.view });
  const getTodoDisplayState = useTodoDisplayState();

  return { ...query, ...mutations, getTodoDisplayState, queryKey: QUERY_KEYS.todos(filters) };
};
```

**Estimated complexity:** Large (many internal dependencies, needs careful testing to ensure optimistic updates still work correctly across extracted hooks sharing the same query cache)

---

### 6b. useAreaStore (362 LOC)

**File:** `src/hooks/useAreaStore.ts`

**Problem:** Similar to `useTodoStore` but smaller. Contains:
- Two queries (areas, available colors) (lines 50-106)
- Optimistic update helper (lines 110-117)
- 3 mutations (create, update, delete) (lines 120-297)
- `getAreaStats` async function (lines 300-314)
- Display state helper (lines 317-323)
- Default area computation (lines 326-328)

**Recommended Extractions:**

#### `useAreaMutations` hook

Extract the 3 mutations into a separate hook.

```typescript
// src/hooks/useAreaMutations.ts
interface UseAreaMutations {
  createArea: (data: CreateAreaRequest) => Promise<Area>;
  updateArea: (id: number, updates: UpdateAreaRequest) => Promise<Area>;
  deleteArea: (id: number) => Promise<number>;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
}
```

#### `useAreaColors` hook

Extract the available colors query (lines 84-106) into a standalone hook. This query has a longer stale time (5 minutes) and a different lifecycle than the areas query.

```typescript
// src/hooks/useAreaColors.ts
function useAreaColors(): {
  availableColors: string[];
  isLoadingColors: boolean;
}
```

**After extraction, `useAreaStore` becomes ~100 lines** -- the two queries, the composition of mutations/colors, and the public interface.

**Estimated complexity:** Medium

---

## 7. Priority & Dependency Order

### P1: Safety & Consistency (implement first)

| Item | Section | Complexity | Rationale |
|------|---------|------------|-----------|
| Error Boundaries | [2](#2-error-boundaries) | Small | Safety net preventing white-screen crashes. Zero risk of breaking existing behavior. |
| Unified Error Handling | [3](#3-unified-error-handling) | Medium | Consistent UX: users always see feedback on failures. Fixes silent failures. |

**Dependencies:** Error boundaries should land first (they catch what unified error handling misses). Unified error handling can be done incrementally, one file at a time.

### P2: Developer Ergonomics & Maintainability (implement second)

| Item | Section | Complexity | Rationale |
|------|---------|------------|-----------|
| Hook decomposition (`useTodoStore`) | [6a](#6a-usetodostore-537-loc) | Large | Largest single file. Decomposition improves testability and makes mutations easier to find/modify. |
| Hook decomposition (`useAreaStore`) | [6b](#6b-useareastoretore-362-loc) | Medium | Same pattern as todo store, smaller scope. |
| Component decomposition (shared `TodoFormFields`) | [1b](#1b-edittodomodal-275-loc) | Medium | Eliminates ~150 lines of duplicated JSX between Add and Edit modals. |
| Component decomposition (`TodoActions`) | [1c](#1c-todoactions-247-loc) | Medium | Reusable dropdown component, cleaner action handler testing. |
| Component decomposition (`AddTodoModal`) | [1a](#1a-addtodomodal-328-loc) | Medium | Depends on shared `TodoFormFields` from 1b. |

**Dependencies:** Shared `TodoFormFields` (1b) should be extracted before decomposing either modal individually. Hook decomposition items (6a, 6b) are independent of component decomposition items.

### P3: Polish & Nice-to-Have (implement last)

| Item | Section | Complexity | Rationale |
|------|---------|------------|-----------|
| API Client `html` parameter cleanup | [5](#5-api-client-cleanup) | Small | Removes dead code. Low impact, low risk. |
| Missing loading states (area delete) | [4a](#4a-area-delete-in-areamanagementmodal) | Small | UX polish. |
| Missing loading states (bulk creation) | [4b](#4b-bulk-creation-progress-in-createmultipletodos) | Small | UX polish. |
| Missing loading states (session revocation) | [4c](#4c-session-revocation-loading-state) | Small | UX polish. |

**Dependencies:** None. These can be done in any order, independently.

---

## Summary

| Priority | Items | Total Estimated Effort |
|----------|-------|----------------------|
| P1 | Error Boundaries, Unified Error Handling | 1-2 days |
| P2 | Hook decomposition (2), Component decomposition (3) | 3-5 days |
| P3 | API cleanup, Loading states (3) | 1 day |
| **Total** | **9 items** | **5-8 days** |

All estimates assume a single developer working with tests and documentation updates included.
