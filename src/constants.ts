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
