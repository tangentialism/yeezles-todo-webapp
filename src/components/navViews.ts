/** The five views, shared by the desktop tabs and the phone tab bar. */
export const VIEWS = [
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Today' },
  { id: 'topics', label: 'Topics' },
  { id: 'people', label: 'People' },
  { id: 'accomplishments', label: 'Done' },
] as const;

/** Multi-colour swatch shown for "All areas". */
export const ALL_AREAS_SWATCH = 'conic-gradient(#1E88E5 0 33%, #43A047 0 66%, #8E24AA 0)';
