# Cross-Tab Synchronization Testing Guide

**Feature:** Broadcast Channel API for real-time cross-tab sync  
**Status:** ✅ Implemented, Ready for Testing

---

## What Was Implemented

Cross-tab synchronization using the native Broadcast Channel API enables real-time state updates across multiple browser tabs without page refresh.

### Changes Made

1. **New Types** (`src/types/sync.ts`)
   - `SyncMessage` - Message structure for cross-tab communication
   - `SyncMessageType` - Message types (TODO_CREATED, TODO_UPDATED, etc.)
   
2. **New Hook** (`src/hooks/useCrossTabSync.ts`)
   - Listens for messages from other tabs
   - Invalidates React Query cache when changes detected
   - Broadcasts changes to other tabs

3. **Integrated into Stores**
   - `useTodoStore` - Broadcasts on all todo mutations
   - `useAreaStore` - Broadcasts on all area mutations

---

## Manual Testing Checklist

### Setup
1. Start the development server: `npm run dev`
2. Open the app in your browser: `http://localhost:5173`
3. Login with Google OAuth
4. Open 2-3 additional tabs with the same URL

### Test Scenarios

#### Scenario 1: Create Todo
- [ ] **Tab A**: Create a new todo
- [ ] **Tab B**: Todo appears within 1 second (no refresh needed)
- [ ] **Tab C**: Todo appears within 1 second (no refresh needed)
- [ ] **Expected**: All tabs show the new todo instantly

#### Scenario 2: Complete Todo
- [ ] **Tab A**: Check off a todo to mark it complete
- [ ] **Tab B**: Todo shows as completed within 1 second
- [ ] **Tab C**: Todo shows as completed within 1 second
- [ ] **Expected**: Checkmark animation appears in all tabs

#### Scenario 3: Delete Todo
- [ ] **Tab A**: Delete a todo
- [ ] **Tab B**: Todo disappears within 1 second
- [ ] **Tab C**: Todo disappears within 1 second
- [ ] **Expected**: Smooth fade-out animation in all tabs

#### Scenario 4: Update Todo
- [ ] **Tab A**: Edit a todo (change title/description)
- [ ] **Tab B**: Updated content appears within 1 second
- [ ] **Tab C**: Updated content appears within 1 second
- [ ] **Expected**: No visual glitches, smooth update

#### Scenario 5: Move to Today
- [ ] **Tab A**: Move a todo to "Today" list
- [ ] **Tab B**: Switch to "Today" view → todo appears
- [ ] **Tab C**: Already on "Today" view → todo appears instantly
- [ ] **Expected**: Today view updates in all tabs

#### Scenario 6: Areas - Create
- [ ] **Tab A**: Create a new area
- [ ] **Tab B**: Area appears in area dropdown within 1 second
- [ ] **Tab C**: Area appears in area dropdown within 1 second
- [ ] **Expected**: All tabs have new area available

#### Scenario 7: Areas - Update
- [ ] **Tab A**: Edit an area (change name/color)
- [ ] **Tab B**: Area name/color updates within 1 second
- [ ] **Tab C**: Area name/color updates within 1 second
- [ ] **Expected**: UI reflects changes everywhere

#### Scenario 8: Areas - Delete
- [ ] **Tab A**: Delete an area
- [ ] **Tab B**: Area removed from dropdown within 1 second
- [ ] **Tab C**: Area removed from dropdown within 1 second
- [ ] **Expected**: No orphaned todos, graceful handling

#### Scenario 9: Multiple Rapid Changes
- [ ] **Tab A**: Create 3 todos rapidly (one after another)
- [ ] **Tab B**: All 3 todos appear in correct order
- [ ] **Tab C**: All 3 todos appear in correct order
- [ ] **Expected**: No race conditions, correct ordering

#### Scenario 10: Background Tab
- [ ] **Tab A**: Active tab
- [ ] **Tab B**: Background tab (not focused)
- [ ] **Tab C**: Background tab (not focused)
- [ ] **Tab A**: Create/update/delete several todos
- [ ] **Tab B**: Switch focus → todos update immediately
- [ ] **Tab C**: Switch focus → todos update immediately
- [ ] **Expected**: Background sync works, updates visible on focus

---

## What to Look For

### ✅ Success Indicators
- Changes appear in other tabs **within 1 second**
- No page refresh needed
- Smooth animations (no jarring updates)
- No duplicate todos
- No missing todos
- Correct ordering maintained
- Toast notifications only in the tab that made the change

### ❌ Red Flags
- Changes take > 5 seconds to appear
- Duplicate todos appear
- Todos disappear unexpectedly
- Console errors (check browser DevTools)
- Memory leaks (check DevTools Performance tab)
- Race conditions (todos appear in wrong order)

---

## Browser Compatibility

The Broadcast Channel API is supported in:
- ✅ Chrome 54+
- ✅ Firefox 38+
- ✅ Safari 15.4+
- ✅ Edge 79+

Test in your primary browser first, then verify in at least one other browser.

---

## Debugging

If sync isn't working:

1. **Open Browser DevTools** (F12)
2. **Check Console** for errors
3. **Look for messages** like:
   - `BroadcastChannel not supported` (old browser)
   - `Failed to broadcast message` (channel error)
4. **Verify Network Tab** shows API calls completing successfully
5. **Check React Query DevTools** (bottom-left icon) to see cache updates

### Common Issues

**Issue:** Changes don't sync at all
- **Cause:** Broadcast Channel not supported (old browser)
- **Solution:** Test in a modern browser

**Issue:** Changes sync but take 30-60 seconds
- **Cause:** Falling back to background polling
- **Solution:** Check console for BroadcastChannel errors

**Issue:** Console shows "BroadcastChannel not initialized"
- **Cause:** Hook not being called (shouldn't happen with current implementation)
- **Solution:** Verify stores are being used in components

---

## Performance Monitoring

While testing, monitor:
1. **Network Tab**: Should see minimal API calls (only when making changes)
2. **Performance Tab**: No memory leaks over time
3. **React Query DevTools**: Cache should invalidate and refetch quickly

---

## Next Steps After Testing

1. ✅ Verify all scenarios pass
2. ✅ Test in multiple browsers
3. ✅ Check for console errors/warnings
4. ✅ Monitor performance (no memory leaks)
5. 📝 Update STATUS.md with test results
6. 📝 Update FEATURES.md with cross-tab sync feature
7. 🚀 Deploy to production

---

## Rollback Plan

If issues are found:

1. **Quick fix**: Disable cross-tab sync by commenting out `useCrossTabSync()` calls in stores
2. **Full rollback**: Revert commits related to cross-tab sync
3. **Fallback**: System still works with background polling (60s intervals)

The implementation is **non-breaking** - existing functionality continues to work via:
- Background polling (every 60 seconds)
- Window focus refetch
- Manual refresh button

---

## Questions to Answer

- [ ] Does sync feel instant (<1s)?
- [ ] Are there any visual glitches?
- [ ] Does it work with 5+ tabs open?
- [ ] Does it work when tabs are in background?
- [ ] Are there any console errors?
- [ ] Does performance feel good (no lag)?
- [ ] Do toasts appear only in the active tab?

---

**Ready to test?** Open 3 tabs and start creating/updating/deleting todos! 🎉

