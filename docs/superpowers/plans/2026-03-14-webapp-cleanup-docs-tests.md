# Webapp Cleanup, Documentation & Test Improvement Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean up debug logging, fix type safety, extract magic numbers, add JSDoc documentation, and strengthen the test suite — without changing functionality.

**Architecture:** Three-phase approach. Phase 1 (cleanup) runs sequentially since it modifies production code. Phase 2 runs documentation and test work in parallel via isolated git worktrees — docs agent edits source files, test agent only touches `__tests__/` directories. Phase 3 writes a refactoring roadmap spec.

**Tech Stack:** React 19, TypeScript 5.8 (strict mode), Vite 7, Vitest 3.2, TanStack Query 5, Tailwind CSS 3

**Spec:** `docs/superpowers/specs/2026-03-14-webapp-cleanup-docs-tests-design.md`

**Working directory:** `/home/david/Code/yeezles-todo-workspace/yeezles-todo-webapp`

---

## Chunk 1: Phase 1 — Cleanup

### Task 1: Create Logger Utility

**Files:**
- Create: `src/utils/logger.ts`
- Create: `src/utils/__tests__/logger.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/utils/__tests__/logger.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('logger', () => {
  const originalEnv = import.meta.env.DEV;

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('in development mode', () => {
    it('should call console.log for logger.log', async () => {
      vi.stubEnv('DEV', true);
      const { logger } = await import('../logger');
      logger.log('test message');
      expect(console.log).toHaveBeenCalledWith('test message');
      vi.unstubAllEnvs();
    });

    it('should call console.warn for logger.warn', async () => {
      vi.stubEnv('DEV', true);
      const { logger } = await import('../logger');
      logger.warn('warning');
      expect(console.warn).toHaveBeenCalledWith('warning');
      vi.unstubAllEnvs();
    });

    it('should call console.error for logger.error', async () => {
      vi.stubEnv('DEV', true);
      const { logger } = await import('../logger');
      logger.error('error');
      expect(console.error).toHaveBeenCalledWith('error');
      vi.unstubAllEnvs();
    });
  });

  describe('in production mode', () => {
    it('should NOT call console.log for logger.log', async () => {
      vi.stubEnv('DEV', false);
      const { logger } = await import('../logger');
      logger.log('test message');
      expect(console.log).not.toHaveBeenCalled();
      vi.unstubAllEnvs();
    });

    it('should NOT call console.warn for logger.warn', async () => {
      vi.stubEnv('DEV', false);
      const { logger } = await import('../logger');
      logger.warn('warning');
      expect(console.warn).not.toHaveBeenCalled();
      vi.unstubAllEnvs();
    });

    it('should NOT call console.error for logger.error', async () => {
      vi.stubEnv('DEV', false);
      const { logger } = await import('../logger');
      logger.error('error');
      expect(console.error).not.toHaveBeenCalled();
      vi.unstubAllEnvs();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/__tests__/logger.test.ts`
Expected: FAIL — module `../logger` not found

- [ ] **Step 3: Write the logger implementation**

```typescript
// src/utils/logger.ts
/**
 * Development-only logger utility.
 *
 * All methods are no-ops in production builds. Use instead of raw
 * `console.log` / `console.error` / `console.warn` to keep production
 * bundles quiet and avoid leaking debug information.
 *
 * Evaluates `import.meta.env.DEV` at call time (not module load time)
 * so that tests can stub the env variable without module caching issues.
 */
export const logger = {
  log: (...args: unknown[]) => { if (import.meta.env.DEV) console.log(...args); },
  warn: (...args: unknown[]) => { if (import.meta.env.DEV) console.warn(...args); },
  error: (...args: unknown[]) => { if (import.meta.env.DEV) console.error(...args); },
  debug: (...args: unknown[]) => { if (import.meta.env.DEV) console.debug(...args); },
};
```

- [ ] **Step 5: Commit**

```bash
git add src/utils/logger.ts src/utils/__tests__/logger.test.ts
git commit -m 'Add dev-only logger utility with tests'
```

---

### Task 2: Replace Console Statements in AuthContext

**Files:**
- Modify: `src/contexts/AuthContext.tsx`

AuthContext has ~28 console statements including debug logs with `[Frontend]` prefixes and sensitive data exposure (cookies, tokens).

- [ ] **Step 1: Add logger import and replace all console statements**

At top of file, add:
```typescript
import { logger } from '../utils/logger';
```

Replace all `console.log(...)` with `logger.log(...)`.
Replace all `console.error(...)` with `logger.error(...)`.

**Remove entirely** (sensitive data — don't even log in dev):
- Any statements logging cookie values
- Any statements logging token values or session credentials

- [ ] **Step 2: Run existing AuthContext tests**

Run: `npx vitest run src/contexts/__tests__/AuthContext.test.tsx src/contexts/__tests__/AuthContext.simple.test.tsx`
Expected: PASS (logger is a drop-in replacement)

- [ ] **Step 3: Commit**

```bash
git add src/contexts/AuthContext.tsx
git commit -m 'Replace raw console statements with logger in AuthContext'
```

---

### Task 3: Replace Console Statements in API Service

**Files:**
- Modify: `src/services/api.ts`

api.ts has ~21 console statements including response interceptor error logging and debug output for login/validation/health checks.

- [ ] **Step 1: Add logger import and replace all console statements**

At top of file, add:
```typescript
import { logger } from '../utils/logger';
```

Replace all `console.log(...)` with `logger.log(...)`.
Replace all `console.error(...)` with `logger.error(...)`.

**Remove entirely** (sensitive data):
- Cookie inspection logs (~line 162)
- Token/credential response logging

- [ ] **Step 2: Run existing api tests**

Run: `npx vitest run src/services/__tests__/api.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/services/api.ts
git commit -m 'Replace raw console statements with logger in API service'
```

---

### Task 4: Replace Console Statements in Remaining Files

**Files:**
- Modify: `src/components/AddTodoModal.tsx` (3 statements)
- Modify: `src/components/AreaManagementModal.tsx` (2 statements — console.error in save and delete handlers)
- Modify: `src/components/TodoActions.tsx` (3 statements)
- Modify: `src/components/LoginButton.tsx` (2 statements)
- Modify: `src/components/CreateMultipleTodos.tsx` (2 statements)
- Modify: `src/components/CreateTodoFromExternal.tsx` (1 statement)
- Modify: `src/components/EditTodoModal.tsx` (1 statement)
- Modify: `src/components/TodayCorner.tsx` (1 statement)
- Modify: `src/components/ApiStatus.tsx` (1 statement)
- Modify: `src/contexts/AreaContext.tsx` (3 statements)
- Modify: `src/hooks/useTodoCompletion.ts` (console.error calls)
- Modify: `src/hooks/useApi.ts` (1 console.warn)
- Modify: `src/hooks/useCrossTabSync.ts` (4 statements)

- [ ] **Step 1: Add logger import and replace console statements in all files**

For each file:
1. Add `import { logger } from '../utils/logger';` (or `'../../utils/logger'` for nested files)
2. Replace `console.log(...)` → `logger.log(...)`
3. Replace `console.error(...)` → `logger.error(...)`
4. Replace `console.warn(...)` → `logger.warn(...)`

- [ ] **Step 2: Run full test suite to verify nothing broke**

Run: `npx vitest run`
Expected: All existing tests PASS

- [ ] **Step 3: Verify zero raw console statements remain in production code**

Run: `grep -rn 'console\.\(log\|error\|warn\|debug\)' src/ --include='*.ts' --include='*.tsx' | grep -v '__tests__' | grep -v 'node_modules' | grep -v 'logger.ts'`
Expected: No results

- [ ] **Step 4: Commit**

```bash
git add src/components/ src/contexts/AreaContext.tsx src/hooks/useTodoCompletion.ts src/hooks/useApi.ts src/hooks/useCrossTabSync.ts
git commit -m 'Replace raw console statements with logger in all remaining files'
```

---

### Task 5: Fix All `any` Type Usage

**Files:**
- Modify: `src/App.tsx` — `error: any` → `error: Error`
- Modify: `src/components/LoginButton.tsx` — `credentialResponse: any` → proper Google type
- Modify: `src/components/ApiStatus.tsx` — `err: any` → `err: unknown`
- Modify: `src/components/CreateMultipleTodos.tsx` — find and type the `any`
- Modify: `src/services/api.ts` — `data: any`, `options: any`, `Promise<any>` returns
- Modify: `src/hooks/useAreaStore.ts` — `as any` casts and `colorObj: any`
- Modify: `src/hooks/useTodayViewStore.ts` — `updates: any`
- Modify: `src/hooks/useSessionStore.ts` — `(old as any).sessions`
- Modify: `src/contexts/AreaContext.tsx` — `as any` cast
- Modify: `src/test/test-utils.tsx` — `initialAuthState?: any`
- Modify: `src/test/factories.ts` — `Partial<any>` usages
- Modify: `src/test/api-mocks.ts` — any `: any` usage

- [ ] **Step 1: Fix `any` types in each file**

For each file, read the surrounding code to determine the correct type. General patterns:
- `error: any` in catch blocks → `error: unknown` (then narrow with `instanceof Error`)
- `credentialResponse: any` → `GoogleCredentialResponse` from `../types/auth`
- `data: any` in API methods → the specific response type or `Record<string, unknown>`
- `as any` casts → proper intermediate type or generic constraint
- `Partial<any>` → `Partial<Record<string, unknown>>` or the specific interface

- [ ] **Step 2: Run TypeScript compiler to verify no type errors**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 4: Verify zero `any` in production code**

Run: `grep -rn ': any\b\|as any\b\|Promise<any>\|Partial<any>' src/ --include='*.ts' --include='*.tsx' | grep -v '__tests__' | grep -v 'node_modules' | grep -v 'test/' | grep -v '\.test\.'`
Expected: No results

- [ ] **Step 5: Commit**

```bash
git add src/
git commit -m 'Replace all any types with proper TypeScript types'
```

---

### Task 6: Extract Magic Numbers to Constants

**Files:**
- Create: `src/constants.ts`
- Modify: Multiple files that use hardcoded timing values

- [ ] **Step 1: Create constants file**

```typescript
// src/constants.ts

/**
 * Application-wide timing and threshold constants.
 *
 * Centralizes magic numbers that appear across hooks, components, and contexts
 * to make them discoverable, documented, and easy to tune.
 */

// --- Query & Sync ---

/** How long before TanStack Query considers data stale (5 minutes). */
export const QUERY_STALE_TIME_MS = 1000 * 60 * 5;

/** Background sync interval for todos and areas (60 seconds). */
export const BACKGROUND_SYNC_INTERVAL_MS = 60_000;

/** Background sync interval for today view (2 minutes). */
export const TODAY_VIEW_SYNC_INTERVAL_MS = 120_000;

/** Background sync interval for sessions (5 minutes). */
export const SESSION_SYNC_INTERVAL_MS = 300_000;

/** Session health check interval (1 hour). */
export const SESSION_HEALTH_CHECK_INTERVAL_MS = 60 * 60 * 1000;

/** Query stale time for today view (1 minute). */
export const TODAY_VIEW_STALE_TIME_MS = 60_000;

/** Query stale time for sessions (2 minutes). */
export const SESSION_STALE_TIME_MS = 2 * 60 * 1000;

// --- Undo & Completion ---

/** Duration of the undo window after completing a todo (1.5 seconds). */
export const UNDO_TIMEOUT_MS = 1500;

/** Duration of undo toast display (2 seconds). */
export const UNDO_TOAST_DURATION_MS = 2000;

// --- Animation & Transitions ---

/** Short delay before triggering UI updates after optimistic mutations. */
export const MUTATION_SETTLE_DELAY_MS = 100;

/** Delay for toast appearance after an action. */
export const TOAST_APPEAR_DELAY_MS = 200;

/** View transition duration. */
export const VIEW_TRANSITION_DURATION_MS = 200;

/** Standard animation delay for deletion/revocation feedback. */
export const ANIMATION_DELAY_MS = 300;

/** Animation duration for todo list entrance + highlight. */
export const TODO_ENTRANCE_ANIMATION_MS = 400;

/** Animation duration for todo completion visual feedback. */
export const COMPLETION_ANIMATION_MS = 450;

/** Newly created area highlight duration (2 seconds). */
export const NEW_AREA_HIGHLIGHT_MS = 2000;

/** Default toast display duration (5 seconds). */
export const DEFAULT_TOAST_DURATION_MS = 5000;

// --- Auth ---

/** Buffer before token expiration to trigger refresh (5 minutes in seconds). */
export const TOKEN_EXPIRY_BUFFER_SECONDS = 300;

/** Delay before checking initial auth state after Google SDK loads. */
export const AUTH_INIT_DELAY_MS = 250;

/** Interval for polling Google SDK initialization. */
export const GOOGLE_SDK_POLL_INTERVAL_MS = 100;

/** Max polls waiting for Google SDK before giving up. */
export const GOOGLE_SDK_MAX_POLLS = 50;

// --- Retry ---

/** Max query retry attempts. */
export const MAX_QUERY_RETRIES = 3;

/** Max mutation retry attempts. */
export const MAX_MUTATION_RETRIES = 1;

// --- Validation ---

/** Max characters shown in truncated todo titles (e.g., undo toasts). */
export const TITLE_TRUNCATION_LENGTH = 30;

/** Urgent session expiry warning threshold (days). */
export const SESSION_EXPIRY_URGENT_DAYS = 2;

/** Toast entrance animation trigger delay. */
export const TOAST_ENTRANCE_DELAY_MS = 10;

/** Toast exit animation duration. */
export const TOAST_EXIT_ANIMATION_MS = 200;
```

- [ ] **Step 2: Replace hardcoded values in all files**

Update imports and replace magic numbers in:
- `src/App.tsx` — `1000 * 60 * 5` → `QUERY_STALE_TIME_MS`, retry counts
- `src/hooks/useTodoStore.ts` — `60000`, `450`, `100`, `2000`, `30`
- `src/hooks/useAreaStore.ts` — `60000`, `300`
- `src/hooks/useTodayViewStore.ts` — `120000`, `60000`, `100`
- `src/hooks/useSessionStore.ts` — `300000`, `2 * 60 * 1000`, `300`
- `src/hooks/useTodoCompletion.ts` — `1500`, `200`, `30`
- `src/contexts/AuthContext.tsx` — `100`, `50`, `250`, `300`, `60 * 60 * 1000`
- `src/contexts/ToastContext.tsx` — `5000`
- `src/components/Dashboard.tsx` — `200`
- `src/components/Navigation.tsx` — `2000`
- `src/components/TodoList.tsx` — `400`
- `src/components/Toast.tsx` — `10`, `200`
- `src/components/SessionHealthWarning.tsx` — `2`

- [ ] **Step 3: Run TypeScript compiler**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/constants.ts src/
git commit -m 'Extract magic numbers to named constants'
```

---

### Task 7: Remove Temp Directory

**Files:**
- Delete: `temp/` directory tree

- [ ] **Step 1: Remove temp directory**

```bash
rm -rf temp/
```

- [ ] **Step 2: Verify removal**

```bash
ls temp/ 2>&1
```
Expected: "No such file or directory"

- [ ] **Step 3: Commit**

```bash
git add -A temp/
git commit -m 'Remove obsolete temp directory with completed audit docs'
```

---

### Task 8: Phase 1 Verification

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 2: Run TypeScript compiler**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run linter**

Run: `npx eslint src/`
Expected: No errors (warnings acceptable)

- [ ] **Step 4: Verify cleanup success criteria**

```bash
# Zero raw console statements in production code
grep -rn 'console\.\(log\|error\|warn\|debug\)' src/ --include='*.ts' --include='*.tsx' | grep -v '__tests__' | grep -v 'node_modules' | grep -v 'logger.ts' | grep -v 'test/' | wc -l
# Expected: 0

# Zero any types in production code
grep -rn ': any\b\|as any\b\|Promise<any>\|Partial<any>' src/ --include='*.ts' --include='*.tsx' | grep -v '__tests__' | grep -v 'node_modules' | grep -v 'test/' | grep -v '\.test\.' | wc -l
# Expected: 0
```

---

## Chunk 2: Phase 2a — Documentation (Parallel Agent 1, source files only)

> **Parallelism note:** This chunk runs simultaneously with Chunk 3 (Tests). This agent edits source files to add JSDoc. It must NOT create or modify any files in `__tests__/` directories.

### Task 9: Document Type Definitions

**Files:**
- Modify: `src/types/todo.ts`
- Modify: `src/types/area.ts`
- Modify: `src/types/auth.ts`
- Modify: `src/types/sync.ts`

- [ ] **Step 1: Add JSDoc to all interfaces and types**

For each interface, add a JSDoc block describing:
- What the type represents
- Non-obvious fields (e.g., `html_processed` on ApiResponse, `select_by` on GoogleCredentialResponse)

Example for `src/types/todo.ts`:
```typescript
/** A single todo item as returned by the API. */
export interface Todo {
  id: number;
  /** The raw text title (may contain markdown-like syntax). */
  title: string;
  // ...
}

/**
 * Extended todo with server-rendered HTML versions of text fields.
 * Returned when `html: true` is passed to API requests.
 */
export interface TodoWithHtml extends Todo {
  // ...
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/
git commit -m 'Add JSDoc to type definitions'
```

---

### Task 10: Document Services

**Files:**
- Modify: `src/services/api.ts`

- [ ] **Step 1: Add JSDoc to TokenAwareApiClient and all methods**

For the class:
```typescript
/**
 * Authenticated HTTP client for the Yeezles Todo API.
 *
 * Wraps Axios with automatic token injection via request interceptors
 * and centralized error handling via response interceptors. All requests
 * include `withCredentials: true` for cookie-based session auth.
 */
```

For each method, document:
- What endpoint it calls (e.g., `POST /auth/google`)
- Parameters and return type
- Auth requirements

Example:
```typescript
/**
 * Authenticate via Google OAuth credential.
 *
 * @param googleToken - The JWT credential from Google Sign-In
 * @param rememberMe - Whether to create a persistent session cookie
 * @returns Login response with user info and token
 */
async login(googleToken: string, rememberMe: boolean = false): Promise<LoginResponse> {
```

- [ ] **Step 2: Commit**

```bash
git add src/services/api.ts
git commit -m 'Add JSDoc to API service'
```

---

### Task 11: Document Hooks

**Files:**
- Modify: `src/hooks/useApi.ts`
- Modify: `src/hooks/useAreaStore.ts`
- Modify: `src/hooks/useCrossTabSync.ts`
- Modify: `src/hooks/useTodoStore.ts`
- Modify: `src/hooks/useTodayViewStore.ts`
- Modify: `src/hooks/useTodoCompletion.ts`
- Modify: `src/hooks/useSessionStore.ts`

- [ ] **Step 1: Add JSDoc to each hook's export and inline comments on complex logic**

For each hook, add:
- JSDoc with description, `@param`, `@returns`
- Inline comments on optimistic update patterns, rollback logic, cross-tab sync integration

Example for `useTodoCompletion`:
```typescript
/**
 * Manages todo completion with an undo window.
 *
 * When a todo is completed, a toast appears with an undo button.
 * If the user doesn't undo within {@link UNDO_TIMEOUT_MS}, the
 * completion is finalized via the API. Pending completions are
 * cleaned up on unmount to prevent memory leaks.
 *
 * @param options.undoTimeoutMs - Override the default undo window duration
 * @returns Object with `completeTodo` function and `pendingCompletions` map
 */
```

For inline comments on non-obvious logic, example in `useTodoStore`:
```typescript
// Optimistic update: immediately remove the todo from the cache
// so the UI feels instant. If the API call fails, the rollback
// callback (onError) restores the previous cache snapshot.
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/
git commit -m 'Add JSDoc and inline comments to hooks'
```

---

### Task 12: Document Contexts

**Files:**
- Modify: `src/contexts/AuthContext.tsx`
- Modify: `src/contexts/ToastContext.tsx`
- Modify: `src/contexts/AreaContext.tsx`

- [ ] **Step 1: Add JSDoc to providers, context values, and exported hooks**

Example for AuthContext:
```typescript
/**
 * Authentication context providing Google OAuth login, session management,
 * and token lifecycle.
 *
 * Handles:
 * - Google Sign-In initialization and credential exchange
 * - Persistent sessions via "Remember Me" cookies
 * - Token expiration tracking with automatic session health checks
 * - Logout with server-side session revocation
 *
 * Consumers access auth state via the `useAuth()` hook.
 */
```

- [ ] **Step 2: Commit**

```bash
git add src/contexts/
git commit -m 'Add JSDoc to context providers'
```

---

### Task 13: Document Components

**Files:**
- Modify: All 17 component files in `src/components/`

- [ ] **Step 1: Add JSDoc to each component and its props interface**

For each component, document:
- What it renders and when it's used
- Key behavioral notes (e.g., scroll preservation, animation sequences)
- Props interface with field descriptions

Example:
```typescript
/** Props for {@link TodoList}. */
interface TodoListProps {
  /** Filters applied to the todo query (area, completion status, etc.). */
  filters: TodoFilters;
}

/**
 * Renders the main list of todos with optimistic completion handling.
 *
 * Supports area-based filtering, animated entrance for newly created todos,
 * and inline completion with visual feedback (strikethrough + fade).
 * Empty states are shown when no todos match the current filters.
 */
export default function TodoList({ filters }: TodoListProps) {
```

- [ ] **Step 2: Commit**

```bash
git add src/components/
git commit -m 'Add JSDoc to all components'
```

---

### Task 14: Document Utils and Constants

**Files:**
- Modify: `src/utils/date.ts`
- Modify: `src/utils/todoGrouping.ts`
- Modify: `src/utils/logger.ts` (already has JSDoc from Task 1, verify)
- Modify: `src/constants.ts` (already has JSDoc from Task 6, verify)

- [ ] **Step 1: Add JSDoc to utility functions**

Example for `todoGrouping.ts`:
```typescript
/**
 * Groups completed todos by their completion date (YYYY-MM-DD).
 *
 * Todos without a `completed_at` timestamp are excluded. Results are
 * sorted with most recent dates first.
 *
 * @param todos - Array of completed todos to group
 * @returns Map of date strings to todo arrays, sorted descending
 */
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/ src/constants.ts
git commit -m 'Add JSDoc to utilities and constants'
```

---

## Chunk 3: Phase 2b — Tests (Parallel Agent 2, test files only)

> **Parallelism note:** This chunk runs simultaneously with Chunk 2 (Documentation). This agent creates and modifies files ONLY in `__tests__/` directories. It must NOT modify production source files. If a test fix requires a source change, document it and skip.

### Task 15: Audit and Fix Existing Tests

**Files:**
- Modify (if needed): All 12 existing test files in `__tests__/` directories

- [ ] **Step 1: Run the full test suite and capture results**

Run: `npx vitest run 2>&1`
Note which tests pass, fail, or are skipped.

- [ ] **Step 2: Fix any failing tests**

For each failure:
1. Read the test and the source code it tests
2. Determine if the test is stale (outdated assertion) or the code has a bug
3. Since we must not modify source files, only fix stale test assertions/mocks
4. If the fix requires a source change, document it in a comment and skip

- [ ] **Step 3: Verify all existing tests pass**

Run: `npx vitest run`
Expected: All 12 existing test files PASS

- [ ] **Step 4: Commit fixes (if any)**

```bash
git add src/*/__tests__/ src/test/
git commit -m 'Fix stale assertions in existing tests'
```

---

### Task 16: Add useTodayViewStore Tests

**Files:**
- Create: `src/hooks/__tests__/useTodayViewStore.test.ts`

- [ ] **Step 1: Write tests**

Test cases:
- Returns initial loading state
- Fetches today view data (focus + upcoming sections)
- Handles empty today view
- `updateTodoInTodayViewStore` optimistically updates a todo in the focus section
- `updateTodoInTodayViewStore` optimistically updates a todo in the upcoming section
- Invalidates queries after mutation settles
- Uses correct sync interval (from constants)

Use the test utilities from `src/test/` (factories, api-mocks, test-utils) following the patterns established in existing hook tests like `useTodoCompletion.test.ts`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/hooks/__tests__/useTodayViewStore.test.ts`
Expected: Tests should fail on unresolved mocks or setup issues, then pass once properly configured

- [ ] **Step 3: Iterate until all tests pass**

Run: `npx vitest run src/hooks/__tests__/useTodayViewStore.test.ts`
Expected: All PASS

- [ ] **Step 4: Commit**

```bash
git add src/hooks/__tests__/useTodayViewStore.test.ts
git commit -m 'Add useTodayViewStore tests'
```

---

### Task 17: Add useSessionStore Tests

**Files:**
- Create: `src/hooks/__tests__/useSessionStore.test.ts`

- [ ] **Step 1: Write tests**

Test cases:
- Returns initial loading state
- Fetches session list
- Handles empty session list
- `revokeSession` optimistically removes session from list
- `revokeSession` rolls back on API failure
- Uses correct sync and stale time intervals

- [ ] **Step 2: Run and iterate until passing**

Run: `npx vitest run src/hooks/__tests__/useSessionStore.test.ts`
Expected: All PASS

- [ ] **Step 3: Commit**

```bash
git add src/hooks/__tests__/useSessionStore.test.ts
git commit -m 'Add useSessionStore tests'
```

---

### Task 18: Add TodoList Component Tests

**Files:**
- Create: `src/components/__tests__/TodoList.test.tsx`

- [ ] **Step 1: Write tests**

Test cases:
- Renders a list of todos
- Shows empty state when no todos
- Calls completion handler when checkbox clicked
- Applies area filter correctly
- Shows todo titles and due dates
- Handles loading state

Use `renderWithProviders` from `src/test/test-utils.tsx` and factories from `src/test/factories.ts`.

- [ ] **Step 2: Run and iterate until passing**

Run: `npx vitest run src/components/__tests__/TodoList.test.tsx`
Expected: All PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/__tests__/TodoList.test.tsx
git commit -m 'Add TodoList component tests'
```

---

### Task 19: Add TodayView Component Tests

**Files:**
- Create: `src/components/__tests__/TodayView.test.tsx`

- [ ] **Step 1: Write tests**

Test cases:
- Renders overdue, due today, and tagged sections
- Shows empty state when no items for today
- Correctly categorizes todos into sections
- Handles loading state

- [ ] **Step 2: Run and iterate until passing**

Run: `npx vitest run src/components/__tests__/TodayView.test.tsx`
Expected: All PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/__tests__/TodayView.test.tsx
git commit -m 'Add TodayView component tests'
```

---

### Task 20: Add Navigation Component Tests

**Files:**
- Create: `src/components/__tests__/Navigation.test.tsx`

- [ ] **Step 1: Write tests**

Test cases:
- Renders all tab options
- Highlights active tab
- Calls tab change handler on click
- Renders area dropdown
- Shows current area name in dropdown

- [ ] **Step 2: Run and iterate until passing**

Run: `npx vitest run src/components/__tests__/Navigation.test.tsx`
Expected: All PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/__tests__/Navigation.test.tsx
git commit -m 'Add Navigation component tests'
```

---

### Task 21: Full Test Suite Verification

- [ ] **Step 1: Run complete test suite**

Run: `npx vitest run`
Expected: All tests PASS (existing 12 + 5 new = 17 test files)

- [ ] **Step 2: Run with coverage**

Run: `npx vitest run --coverage`
Document coverage numbers for the report.

---

## Chunk 4: Phase 3 — Refactoring Roadmap

### Task 22: Write Refactoring Roadmap Spec

**Files:**
- Create: `docs/superpowers/specs/2026-03-14-webapp-refactoring-design.md`

- [ ] **Step 1: Write the refactoring spec**

Based on everything observed during cleanup and documentation, write a comprehensive spec covering:

1. **Large Component Decomposition**
   - `AddTodoModal.tsx` (300+ LOC) → extract form fields into `AddTodoForm`, AI categorization into `useAiCategorization` hook
   - `EditTodoModal.tsx` (311+ LOC) → extract form into `EditTodoForm`, share field components with AddTodo
   - `TodoActions.tsx` (309+ LOC) → extract dropdown menu into `ActionDropdown`, individual action handlers into hooks

2. **Error Boundaries**
   - Add `ErrorBoundary` wrapper component
   - Wrap `Dashboard` and `ViewContainer` with fallback UI
   - Suggested fallback: "Something went wrong" with retry button

3. **Unified Error Handling**
   - Document current patterns: try-catch + toast, try-catch + console.error, silent failure
   - Propose: all user-facing errors show toast, all developer errors use logger, API errors use response interceptor

4. **Missing Loading States**
   - Area delete in `AreaManagementModal`
   - Bulk creation progress in `CreateMultipleTodos`
   - Session revocation in session list

5. **API Client Cleanup**
   - The `html: boolean` parameter on multiple methods → consider a config option or separate methods
   - `Promise<any>` return types that should be generic

6. **Complex Hook Simplification**
   - `useTodoStore` (513 LOC) → extract `useTodoMutations`, `useTodoFilters`
   - `useAreaStore` (349 LOC) → extract `useAreaMutations`, `useAreaColors`

7. **Priority & Dependency Order**
   - P1: Error Boundaries (safety net, no code changes needed)
   - P1: Unified Error Handling (consistent UX)
   - P2: Hook decomposition (developer ergonomics)
   - P2: Component decomposition (maintainability)
   - P3: API Client cleanup (nice to have)
   - P3: Loading states (polish)

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/2026-03-14-webapp-refactoring-design.md
git commit -m 'Add refactoring roadmap spec'
```

---

### Task 23: Final Verification and Summary Commit

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All PASS

- [ ] **Step 2: Run TypeScript compiler**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run linter**

Run: `npx eslint src/`
Expected: Clean

- [ ] **Step 4: Verify all success criteria from spec**

```bash
# Zero raw console statements
grep -rn 'console\.' src/ --include='*.ts' --include='*.tsx' | grep -v __tests__ | grep -v node_modules | grep -v logger.ts | grep -v test/ | wc -l

# Zero any types in production code
grep -rn '\bany\b' src/ --include='*.ts' --include='*.tsx' | grep -v __tests__ | grep -v node_modules | grep -v test/ | wc -l
```

- [ ] **Step 5: Summary commit**

```bash
git add -A
git commit -m 'Webapp cleanup, documentation, and test improvements complete'
```
