# Todo Completion Flow Documentation

## Overview
This document describes the optimized todo completion flow implemented with TanStack Query, featuring optimistic updates, undo functionality, and smooth removal animations.

## User Experience Flow

### 1. **User Clicks Checkbox** (t=0ms)
- **Immediate Visual Feedback**: Checkbox shows checked state
- **Optimistic Update**: Todo appears completed in UI instantly
- **Toast Notification**: 2-second undo toast appears with action button
- **API Call**: Mutation starts in background

### 2. **Undo Window** (t=0-2000ms)
- **User Can Undo**: Click "Undo" button or checkbox again
- **Toast Visible**: Shows "Completed [title] • Click to undo" message
- **Graceful Cancellation**: Undo works even if API call is in progress

### 3. **API Call Completes** (~t=1000-2000ms)
- **Server Confirmation**: Todo completion persisted to database
- **Data Synchronization**: Optimistic state replaced with server response
- **Removal Trigger**: For "all" view, removal animation queued

### 4. **Toast Disappears** (t=2000ms)
- **Automatic Dismissal**: Toast fades away after 2 seconds
- **Timing Coordination**: Disappears around when removal animation starts

### 5. **Removal Animation** (t=~2000-2500ms)
- **Animation Start**: Todo marked for removal in "all" view only
- **Visual Transition**: 450ms fade out + height collapse
- **Cache Removal**: Todo removed from TanStack Query cache after animation

## Technical Implementation

### State Management with TanStack Query

```typescript
// Optimistic update immediately on user action
updateTodoMutation.mutate({
  id: todo.id,
  updates: { completed: newCompleted }
});

// Show undo toast for 2 seconds
showToast({
  message: `Completed "${todoTitle}" • Click to undo`,
  type: 'success',
  duration: 2000, // 2 seconds
  action: {
    label: 'Undo',
    onClick: () => revertCompletion()
  }
});
```

### Removal Animation Logic

```typescript
// In updateTodoMutation.onSuccess callback
if (data.completed && view === 'all') {
  // Small delay to let optimistic update settle
  setTimeout(() => {
    // Mark for removal animation
    updateTodosOptimistically((todos) =>
      todos.map(todo =>
        todo.id === data.id
          ? { ...todo, _optimistic: true, _pendingAction: 'delete' }
          : todo
      )
    );
    
    // Remove from cache after animation
    setTimeout(() => {
      updateTodosOptimistically((todos) =>
        todos.filter(todo => todo.id !== data.id)
      );
    }, 450); // Match CSS animation duration
  }, 100);
}
```

### CSS Animation Classes

```css
/* Removal animation styling */
.isRemoving {
  opacity: 0;
  pointer-events: none;
  height: 0;
  margin-bottom: 0;
  transition: opacity 0.2s ease-out, 
              height 0.25s ease-out 0.1s, 
              margin 0.25s ease-out 0.1s;
}
```

## View-Specific Behavior

### "All" View
- ✅ **Optimistic completion**: Immediate visual feedback
- ✅ **Undo functionality**: 2-second window with toast
- ✅ **Removal animation**: Smooth fade out after API confirms
- ✅ **Cache removal**: Todo removed from list completely

### "Completed" View  
- ✅ **Optimistic completion**: Immediate visual feedback
- ✅ **Undo functionality**: 2-second window with toast
- ❌ **No removal**: Todo stays visible in completed view
- ✅ **Data sync**: Server state replaces optimistic state

## Error Handling

### API Call Fails
1. **Rollback**: Optimistic state reverted automatically
2. **Error Toast**: User notified of failure
3. **Retry**: User can attempt completion again
4. **No Animation**: Removal animation cancelled

### Network Issues
1. **Retry Logic**: TanStack Query automatically retries failed requests
2. **Offline Resilience**: Mutations queued when offline
3. **Sync on Reconnect**: Pending operations execute when network returns

## Undo Functionality

### During Toast Window (0-2000ms)
- **Method 1**: Click "Undo" button on toast
- **Method 2**: Click checkbox again
- **Result**: Immediate reversion, API call to uncomplete

### During Removal Animation (~2000-2500ms)
- **Still Possible**: Undo cancels removal animation
- **Visual Restore**: Todo immediately stops animating and restores
- **State Sync**: Optimistic uncomplete + API call

### After Removal Complete (>2500ms)
- **Not Possible**: Todo removed from "all" view completely
- **Alternative**: User must go to "completed" view to uncomplete

## Performance Benefits

### Optimistic Updates
- **Zero Latency**: Immediate UI response to user actions
- **Perceived Performance**: App feels instant and responsive
- **Background Sync**: Server operations don't block UI

### Smart Caching
- **Reduced Requests**: TanStack Query prevents unnecessary refetches
- **Background Refresh**: Data stays fresh without user waiting
- **Memory Efficient**: Automatic cache cleanup and garbage collection

### Smooth Animations
- **Native Performance**: CSS transitions for smooth 60fps animations
- **Coordinated Timing**: Toast and removal animations work together
- **Non-Blocking**: Animations don't prevent other user interactions

## Configuration

### Timing Constants
```typescript
const TOAST_DURATION = 2000;        // 2 seconds
const REMOVAL_DELAY = 100;          // 100ms after API success
const ANIMATION_DURATION = 450;     // 450ms CSS transition
```

### Customization Options
- Toast duration can be adjusted per operation type
- Animation timing can be modified in CSS
- View-specific behavior can be configured per component

## Testing Scenarios

### Happy Path
1. Click checkbox → immediate completion
2. Wait 2 seconds → toast disappears, removal starts
3. Wait 450ms → todo removed from view

### Undo During Toast
1. Click checkbox → immediate completion
2. Click "Undo" within 2 seconds → immediate reversion
3. Todo returns to uncompleted state

### Undo During Animation
1. Click checkbox → immediate completion  
2. Wait 2+ seconds → removal animation starts
3. Click checkbox again → animation cancels, todo restores

### Network Error
1. Click checkbox → immediate completion
2. API fails → automatic rollback + error message
3. Todo returns to original state

This flow provides the best possible user experience with instant feedback, clear visual cues, and robust error handling.