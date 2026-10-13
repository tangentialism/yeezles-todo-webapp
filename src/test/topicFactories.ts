import { vi } from 'vitest';
import type { Area } from '../types/area';
import type { TopicWithCounts } from '../types/topic';
import type * as AreaContextModule from '../contexts/AreaContext';

/** A topic with counts; override what the test cares about. */
export const makeTopic = (overrides: Partial<TopicWithCounts> = {}): TopicWithCounts => ({
  id: 1,
  user_id: 1,
  area_id: 1,
  name: 'Kitchen reno',
  description: null,
  status_note: null,
  status_note_updated_at: null,
  archived: false,
  created_at: '2026-10-01T00:00:00.000Z',
  updated_at: '2026-10-01T00:00:00.000Z',
  open_count: 0,
  done_count: 0,
  ...overrides,
});

/** An area in the shape the API returns. */
export const makeArea = (overrides: Partial<Area> = {}): Area => ({
  id: 1,
  user_id: '1',
  name: 'Home',
  color: '#43A047',
  reference_code: 'home',
  description: null,
  is_default: false,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

/** A complete useArea() value for spying on the context in component tests. */
export const areaContextValue = (
  overrides: Partial<ReturnType<typeof AreaContextModule.useArea>> = {}
): ReturnType<typeof AreaContextModule.useArea> => ({
  areas: [],
  currentArea: null,
  isLoading: false,
  availableColors: [],
  setCurrentArea: vi.fn(),
  refreshAreas: vi.fn(),
  createArea: vi.fn(),
  updateArea: vi.fn(),
  deleteArea: vi.fn(),
  getAreaStats: vi.fn(),
  getAreaDisplayState: vi.fn().mockReturnValue({ isPending: false, isDeleting: false, isCreating: false }),
  ...overrides,
});
