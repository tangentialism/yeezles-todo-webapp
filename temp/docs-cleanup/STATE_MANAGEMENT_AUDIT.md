# State Management & Cross-Tab Synchronization Audit

**Date:** November 24, 2025  
**Issue:** Changes made in one browser tab are not immediately reflected in other tabs

---

## Executive Summary

The Yeezles Todo webapp uses **TanStack Query (React Query)** for server state management with **per-tab isolated caches**. Each browser tab maintains its own independent state, leading to inconsistent views when users have multiple tabs open.

**Current Behavior:**
- ✅ Optimistic updates work perfectly **within a single tab**
- ❌ Changes in Tab A are **not visible** in Tab B until background sync (60s) or window focus
- ⚠️ Users can create conflicting changes in different tabs

**Root Cause:** No cross-tab communication mechanism

---

## Current Architecture

### State Management Layers

```
┌─────────────────────────────────────────────────────────┐
│                    Browser Tab A                         │
│  ┌────────────────────────────────────────────────────┐ │
│  │ React Query Client (Instance 1)                    │ │
│  │ - todos cache                                      │ │
│  │ - areas cache                                      │ │
│  │ - todayView cache                                  │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    Browser Tab B                         │
│  ┌────────────────────────────────────────────────────┐ │
│  │ React Query Client (Instance 2)                    │ │
│  │ - todos cache (INDEPENDENT)                        │ │
│  │ - areas cache (INDEPENDENT)                        │ │
│  │ - todayView cache (INDEPENDENT)                    │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘

        ↕ No Communication ↕
```

### Global State (Shared Across App)

Located in **`src/App.tsx`**:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,          // 5 minutes
      retry: (failureCount, error) => { ... },
    },
    mutations: {
      retry: 1,
    },
  },
});
```

**Key Point:** Each tab creates its own `QueryClient` instance when the app loads.

### Context Providers (Global Within Tab)

1. **AuthContext** (`src/contexts/AuthContext.tsx`)
   - User authentication state
   - Token management (in-memory)
   - Session validation
   - **Scope:** Per-tab (not shared)

2. **ToastContext** (`src/contexts/ToastContext.tsx`)
   - Notification system
   - **Scope:** Per-tab (not shared)

3. **AreaContext** (`src/contexts/AreaContext.tsx`)
   - Current area selection
   - **Scope:** Per-tab (not shared)

### Custom State Hooks

#### useTodoStore (`src/hooks/useTodoStore.ts`)

**Features:**
- ✅ Optimistic updates with rollback
- ✅ Background sync (60 seconds)
- ✅ Window focus refetching
- ✅ Automatic cache invalidation
- ❌ No cross-tab sync

**Query Configuration:**
```typescript
useQuery({
  queryKey: QUERY_KEYS.todos(filters),
  queryFn: async () => { ... },
  staleTime: 30000,                      // 30 seconds
  refetchInterval: 60000,                 // 60 seconds background sync
  refetchIntervalInBackground: true,      // Sync even when tab inactive
  refetchOnWindowFocus: true,             // Refetch when user returns to tab
});
```

**Cache Keys:**
```typescript
const QUERY_KEYS = {
  todos: (filters?: TodoFilters) => ['todos', filters],
  todo: (id: number) => ['todo', id],
};
```

#### useTodayViewStore (`src/hooks/useTodayViewStore.ts`)

**Features:**
- ✅ Optimistic updates for today view
- ✅ Background sync (120 seconds)
- ✅ Integration with useTodoStore
- ❌ No cross-tab sync

**Query Configuration:**
```typescript
useQuery({
  queryKey: QUERY_KEYS.todayView(includeDueToday, daysAhead),
  queryFn: async () => { ... },
  staleTime: 60000,                       // 1 minute
  refetchInterval: 120000,                // 2 minutes background sync
  refetchIntervalInBackground: true,
  refetchOnWindowFocus: true,
});
```

#### useAreaStore (`src/hooks/useAreaStore.ts`)

**Features:**
- ✅ Area CRUD with optimistic updates
- ✅ Background sync (60 seconds)
- ❌ No cross-tab sync

**Query Configuration:**
```typescript
useQuery({
  queryKey: QUERY_KEYS.areas(includeStats),
  queryFn: async () => { ... },
  staleTime: 30000,                       // 30 seconds
  refetchInterval: 60000,                 // 60 seconds
  refetchIntervalInBackground: true,
  refetchOnWindowFocus: true,
});
```

---

## How Views React to State Changes

### TodoList Component (`src/components/TodoList.tsx`)

**State Sources:**
- `useTodoStore({ view })` - Main data source

**Update Triggers:**
- ✅ Optimistic updates (instant within tab)
- ✅ Mutation success (cache updated)
- ✅ Background sync (every 60s)
- ✅ Window focus (refetch)
- ❌ Cross-tab changes (not detected)

**Behavior in Multi-Tab Scenario:**

| Action | Tab A (Active) | Tab B (Background) | Tab C (Active, Different Area) |
|--------|----------------|-------------------|-------------------------------|
| Create todo in Tab A | ✅ Instant | ⏳ After 60s background sync | ⏳ After 60s (if same area) |
| Complete todo in Tab A | ✅ Instant | ⏳ After 60s background sync | ⏳ After 60s |
| Delete todo in Tab A | ✅ Instant | ⏳ After 60s background sync | ⏳ After 60s |
| Switch to Tab B | N/A | ✅ Refetch on focus | N/A |

### TodayView Component (`src/components/TodayView.tsx`)

**State Sources:**
- `useTodayViewStore()` - Main data source

**Update Triggers:**
- ✅ Optimistic updates (instant within tab)
- ✅ Integration with useTodoStore (cache invalidation)
- ✅ Background sync (every 120s)
- ✅ Window focus (refetch)
- ❌ Cross-tab changes (not detected)

### Dashboard Component (`src/components/Dashboard.tsx`)

**Role:** Container component with view switching

**State Management:**
- Local state for current view (`useState`)
- No global state persistence
- Each tab maintains its own view state

---

## Current Synchronization Mechanisms

### 1. Background Polling (Implemented ✅)

**How it works:**
- React Query's `refetchInterval` polls the API every 60-120 seconds
- Updates cache if server data has changed
- Works even when tab is in background

**Pros:**
- ✅ Simple to implement (already working)
- ✅ Eventually consistent across tabs
- ✅ No additional complexity

**Cons:**
- ❌ Slow (60-120 second delay)
- ❌ Unnecessary API calls when nothing changes
- ❌ Waste of bandwidth
- ❌ Poor UX (users see stale data)

### 2. Window Focus Refetch (Implemented ✅)

**How it works:**
- React Query's `refetchOnWindowFocus` triggers when user switches to tab
- Fetches fresh data from API
- Updates cache immediately

**Pros:**
- ✅ Fast sync when user returns to tab
- ✅ Reduces unnecessary API calls
- ✅ Good UX for tab switchers

**Cons:**
- ❌ Only works when user focuses the tab
- ❌ Background tabs remain stale
- ❌ Users may not notice outdated data

### 3. Manual Refetch Button (Implemented ✅)

**How it works:**
- Small refresh icon next to "All Todos" / "Today's Focus"
- User can manually trigger refetch
- Immediate API call and cache update

**Pros:**
- ✅ User control
- ✅ Instant sync when needed

**Cons:**
- ❌ Requires user action
- ❌ Users may not know it exists
- ❌ Poor UX (shouldn't be necessary)

---

## Cross-Tab Synchronization Options

### Option 1: Broadcast Channel API (Recommended ⭐)

**Description:** Use native browser Broadcast Channel API to send messages between tabs

**Implementation Approach:**

```typescript
// src/hooks/useCrossTabSync.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const CHANNEL_NAME = 'yeezles-todo-sync';

export const useCrossTabSync = () => {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    // Create broadcast channel
    const channel = new BroadcastChannel(CHANNEL_NAME);
    
    // Listen for messages from other tabs
    channel.onmessage = (event) => {
      const { type, data } = event.data;
      
      switch (type) {
        case 'TODO_CREATED':
        case 'TODO_UPDATED':
        case 'TODO_DELETED':
          // Invalidate todos cache to trigger refetch
          queryClient.invalidateQueries({ queryKey: ['todos'] });
          queryClient.invalidateQueries({ queryKey: ['todayView'] });
          break;
          
        case 'AREA_CREATED':
        case 'AREA_UPDATED':
        case 'AREA_DELETED':
          queryClient.invalidateQueries({ queryKey: ['areas'] });
          break;
      }
    };
    
    return () => channel.close();
  }, [queryClient]);
  
  // Function to broadcast changes to other tabs
  const broadcast = useCallback((type: string, data: any) => {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage({ type, data });
    channel.close();
  }, []);
  
  return { broadcast };
};
```

**Integration in useTodoStore:**

```typescript
// src/hooks/useTodoStore.ts
import { useCrossTabSync } from './useCrossTabSync';

export const useTodoStore = (options: UseTodoStoreOptions = {}) => {
  const { broadcast } = useCrossTabSync();
  
  // Create todo mutation
  const createTodoMutation = useMutation({
    // ... existing code ...
    onSuccess: (data, variables, context) => {
      // ... existing code ...
      
      // 🆕 Broadcast to other tabs
      broadcast('TODO_CREATED', { id: data.id });
    },
  });
  
  // Similar for update, delete, etc.
};
```

**Pros:**
- ✅ **Native browser API** (no dependencies)
- ✅ **Fast** (near-instant sync)
- ✅ **Lightweight** (small messages)
- ✅ **Same-origin only** (secure)
- ✅ **Simple implementation**
- ✅ **Works across all modern browsers**

**Cons:**
- ❌ Not supported in IE11 (not a concern for this app)
- ❌ Requires careful message design
- ❌ Need to handle race conditions

**Browser Support:**
- ✅ Chrome 54+
- ✅ Firefox 38+
- ✅ Safari 15.4+
- ✅ Edge 79+

**Estimated Effort:** 1-2 days

---

### Option 2: LocalStorage Events (Alternative)

**Description:** Use localStorage as a message bus between tabs

**Implementation Approach:**

```typescript
// src/hooks/useCrossTabSync.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export const useCrossTabSync = () => {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'yeezles-sync') {
        const data = JSON.parse(event.newValue || '{}');
        
        switch (data.type) {
          case 'TODO_CHANGED':
            queryClient.invalidateQueries({ queryKey: ['todos'] });
            queryClient.invalidateQueries({ queryKey: ['todayView'] });
            break;
          case 'AREA_CHANGED':
            queryClient.invalidateQueries({ queryKey: ['areas'] });
            break;
        }
        
        // Clean up sync key
        localStorage.removeItem('yeezles-sync');
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [queryClient]);
  
  const broadcast = useCallback((type: string, data: any) => {
    localStorage.setItem('yeezles-sync', JSON.stringify({ type, data, timestamp: Date.now() }));
  }, []);
  
  return { broadcast };
};
```

**Pros:**
- ✅ **Excellent browser support** (works everywhere)
- ✅ **Simple implementation**
- ✅ **No dependencies**

**Cons:**
- ❌ **Slower** than Broadcast Channel
- ❌ **Storage pollution** (writing to localStorage for every change)
- ❌ **Storage event doesn't fire in same tab** (by design)
- ❌ **Synchronous API** (can block UI)

**Estimated Effort:** 1 day

---

### Option 3: SharedWorker (Advanced)

**Description:** Use a shared worker to coordinate state across tabs

**Pros:**
- ✅ **Centralized state management**
- ✅ **Can maintain shared cache**
- ✅ **Most powerful option**

**Cons:**
- ❌ **Complex implementation** (worker code + main thread communication)
- ❌ **Limited browser support** (not in Safari on iOS)
- ❌ **Debugging is harder**
- ❌ **Overkill for this use case**

**Browser Support:**
- ✅ Chrome 4+
- ✅ Firefox 29+
- ❌ Safari (only on macOS, not iOS)
- ✅ Edge 79+

**Estimated Effort:** 1-2 weeks

---

### Option 4: WebSocket / Server-Sent Events (Over-Engineered)

**Description:** Real-time updates from server to all connected clients

**Pros:**
- ✅ **True real-time sync**
- ✅ **Works across devices** (not just tabs)
- ✅ **Can sync between multiple users**

**Cons:**
- ❌ **Requires backend changes** (WebSocket server)
- ❌ **Complex implementation** (both client and server)
- ❌ **Infrastructure costs** (persistent connections)
- ❌ **Overkill for single-user todo app**

**Estimated Effort:** 2-4 weeks

---

### Option 5: React Query Persisters (Experimental)

**Description:** Use React Query's experimental persisters to sync cache via localStorage

**Implementation:**

```typescript
import { QueryClient } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';

const queryClient = new QueryClient({ ... });

const persister = createSyncStoragePersister({
  storage: window.localStorage,
});

// In App.tsx
<PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
  {/* app */}
</PersistQueryClientProvider>
```

**Pros:**
- ✅ **Built-in React Query feature**
- ✅ **Automatic cache persistence**
- ✅ **Faster initial load** (cached data)

**Cons:**
- ❌ **Still experimental** (API may change)
- ❌ **Doesn't solve cross-tab sync** (tabs load from storage, but don't sync in real-time)
- ❌ **Storage limitations** (localStorage has 5-10MB limit)
- ❌ **Stale data issues** (cache may be outdated)

**Estimated Effort:** 1 day (but doesn't fully solve the problem)

---

## Recommendation: Broadcast Channel API ⭐

### Why Broadcast Channel?

1. **Perfect fit for the use case**
   - Single-user app (same browser, multiple tabs)
   - Need near-instant sync
   - Don't need cross-device sync (yet)

2. **Native browser API**
   - No dependencies
   - Well-supported in modern browsers
   - Secure (same-origin only)

3. **Simple implementation**
   - ~100 lines of code
   - Minimal changes to existing hooks
   - Easy to test

4. **Performance**
   - Near-instant sync (<100ms)
   - Minimal bandwidth usage
   - No server load

### Implementation Plan

#### Phase 1: Core Infrastructure (4 hours)

1. **Create `useCrossTabSync` hook**
   - Set up Broadcast Channel
   - Define message types
   - Handle incoming messages
   - Provide broadcast function

2. **Define message schema**
   ```typescript
   interface SyncMessage {
     type: 'TODO_CREATED' | 'TODO_UPDATED' | 'TODO_DELETED' | 
           'AREA_CREATED' | 'AREA_UPDATED' | 'AREA_DELETED';
     data: {
       id: number;
       timestamp: number;
     };
   }
   ```

3. **Add to App.tsx**
   ```typescript
   // Initialize cross-tab sync globally
   useCrossTabSync();
   ```

#### Phase 2: Integration (4 hours)

1. **Update `useTodoStore`**
   - Broadcast on create success
   - Broadcast on update success
   - Broadcast on delete success
   - Broadcast on toggle completion

2. **Update `useAreaStore`**
   - Broadcast on area changes

3. **Update `useTodayViewStore`**
   - Listen for todo changes
   - Invalidate cache when needed

#### Phase 3: Testing (2 hours)

1. **Manual testing**
   - Open 2-3 tabs
   - Create todo in Tab A → verify appears in Tab B/C
   - Complete todo in Tab B → verify updated in Tab A/C
   - Delete todo in Tab C → verify removed in Tab A/B

2. **Edge cases**
   - Tab goes offline → resync when back online
   - Race conditions (simultaneous edits)
   - Message ordering

#### Phase 4: Polish (2 hours)

1. **Add visual feedback**
   - Optional: "Updated by another tab" toast
   - Smooth transitions when new items appear

2. **Performance monitoring**
   - Log sync events (dev mode)
   - Measure sync latency

**Total Estimated Time:** 12 hours (1.5 days)

---

## Alternative Quick Win: Reduce Polling Interval

**If you want a quick improvement without code changes:**

Change background sync from 60 seconds to 10 seconds:

```typescript
// In useTodoStore, useTodayViewStore, useAreaStore
refetchInterval: 10000,  // 10 seconds instead of 60
```

**Pros:**
- ✅ Zero code changes (just config)
- ✅ 6x faster sync
- ✅ Works immediately

**Cons:**
- ❌ 6x more API calls
- ❌ Still not instant
- ❌ Increased server load
- ❌ More bandwidth usage

**Recommendation:** Only as a temporary measure while implementing Broadcast Channel

---

## Testing Strategy

### Unit Tests

```typescript
// src/hooks/__tests__/useCrossTabSync.test.ts
describe('useCrossTabSync', () => {
  it('should broadcast messages to other tabs', () => { ... });
  it('should invalidate todos cache on TODO_CREATED', () => { ... });
  it('should invalidate areas cache on AREA_UPDATED', () => { ... });
  it('should ignore messages from same tab', () => { ... });
});
```

### Integration Tests

```typescript
// src/components/__tests__/TodoList.crossTab.test.tsx
describe('TodoList cross-tab sync', () => {
  it('should show new todo created in another tab', async () => {
    // Simulate tab A creating todo
    // Verify tab B receives update
  });
});
```

### Manual Testing Checklist

- [ ] Create todo in Tab A → appears in Tab B within 1 second
- [ ] Complete todo in Tab B → updates in Tab A within 1 second
- [ ] Delete todo in Tab C → removes from Tab A/B within 1 second
- [ ] Area changes sync across tabs
- [ ] Today view updates when todos change
- [ ] Works with 3+ tabs open
- [ ] Works when tabs are in background
- [ ] Works when switching focus between tabs
- [ ] No duplicate API calls
- [ ] No memory leaks (channels cleaned up properly)

---

## Migration Path

### Backward Compatibility

The Broadcast Channel implementation is **non-breaking**:
- ✅ Existing polling still works
- ✅ Window focus refetch still works
- ✅ Manual refresh still works
- ✅ Broadcast Channel adds an extra layer

### Rollout Strategy

1. **Phase 1:** Implement Broadcast Channel (behind feature flag)
2. **Phase 2:** Test with subset of users (enable flag)
3. **Phase 3:** Monitor performance and errors
4. **Phase 4:** Enable for all users
5. **Phase 5:** Remove feature flag, keep polling as fallback

### Feature Flag Example

```typescript
// src/config/features.ts
export const FEATURES = {
  CROSS_TAB_SYNC: import.meta.env.VITE_ENABLE_CROSS_TAB_SYNC === 'true'
};

// In App.tsx
{FEATURES.CROSS_TAB_SYNC && <CrossTabSyncProvider />}
```

---

## Future Enhancements

### Cross-Device Sync (Phase 2)

Once cross-tab sync is working, consider:

1. **WebSocket for real-time sync**
   - Server pushes updates to all connected devices
   - More complex, but enables multi-device sync

2. **Server-Sent Events (SSE)**
   - Simpler than WebSocket
   - One-way communication (server → client)
   - Good enough for todo updates

### Optimistic Updates Across Tabs (Phase 3)

Instead of just invalidating cache, actually update cache with new data:

```typescript
channel.onmessage = (event) => {
  const { type, data } = event.data;
  
  if (type === 'TODO_CREATED') {
    // Optimistically add todo to cache in other tabs
    queryClient.setQueryData(['todos'], (old) => [data.todo, ...old]);
  }
};
```

---

## Summary

### Current State
- ✅ Each tab has isolated state (TanStack Query per-tab)
- ✅ Background sync every 60-120 seconds
- ✅ Window focus refetch
- ❌ No real-time cross-tab sync

### Problem
- Changes in one tab take 60-120 seconds to appear in other tabs
- Poor UX for users with multiple tabs open

### Recommended Solution
- **Broadcast Channel API** for near-instant cross-tab sync
- Simple, native, performant
- ~12 hours implementation time
- Non-breaking change

### Quick Win
- Reduce polling interval from 60s to 10s (temporary measure)

### Next Steps
1. Review this document with team
2. Approve Broadcast Channel approach
3. Create implementation ticket
4. Schedule development (1.5 days)
5. Test thoroughly
6. Deploy behind feature flag
7. Monitor and roll out

---

## References

- [TanStack Query Docs](https://tanstack.com/query/latest/docs/framework/react/overview)
- [Broadcast Channel API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API)
- [localStorage Events (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event)
- [React Query Devtools](https://tanstack.com/query/latest/docs/framework/react/devtools)

---

**Document Status:** ✅ Complete  
**Last Updated:** November 24, 2025  
**Next Review:** After implementation

