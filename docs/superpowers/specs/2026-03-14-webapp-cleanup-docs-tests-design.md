# Webapp Cleanup, Documentation & Test Improvement

**Date:** 2026-03-14
**Status:** Approved
**Scope:** Code cleanup, JSDoc documentation, test suite improvements, refactoring roadmap

---

## Overview

Three-phase effort to improve the yeezles-todo-webapp codebase quality without changing functionality:

1. **Cleanup** (sequential) — Remove debug logging, fix type safety, extract magic numbers, remove temp files
2. **Documentation + Tests** (parallel) — Add JSDoc to all source files; audit and expand test suite
3. **Refactoring Roadmap** (sequential) — Document future structural improvements as a spec

## Phase 1: Cleanup (Sequential)

All cleanup runs before other phases since it modifies production code.

### 1a. Debug Logging Cleanup

**Problem:** ~65 raw `console.log`/`console.error` statements across 13 non-test source files, some exposing tokens and cookies.

**Classification policy:**
- **Debug/diagnostic logs** (prefixed `[Frontend API]`, `[Frontend]`, etc.) — replace with `logger.debug()`, gated behind `import.meta.env.DEV`
- **Sensitive data logs** (tokens, cookies, session data) — remove entirely, even from dev logging
- **Operational error logs** in catch blocks (e.g., `console.error('Error creating todo:', error)`) — replace with `logger.error()`, which still logs in dev but is silenced in production

**Solution:**
- Create `src/utils/logger.ts` — a thin wrapper around `console` methods gated by `import.meta.env.DEV`
- Replace all raw console statements across all 13 affected files with appropriate logger calls
- Remove any statements that log sensitive data entirely

**Files affected:**
- `src/utils/logger.ts` (new)
- `src/contexts/AuthContext.tsx` (~28 statements)
- `src/services/api.ts` (~21 statements)
- `src/components/AddTodoModal.tsx` (3)
- `src/components/AreaManagementModal.tsx` (2)
- `src/components/TodoActions.tsx` (3)
- `src/components/LoginButton.tsx` (2)
- `src/components/CreateMultipleTodos.tsx` (2)
- `src/components/CreateTodoFromExternal.tsx` (1)
- `src/components/EditTodoModal.tsx` (1)
- `src/components/TodayCorner.tsx` (1)
- `src/components/ApiStatus.tsx` (1)
- `src/contexts/AreaContext.tsx` (3)
- `src/hooks/useTodoCompletion.ts` (1)
- `src/hooks/useApi.ts` (1)
- `src/hooks/useCrossTabSync.ts` (4)

### 1b. Type Safety

**Problem:** ~19 instances of `any` usage (`: any` annotations, `as any` casts, `Promise<any>` returns, `Partial<any>` generics) across 10+ files.

**Scope:** All forms of `any` — `: any` parameter/variable annotations, `as any` casts, `Promise<any>` return types, and `Partial<any>` generics in both production and test utility code.

**Solution:** Replace each `any` with a proper TypeScript type.

**Known instances:**

| File | Type | Location |
|------|------|----------|
| `App.tsx` | `: any` | error in retry callback |
| `LoginButton.tsx` | `: any` | credentialResponse param |
| `api.ts` | `: any` x3 | data param, options param, Promise return (~lines 150, 322, 332) |
| `test-utils.tsx` | `: any` | initialAuthState param |
| `useAreaStore.ts` | `: any` x2, `as any` x2 | colorObj param (~line 89, 295), casts (~lines 55, 84) |
| `useTodayViewStore.ts` | `: any` | unknown location |
| `CreateMultipleTodos.tsx` | `: any` | unknown location |
| `ApiStatus.tsx` | `: any` | unknown location |
| `AreaContext.tsx` | `as any` | ~line 158 |
| `useSessionStore.ts` | `as any` | ~line 63 |
| `test/factories.ts` | `Partial<any>` x2 | test data factories |
| `test/api-mocks.ts` | `: any` | mock utilities |

**Files affected:**
- `src/App.tsx`
- `src/components/LoginButton.tsx`
- `src/components/CreateMultipleTodos.tsx`
- `src/components/ApiStatus.tsx`
- `src/services/api.ts`
- `src/test/test-utils.tsx`
- `src/test/factories.ts`
- `src/test/api-mocks.ts`
- `src/hooks/useAreaStore.ts`
- `src/hooks/useTodayViewStore.ts`
- `src/hooks/useSessionStore.ts`
- `src/contexts/AreaContext.tsx`

### 1c. Magic Numbers

**Problem:** Hardcoded timeouts and intervals scattered throughout the codebase (1500ms undo, 60000ms sync, 250ms transitions).

**Solution:**
- Create `src/constants.ts` with named constants
- Update all files referencing hardcoded values

**Expected constants:**
- `UNDO_TIMEOUT_MS` (1500)
- `BACKGROUND_SYNC_INTERVAL_MS` (60000)
- `TRANSITION_DELAY_MS` (250)
- `ANIMATION_DELAY_MS` (300) — used in useAreaStore, useSessionStore
- `STALE_TIME_MS` (300000) — React Query stale time in App.tsx
- Any others discovered during implementation

**Files affected:**
- `src/constants.ts` (new)
- All files using hardcoded timing values

### 1d. Temp Directory Removal

**Problem:** `temp/docs-cleanup/` subdirectory contains state audit notes (STATE_MANAGEMENT_AUDIT.md, CROSS_TAB_SYNC_TESTING.md) that have served their purpose.

**Solution:** Remove the `temp/` directory tree entirely.

## Phase 2: Documentation + Tests (Parallel)

These two workstreams run simultaneously after Phase 1 completes. They don't conflict because documentation modifies source files (adding JSDoc) while tests create/modify files in `__tests__/` directories.

**Constraint:** The test agent must NOT modify production source files. If fixing a broken test requires a source-file change, escalate it for sequential resolution after the parallel phase completes.

### 2a. Documentation (Agent 1 — source files)

**Style:** Moderate — JSDoc on all exports + inline comments on non-obvious logic.

**Hooks (`src/hooks/`):**
- JSDoc on each exported hook: what it does, parameters, return values
- Inline comments on: optimistic update rollback patterns, cross-tab sync message handling, undo window lifecycle
- Files: useApi.ts, useAreaStore.ts, useCrossTabSync.ts, useTodoStore.ts, useTodayViewStore.ts, useTodoCompletion.ts, useSessionStore.ts

**Components (`src/components/`):**
- JSDoc on each component and its props interface
- What the component renders, when, and key behavioral notes
- Files: All 17 component files

**Contexts (`src/contexts/`):**
- JSDoc on providers and exported values
- What state they manage, how consumers use them
- Files: AuthContext.tsx, ToastContext.tsx, AreaContext.tsx

**Services (`src/services/`):**
- JSDoc on TokenAwareApiClient class and each method
- Endpoint, return type, auth requirements
- Files: api.ts

**Utils & Types (`src/utils/`, `src/types/`):**
- JSDoc on exported functions and interfaces
- Files: date.ts, todoGrouping.ts, todo.ts, area.ts, auth.ts, sync.ts

### 2b. Tests (Agent 2 — test files only)

**Audit existing tests (12 files):**
- Run full test suite, identify failures
- Fix stale mocks, outdated assertions, broken imports
- Verify tests actually test what they claim to test

**Add tests for critical gaps:**

| Target | File | Key test cases |
|--------|------|----------------|
| useTodayViewStore | `hooks/__tests__/useTodayViewStore.test.ts` | Optimistic updates, today/upcoming filtering, sync with main store |
| useSessionStore | `hooks/__tests__/useSessionStore.test.ts` | Session listing, revocation, optimistic updates |
| TodoList | `components/__tests__/TodoList.test.tsx` | Rendering, completion flow, empty states, area filtering |
| TodayView | `components/__tests__/TodayView.test.tsx` | Overdue/due-today/tagged grouping, empty states |
| Navigation | `components/__tests__/Navigation.test.tsx` | Tab switching, area dropdown, active indicator |

**Not in scope (documented as future work):**
- Dashboard, ViewContainer, EditTodoModal, TodoActions, AreaManagementModal
- CreateTodoFromExternal, CreateMultipleTodos, SessionHealthWarning, ApiStatus, Toast

## Phase 3: Refactoring Roadmap (Sequential)

Written after Phases 1-2 complete, as a separate spec at:
`docs/superpowers/specs/2026-03-14-webapp-refactoring-design.md`

**Contents:**
1. **Large Component Decomposition** — Split recommendations for AddTodoModal, EditTodoModal, TodoActions (what to extract, where)
2. **Error Boundaries** — Where to add (Dashboard, ViewContainer), fallback UI design
3. **Unified Error Handling** — Current patterns documented, proposed unified approach
4. **Missing Loading States** — Which async operations need loading indicators
5. **API Client Cleanup** — Address `html: boolean` parameter overloading
6. **Complex Hook Simplification** — Which hooks benefit from sub-hook extraction
7. **Priority & Dependency Order** — What to tackle first

## Execution Strategy

```
Phase 1 (Sequential)
  ├── 1a. Debug logging cleanup
  ├── 1b. Type safety fixes
  ├── 1c. Magic number extraction
  └── 1d. Temp directory removal
       │
       ▼
Phase 2 (Parallel)
  ├── Agent 1: Documentation (source files)
  └── Agent 2: Tests (test files)
       │
       ▼
Phase 3 (Sequential)
  └── Write refactoring roadmap spec
```

## Success Criteria

- [ ] Zero raw `console.log` statements in production code
- [ ] Zero `any` types in production source code (includes `: any`, `as any`, `Promise<any>`, `Partial<any>`)
- [ ] All magic numbers extracted to named constants
- [ ] `temp/` directory removed
- [ ] JSDoc on all exported hooks, components, contexts, services, utils, and types
- [ ] Inline comments on non-obvious logic patterns
- [ ] Existing 12 test files audited and passing
- [ ] 5 new test files for critical gaps
- [ ] Full test suite green
- [ ] Refactoring roadmap spec written and committed
