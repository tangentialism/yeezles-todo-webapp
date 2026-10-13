/**
 * Compact calendar date for mono metadata lines: "Oct 13", or "Oct 13 2025"
 * outside the current year.
 * @param iso - ISO timestamp
 * @param now - Reference date (for tests)
 */
export const formatShortDate = (iso: string, now: Date = new Date()): string => {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '';
  const md = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return date.getFullYear() === now.getFullYear() ? md : `${md} ${date.getFullYear()}`;
};

/**
 * Format a date string for display
 * @param dateString - ISO date string or null
 * @returns Formatted date string or empty string if null
 */
export const formatDate = (dateString: string | null): string => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  
  // Check if date is valid
  if (isNaN(date.getTime())) return '';
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Coarse relative time for notes and proposals: "just now", "20 minutes ago",
 * "5 hours ago", "yesterday", "3 days ago". Future times read "just now".
 * @param iso - ISO timestamp
 * @param now - Reference date (for tests)
 */
export const formatRelative = (iso: string, now: Date = new Date()): string => {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const minutes = Math.floor((now.getTime() - then) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
};
