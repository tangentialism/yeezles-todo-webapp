# State Management Optimization Plan

## Overview
Analysis of webapp models that would benefit from TanStack Query optimized state management similar to the todo implementation.

## Current State Management Issues Found

### 1. **Areas (AreaContext.tsx)** - HIGH PRIORITY
**Current Problems:**
- Full reload on every CRUD operation (`refreshAreas()` called after create/update/delete)
- No optimistic updates - user waits for server response
- Manual state management with useState
- No background sync or cache invalidation
- Error handling requires full reloads

**Impact:** Creating, updating, or deleting areas causes full reloads similar to the original todo issue

**Operations Affected:**
- `createArea()` - calls `setAreas(prev => [...prev, newArea])`
- `updateArea()` - calls `setAreas(prev => prev.map(...))`
- `deleteArea()` - calls `setAreas(prev => prev.filter(...))`
- All trigger full re-renders and potential UI jank

### 2. **TodayView Component** - MEDIUM PRIORITY
**Current Problems:**
- Custom `loadTodayData()` function reloads entire view
- Uses old `useTodoCompletion` hook instead of new optimized store
- Manual optimistic updates that could fail
- No background sync for "today" specific data
- Still calls `loadTodayData()` on every todo update

**Impact:** TodayView still using old patterns, could benefit from TanStack Query caching

### 3. **User Sessions (AuthContext.tsx)** - LOW PRIORITY
**Current Problems:**
- Session management uses direct API calls
- No caching of session lists
- Manual state management for auth state
- API calls: `getUserSessions()`, `revokeSession()`, `revokeAllSessions()`

**Impact:** Less frequent operations, but could benefit from query caching

## Recommended Implementation Phases

### Phase 1: Areas Store (HIGH PRIORITY)
**Create `useAreaStore` hook similar to `useTodoStore`**
- Implement optimistic CRUD operations for areas (create, update, delete)
- Add background sync for area lists
- Replace AreaContext manual state management
- Add proper error handling with rollback capability
- Benefits: Instant area management, no more full reloads

### Phase 2: TodayView Store (MEDIUM PRIORITY)  
**Create `useTodayViewStore` hook for today-specific data**
- Replace manual `loadTodayData()` with TanStack Query
- Integrate with main todo store for shared todo operations
- Add smart cache invalidation when todos change
- Benefits: Faster today view, integrated with main todo optimizations

### Phase 3: User Sessions Store (LOW PRIORITY)
**Create `useSessionStore` for user session management**
- Cache session lists with background refresh
- Optimistic session revocation
- Benefits: Faster session management, reduced API calls

## Implementation Pattern
Each store will follow the same pattern as `useTodoStore`:
- TanStack Query for caching and background sync
- Optimistic updates with rollback on error  
- Toast notifications for user feedback
- Background sync intervals (30s-2min configurable)
- Smart cache invalidation strategies

## Expected Benefits
- Eliminate ALL full reloads across the app
- Provide instant feedback for every user action
- Consistent state management patterns
- Better error handling and user experience
- Reduced server load through intelligent caching

## Files to Modify

### Phase 1 (Areas):
- Create `src/hooks/useAreaStore.ts`
- Update `src/contexts/AreaContext.tsx` (or replace with store)
- Update `src/components/AreaManagementModal.tsx`
- Update `src/components/Navigation.tsx`

### Phase 2 (TodayView):
- Create `src/hooks/useTodayViewStore.ts`
- Update `src/components/TodayView.tsx`
- Remove old `useTodoCompletion` usage

### Phase 3 (Sessions):
- Create `src/hooks/useSessionStore.ts`
- Update auth-related components using session management