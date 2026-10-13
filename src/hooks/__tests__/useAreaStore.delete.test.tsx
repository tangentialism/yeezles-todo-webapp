import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '../../services/apiError';

const api = vi.hoisted(() => ({
  getAreas: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getAvailableColors: vi.fn().mockResolvedValue({ success: true, data: [] }),
  deleteArea: vi.fn(),
}));
const showToast = vi.hoisted(() => vi.fn());
vi.mock('../useApi', () => ({ useApi: () => api }));
vi.mock('../useCrossTabSync', () => ({ useCrossTabSync: () => ({ broadcast: vi.fn() }) }));
vi.mock('../../contexts/ToastContext', () => ({ useToast: () => ({ showToast, hideToast: vi.fn() }) }));

import { useAreaStore } from '../useAreaStore';

describe('useAreaStore: delete refused for topics', () => {
  it('says to move or delete the topics first', async () => {
    api.deleteArea.mockRejectedValue(new ApiError(409, 'AREA_HAS_TOPICS', 'Area still has topics'));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const { result } = renderHook(() => useAreaStore(), {
      wrapper: ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
    });
    await act(async () => {
      await expect(result.current.deleteArea(2)).rejects.toBeInstanceOf(ApiError);
    });
    expect(showToast).toHaveBeenCalledWith({ message: "Move or delete this area's topics first.", type: 'error' });
  });
});
