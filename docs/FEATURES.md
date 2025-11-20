# Yeezles Todo Web Application - Feature Requirements

**Last Updated:** November 20, 2025

---

## Overview

This document describes the feature requirements and specifications for the Yeezles Todo Web Application. For current implementation status, see **[STATUS.md](./STATUS.md)**.

---

## Core Todo Management

### Todo CRUD Operations
**Status:** ✅ Fully Implemented

**Requirements:**
- Create todos with title, description, tags, due date, area assignment, reference URL
- Read todos with comprehensive filtering options
- Update any todo field with optimistic UI updates
- Delete todos with confirmation and undo capability
- Support for batch operations (future enhancement)

**Success Criteria:**
- ✅ Instant UI feedback with optimistic updates
- ✅ Automatic rollback on errors
- ✅ Response time < 100ms for local updates
- ✅ Background sync within 60 seconds
- ✅ Undo functionality for destructive actions

**User Experience:**
- ✅ Click checkbox to complete/uncomplete todo
- ✅ Click todo title to edit inline or open modal
- ✅ Dropdown menu for additional actions (edit, delete, move to today)
- ✅ Drag-to-reorder (future enhancement)
- ✅ Keyboard shortcuts for quick actions (future enhancement)

**UI Components:**
- ✅ `AddTodoModal` - Create new todos
- ✅ `EditTodoModal` - Update existing todos
- ✅ `TodoItem` - Display individual todo with actions
- ✅ `TodoList` - List of todos with filtering
- ✅ `TodoActions` - Dropdown menu for todo operations

---

### Advanced Filtering
**Status:** ✅ Fully Implemented

**Requirements:**
- Filter by completion status (all, active, completed)
- Filter by area assignment (specific area or all areas)
- Filter by tags (with AND/OR modes)
- Filter by due date ranges
- Full-text search across title and description
- Sort by multiple fields (created_at, updated_at, due_date, completed_at)
- Combine multiple filters simultaneously

**Success Criteria:**
- ✅ All filters can be combined
- ✅ Filter updates are instant (cached data)
- ✅ Filter state persists in URL (future enhancement)
- ✅ Search highlights matches (future enhancement)

**Filter Types:**
- ✅ **View Filter**: All / Completed
- ✅ **Area Filter**: Dropdown selector (all areas or specific area)
- ✅ **Today View**: Smart categorization (overdue, due today, today tagged, coming soon)
- ⚠️ **Tag Filter**: Click tags to filter (partially implemented)
- 🔄 **Search Filter**: Full-text search (backend ready, UI planned)
- 🔄 **Date Range Filter**: Calendar-based selection (planned)

**UI Components:**
- ✅ `Navigation` - View filter tabs
- ✅ Area dropdown in navigation bar
- 🔄 Search bar in header (planned)
- 🔄 Advanced filters panel (planned)

---

### Smart Today View
**Status:** ✅ Fully Implemented

**Requirements:**
- Intelligent categorization of todos based on due dates and tags
- Focus section with high-priority items
- Upcoming section with coming soon items
- Summary metadata with needs attention flag
- Configurable "coming soon" window (days ahead)
- Deduplication (todos don't appear in multiple categories)

**Success Criteria:**
- ✅ Overdue items prominently displayed
- ✅ Due today items clearly separated
- ✅ Today-tagged items easily accessible
- ✅ Coming soon window configurable
- ✅ Needs attention flag when overdue > 0

**Categories:**

1. **Focus Section** (High Priority)
   - **Overdue** (red badge): Past due date, incomplete
   - **Due Today** (orange badge): Due date = today, incomplete
   - **Today Tagged** (blue badge): `is_today = true`, incomplete

2. **Upcoming Section** (Lower Priority)
   - **Coming Soon** (gray badge): Due within X days (configurable)

**Smart Categorization Rules:**
- Todos appear in highest-priority category only
- Priority order: Overdue > Due Today > Today Tagged > Coming Soon
- Completed todos never appear in today view
- Empty categories show helpful empty states

**UI Components:**
- ✅ `TodayView` - Smart today view container
- ✅ Focus section with 3 categories
- ✅ Upcoming section with coming soon
- ✅ Summary statistics
- ✅ Category count badges

---

### Optimistic Updates
**Status:** ✅ Fully Implemented

**Requirements:**
- Instant UI feedback for all user actions
- Automatic rollback on errors
- Visual indicators for pending operations
- Smooth animations for state changes
- Undo functionality for critical operations

**Success Criteria:**
- ✅ UI updates within 50ms of user action
- ✅ Server sync happens in background
- ✅ Rollback preserves data integrity
- ✅ Users can undo completions within 2 seconds

**Supported Operations:**
- ✅ **Create Todo**: Instant add with temporary ID, replaced on success
- ✅ **Update Todo**: Instant update with pending indicator, confirmed on success
- ✅ **Delete Todo**: Fade-out animation, removed on success
- ✅ **Toggle Completion**: Instant toggle with undo toast
- ✅ **Move to Today**: Instant `is_today` flag update
- ✅ **Remove from Today**: Instant `is_today` flag removal

**Visual Indicators:**
- ✅ Opacity reduction (50%) for pending updates
- ✅ Fade-out animation for deletions (450ms)
- ✅ Slide-in animation for new todos (300ms)
- ✅ Undo toast for completions (2-second window)
- ✅ Loading spinners for slow operations (> 500ms)

---

### Background Synchronization
**Status:** ✅ Fully Implemented

**Requirements:**
- Automatic background sync with configurable intervals
- Sync on window focus (user returns to tab)
- Sync on network reconnect
- Preserve optimistic updates during sync
- Handle sync conflicts gracefully

**Success Criteria:**
- ✅ Background sync every 60 seconds
- ✅ Window focus sync within 1 second
- ✅ Network reconnect sync within 2 seconds
- ✅ Optimistic updates preserved during sync
- ✅ No UI jank during background operations

**Configuration:**
- ✅ Sync interval: 60 seconds (configurable)
- ✅ Stale time: 30 seconds (data considered fresh)
- ✅ Cache time: 10 minutes (data kept in memory)
- ✅ Refetch on mount: Yes
- ✅ Refetch on window focus: Yes
- ✅ Refetch on reconnect: Yes

---

### Undo Functionality
**Status:** ✅ Fully Implemented

**Requirements:**
- Undo completion within 2-second window
- Visual feedback (toast notification)
- Action button clearly labeled "Undo"
- Preserve todo state if undone within window
- No undo after window expires

**Success Criteria:**
- ✅ Undo button visible for 2 seconds
- ✅ Undo reverses completion instantly
- ✅ Todo remains visible if undone
- ✅ Toast disappears after undo or timeout

**Implementation:**
- ✅ Toast with "Undo" action button
- ✅ 2-second auto-dismiss
- ✅ Instant revert on undo click
- ✅ Cancel removal animation on undo
- ✅ Update backend immediately

---

## Authentication & Security

### Google OAuth Authentication
**Status:** ✅ Fully Implemented

**Requirements:**
- Google OAuth 2.0 integration
- Single-click sign-in with Google
- User profile display (picture, name, email)
- Secure token management (in-memory only)
- Automatic logout on token expiration or auth errors

**Success Criteria:**
- ✅ Sign-in within 3 seconds
- ✅ Tokens never stored in localStorage
- ✅ Automatic logout on 401/403 responses
- ✅ Token validation with 5-minute buffer
- ✅ Seamless user experience

**Security Features:**
- ✅ Tokens in memory only (React state)
- ✅ No localStorage persistence for tokens
- ✅ Automatic token validation before API calls
- ✅ Token expiration handling (prompt for re-auth)
- ✅ Secure cookie support for persistent sessions

**UI Components:**
- ✅ `LoginButton` - Google Sign-In with "Remember Me" checkbox
- ✅ User profile display in header
- ✅ Logout button
- ✅ Loading screen during auth check

---

### Persistent Sessions ("Remember Me")
**Status:** ✅ Fully Implemented

**Requirements:**
- Optional "Remember Me" checkbox on login
- 30-day persistent sessions with HTTP-only cookies
- Automatic session validation on app startup
- Session health monitoring with expiration warnings
- Multi-device session management
- "Sign Out Everywhere" functionality

**Success Criteria:**
- ✅ Users stay logged in for 30 days
- ✅ Sessions automatically rotate when < 7 days until expiry
- ✅ Users see expiration warnings
- ✅ Users can manage sessions across devices
- ✅ Secure session storage (HTTP-only cookies)

**Security Features:**
- ✅ HTTP-only cookies (JavaScript cannot access)
- ✅ Secure flag (HTTPS only)
- ✅ SameSite=Strict (CSRF protection)
- ✅ Automatic token rotation (< 7 days until expiry)
- ✅ Session fingerprinting (user agent hash)
- ✅ Session revocation (single or all devices)

**Session Management:**
- ✅ View all active sessions
- ✅ Revoke specific session (sign out from one device)
- ✅ Revoke all sessions (sign out everywhere)
- ✅ Session health check (hourly)
- ✅ Expiration warnings (< 7 days)

**UI Components:**
- ✅ "Remember Me" checkbox on login
- ✅ `SessionHealthWarning` - Expiration alerts
- 🔄 Session management page (planned)

---

### Security Architecture
**Status:** ✅ Fully Implemented

**Requirements:**
- HTTPS only in production
- Bearer token authentication
- Cookie credentials for persistent sessions
- Automatic logout on authentication failures
- No sensitive data in console logs
- XSS prevention
- CSRF protection

**Success Criteria:**
- ✅ No tokens in localStorage
- ✅ Automatic logout on 401/403
- ✅ HTTPS enforced in production
- ✅ Cookies HTTP-only and secure
- ✅ SameSite=Strict for CSRF protection

**Implemented Security:**
- ✅ In-memory token storage
- ✅ HTTP-only cookies for sessions
- ✅ Secure cookies (HTTPS only)
- ✅ SameSite=Strict cookies
- ✅ React auto-escapes all text content
- ✅ No `dangerouslySetInnerHTML` for user input
- ✅ Generic error messages to users
- ✅ Sensitive data never logged

---

## Areas System

### Area Management
**Status:** ✅ Fully Implemented

**Requirements:**
- Create organizational areas for todo categorization
- Assign Material Design colors for visual consistency
- Auto-generate URL-safe reference codes
- Support default area designation
- Track area statistics (todo counts, completion rates)
- Protect areas with incomplete todos from deletion

**Success Criteria:**
- ✅ Areas provide meaningful organization
- ✅ Color system is consistent (Material Design)
- ✅ Reference codes are URL-safe and unique
- ✅ Only one default area at a time
- ✅ Statistics calculate accurately

**Material Design Color System:**

| Color | Hex | Suggested Use |
|-------|-----|--------------|
| Blue | #1976D2 | Work, Professional |
| Green | #388E3C | Home, Personal |
| Purple | #7B1FA2 | Projects, Creative |
| Orange | #F57C00 | Personal, Hobbies |
| Red | #D32F2F | Urgent, Important |
| Teal | #00796B | Health, Wellness |
| Indigo | #303F9F | Learning, Education |
| Brown | #5D4037 | Finance, Admin |

**Area Operations:**
- ✅ Create new area with name, description, color
- ✅ Edit existing area (name, description, color, default)
- ✅ Delete area (with protection if todos exist)
- ✅ View area statistics (todo counts, completion rates)
- ✅ Set default area (only one at a time)
- ✅ Filter todos by area

**UI Components:**
- ✅ `AreaManagementModal` - Area CRUD interface
- ✅ Area dropdown in navigation
- ✅ Area badge on todo items (colored pill)
- ✅ Area selector in add/edit modals

---

### Area-Based Filtering
**Status:** ✅ Fully Implemented

**Requirements:**
- Filter todos by selected area
- Show "All Areas" option
- Persist area selection per device
- Display current area in navigation
- Include area in todo display (colored badge)

**Success Criteria:**
- ✅ Area filter updates todos instantly (cached data)
- ✅ Selected area persists across sessions
- ✅ Visual feedback for current area
- ✅ Easy switching between areas

**Implementation:**
- ✅ Area dropdown in navigation bar
- ✅ Area selection persisted in localStorage
- ✅ Area context provider (global state)
- ✅ Automatic filter application
- ✅ Area badge on each todo

---

### Area Statistics
**Status:** ✅ Fully Implemented

**Requirements:**
- Total todos per area
- Completed todos per area
- Incomplete todos per area
- Completion rate percentage
- Real-time updates

**Success Criteria:**
- ✅ Statistics accurate at all times
- ✅ Updates reflect immediately after todo changes
- ✅ Statistics displayed in area management UI

**Displayed Metrics:**
- ✅ Total todos
- ✅ Completed todos
- ✅ Incomplete todos
- ✅ Completion rate (percentage)

---

## User Interface Features

### Responsive Design
**Status:** ✅ Fully Implemented

**Requirements:**
- Mobile-first responsive design
- Tablet-optimized layouts
- Desktop-optimized layouts
- Touch-friendly tap targets (44×44px minimum)
- Swipe gestures for modals (mobile)
- Bottom sheet modals on mobile

**Success Criteria:**
- ✅ Usable on all screen sizes
- ✅ No horizontal scrolling
- ✅ Touch targets large enough for fingers
- ✅ Readable font sizes on mobile
- ✅ Intuitive navigation on all devices

**Breakpoints:**
- Mobile: < 640px (sm)
- Tablet: 640px - 1024px (md, lg)
- Desktop: > 1024px (xl, 2xl)

**Mobile Optimizations:**
- ✅ Touch-friendly tap targets (44×44px)
- ✅ Responsive navigation (collapsed menu)
- ✅ Single-column layouts
- ✅ Optimized font sizes (16px base)
- 🔄 Swipe gestures for modals (planned)
- 🔄 Bottom sheet modals (planned)

**Tablet Optimizations:**
- ✅ Two-column layouts where appropriate
- ✅ Expanded navigation
- ✅ Larger tap targets
- ✅ Improved spacing

**Desktop Optimizations:**
- ✅ Three-column layouts (optional)
- ✅ Sidebar navigation
- ✅ Hover effects
- 🔄 Keyboard shortcuts (planned)
- 🔄 Multi-select operations (planned)

---

### Toast Notifications
**Status:** ✅ Fully Implemented

**Requirements:**
- Visual feedback for all user actions
- Success, error, warning, and info toast types
- Auto-dismiss with configurable duration
- Manual dismiss option
- Action buttons (e.g., "Undo")
- Stacking toasts (multiple visible)
- Accessible (ARIA labels)

**Success Criteria:**
- ✅ Toasts appear within 100ms of action
- ✅ Auto-dismiss after configured duration
- ✅ Users can dismiss manually
- ✅ Action buttons work correctly
- ✅ Multiple toasts don't overlap

**Toast Types:**
- ✅ Success (green) - "Todo created!", "Todo updated!"
- ✅ Error (red) - "Failed to create todo", "Network error"
- ✅ Warning (yellow) - "Session expires soon"
- ✅ Info (blue) - General information

**Features:**
- ✅ Auto-dismiss (default: 3 seconds, configurable)
- ✅ Manual dismiss (X button)
- ✅ Action buttons (e.g., "Undo")
- ✅ Stacking (multiple toasts visible)
- ✅ Slide-in animation
- ✅ ARIA live regions for screen readers

**UI Component:**
- ✅ `Toast` - Individual toast notification
- ✅ `ToastContext` - Global toast management

---

### Loading States
**Status:** ✅ Fully Implemented

**Requirements:**
- Skeleton loaders for initial page load
- Loading spinners for slow operations (> 500ms)
- Progress indicators for long operations
- Empty state messages
- Error state displays

**Success Criteria:**
- ✅ Users never see blank screens
- ✅ Loading states appear within 100ms
- ✅ Skeleton loaders match final UI
- ✅ Error states provide actionable feedback

**Loading States:**
- ✅ Initial auth check (full-screen spinner)
- ✅ Todo list loading (skeleton items)
- ✅ Modal form submission (button spinner)
- ✅ Background sync (subtle indicator)
- ✅ API status check (connection indicator)

**Empty States:**
- ✅ No todos in list: "No todos yet. Add one to get started!"
- ✅ No todos in today view: "Nothing due today. Enjoy your day!"
- ✅ No todos in category: "No [overdue/due today/etc.] todos"
- ✅ No areas: "Create your first area to organize todos"

---

### Animations & Transitions
**Status:** ✅ Fully Implemented

**Requirements:**
- Smooth transitions between views (200ms)
- Slide-in animation for new todos (300ms)
- Fade-out animation for deletions (450ms)
- Opacity changes for optimistic updates (instant)
- Loading animations (spinners, skeletons)

**Success Criteria:**
- ✅ Animations enhance UX, not distract
- ✅ Transitions feel smooth (60fps)
- ✅ No jank or stuttering
- ✅ Animations complete before next operation

**Implemented Animations:**
- ✅ View transitions (opacity fade, 200ms)
- ✅ New todo slide-in (transform, 300ms)
- ✅ Delete todo fade-out (opacity + scale, 450ms)
- ✅ Optimistic update opacity (instant, 50%)
- ✅ Modal open/close (scale + opacity, 200ms)
- ✅ Toast slide-in (transform, 200ms)
- ✅ Loading spinners (continuous rotation)

---

### API Status Indicator
**Status:** ✅ Fully Implemented

**Requirements:**
- Real-time API connection status
- Last sync timestamp
- Error state with retry button
- Subtle display (doesn't distract)
- Automatic status updates

**Success Criteria:**
- ✅ Users always know connection status
- ✅ Errors clearly communicated
- ✅ Retry option available on errors
- ✅ Updates in real-time

**States:**
- ✅ Connected (green dot): "Connected • Last sync: 2 minutes ago"
- ✅ Syncing (blue spinner): "Syncing..."
- ✅ Error (red dot): "Connection error • Retry"
- ✅ Disconnected (gray dot): "Offline"

**UI Component:**
- ✅ `ApiStatus` - Connection status indicator

---

## Advanced Features

### Cross-References
**Status:** ⚠️ Backend Ready, Frontend Partial

**Requirements:**
- Detect todo references in descriptions (#123 format)
- Create clickable links to referenced todos
- Display incoming/outgoing references
- Highlight broken references
- Navigate between related todos

**Success Criteria:**
- ✅ Backend processing enabled (HTML mode)
- 🔄 Frontend rendering of cross-reference links
- 🔄 Click to navigate to referenced todo
- 🔄 Visual indication of references

**Backend Support:**
- ✅ Auto-detect #123 references in title/description
- ✅ Generate HTML with clickable links
- ✅ Track incoming/outgoing references
- ✅ Identify broken references

**Frontend Implementation:**
- ⚠️ Render HTML with cross-reference links (partial)
- 🔄 Click handler for navigation (planned)
- 🔄 Reference count badge (planned)
- 🔄 Reference panel in todo detail (planned)

---

### Tag System
**Status:** ⚠️ Backend Ready, Frontend Partial

**Requirements:**
- Auto-extract tags from text (@tagname format)
- Display tags as colored pills
- Click tag to filter by tag
- Tag usage statistics
- Tag management (rename, delete)

**Success Criteria:**
- ✅ Backend auto-extraction working
- ✅ Tags displayed on todos
- 🔄 Click tag to filter todos
- 🔄 Tag management interface
- 🔄 Tag statistics

**Backend Support:**
- ✅ Auto-extract tags from title/description
- ✅ Store tags in database
- ✅ Tag usage counts
- ✅ Tag filtering (AND/OR modes)

**Frontend Implementation:**
- ✅ Display tags as colored pills
- ⚠️ Click tag to filter (partial)
- 🔄 Tag management modal (planned)
- 🔄 Tag autocomplete in forms (planned)

---

### Search
**Status:** ⚠️ Backend Ready, Frontend Planned

**Requirements:**
- Full-text search across title and description
- Search highlighting
- Search suggestions
- Search history
- Combine search with filters

**Success Criteria:**
- ✅ Backend FTS5 search working
- 🔄 Frontend search bar
- 🔄 Search highlighting
- 🔄 Search as you type
- 🔄 Search history

**Backend Support:**
- ✅ SQLite FTS5 full-text search
- ✅ Search across title and description
- ✅ Relevance ranking

**Frontend Implementation:**
- 🔄 Search bar in header (planned)
- 🔄 Search results page (planned)
- 🔄 Search highlighting (planned)
- 🔄 Search suggestions (planned)

---

### Export/Import
**Status:** ⚠️ Backend Ready, Frontend Planned

**Requirements:**
- Export all todos to JSON
- Export with filters (completed, tags, areas)
- Import from JSON
- Merge or overwrite options
- Data validation on import

**Success Criteria:**
- ✅ Backend export/import working
- 🔄 Frontend export button
- 🔄 Frontend import modal
- 🔄 Progress indicators for large exports
- 🔄 Import validation feedback

**Backend Support:**
- ✅ Export to JSON with filters
- ✅ Import from JSON with validation
- ✅ Merge or overwrite modes

**Frontend Implementation:**
- 🔄 Export button in settings (planned)
- 🔄 Import modal with file upload (planned)
- 🔄 Import preview before applying (planned)

---

## Future Enhancements

### Priority 1 (P1) - Near Term

#### Enhanced Search
**Status:** 🔄 Planned

**Features:**
- Full-text search bar in header
- Search as you type with suggestions
- Search highlighting in results
- Search history
- Combined search + filters

#### Tag Management
**Status:** 🔄 Planned

**Features:**
- Tag management modal
- Rename tags
- Delete tags (with reassignment)
- Tag usage statistics
- Tag autocomplete in forms
- Tag color customization

#### Keyboard Shortcuts
**Status:** 🔄 Planned

**Features:**
- Global shortcuts (Cmd/Ctrl+K for command palette)
- Quick add (Cmd/Ctrl+N)
- Navigation shortcuts (Cmd/Ctrl+1/2/3 for views)
- Todo actions (E for edit, D for delete, Space for complete)
- Search focus (Cmd/Ctrl+F or /)

---

### Priority 2 (P2) - Mid Term

#### Dark Mode
**Status:** 🔄 Planned

**Features:**
- System preference detection
- Manual toggle
- Dark color scheme (Tailwind dark mode)
- Smooth transition between modes
- Persist preference

#### Rich Text Editor
**Status:** 🔄 Planned

**Features:**
- Markdown support for descriptions
- Rich text formatting (bold, italic, lists)
- Code blocks
- Inline images (future)
- Preview mode

#### Calendar View
**Status:** 🔄 Planned

**Features:**
- Month/week/day views
- Drag-and-drop to reschedule
- Due date visualization
- Quick add from calendar
- Integration with today view

#### PWA Features
**Status:** 🔄 Planned

**Features:**
- Service worker for offline support
- Offline data persistence (IndexedDB)
- Background sync when online
- Install prompt
- Add to home screen

#### Performance Monitoring
**Status:** 🔄 Planned

**Features:**
- Integration with Sentry or similar
- Error tracking and reporting
- Performance metrics
- User session recording (optional)

---

### Priority 3 (P3) - Long Term

#### Collaboration
**Status:** 🔮 Future

**Features:**
- Shared areas
- Real-time updates (WebSockets)
- Activity feed
- Assign todos to users
- Comments on todos

#### Attachments
**Status:** 🔮 Future

**Features:**
- File uploads (images, PDFs, etc.)
- Attachment previews
- Cloud storage integration
- Drag-and-drop uploads

#### Advanced Analytics
**Status:** 🔮 Future

**Features:**
- Productivity insights
- Completion trends
- Time tracking
- Burndown charts
- Custom reports

#### Recurring Todos
**Status:** 🔮 Future

**Features:**
- Define recurrence patterns (daily, weekly, monthly)
- Skip or complete instances
- View upcoming instances
- Auto-create on completion

#### Internationalization (i18n)
**Status:** 🔮 Future

**Features:**
- Multi-language support
- Date/time localization
- Currency formatting
- RTL support (Arabic, Hebrew)

#### AI Features
**Status:** 🔮 Future

**Features:**
- Smart task suggestions
- Auto-categorization by area
- Due date suggestions
- Priority recommendations
- Voice input with transcription

---

## Related Documentation

- **[API.md](./api/API.md)** - Frontend API consumption patterns
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture and design
- **[STATUS.md](./STATUS.md)** - Current implementation status
- **[TESTING.md](./TESTING.md)** - Testing strategies and guidelines
- **[Backend Features](../../yeezles-todo/docs/FEATURES.md)** - Backend feature specifications

---

## Change Log

### Version 1.0.0 (November 20, 2025)
- ✅ Core todo management (CRUD, filtering, search)
- ✅ Google OAuth authentication
- ✅ Persistent sessions (30-day Remember Me)
- ✅ Optimistic updates with undo
- ✅ Smart today view with categorization
- ✅ Areas system with Material Design colors
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Background synchronization
- ✅ Session health monitoring
- ✅ Toast notification system
- ⚠️ Cross-references (backend ready, frontend partial)
- ⚠️ Tag system (backend ready, frontend partial)
- 🔄 Search (backend ready, frontend planned)
- 🔄 Export/Import (backend ready, frontend planned)

