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
