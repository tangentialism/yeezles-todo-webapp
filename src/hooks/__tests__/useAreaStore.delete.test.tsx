import { describe, it, expect, vi, beforeEach } from 'vitest';
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

const renderStore = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return renderHook(() => useAreaStore(), {
    wrapper: ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
  });
};

describe('useAreaStore: delete refused for topics', () => {
  beforeEach(() => showToast.mockClear());

  it('says to move or delete the topics first', async () => {
    api.deleteArea.mockRejectedValue(new ApiError(409, 'AREA_HAS_TOPICS', 'Area still has topics'));
    const { result } = renderStore();
    await act(async () => {
      await expect(result.current.deleteArea(2)).rejects.toBeInstanceOf(ApiError);
    });
    expect(showToast).toHaveBeenCalledWith({ message: "Move or delete this area's topics first.", type: 'error' });
  });

  // B4: the backend's message already reads "Failed to delete area: …"
  it("shows another refusal's server message as is, without a second prefix", async () => {
    const message = 'Failed to delete area: Cannot delete area with incomplete todos. Complete or move todos first.';
    api.deleteArea.mockRejectedValue(new ApiError(400, 'BUSINESS_RULE_VIOLATION', message));
    const { result } = renderStore();
    await act(async () => {
      await expect(result.current.deleteArea(3)).rejects.toBeInstanceOf(ApiError);
    });
    expect(showToast).toHaveBeenCalledWith({ message, type: 'error' });
  });

  it('keeps the prefix for an error that is not an ApiError', async () => {
    api.deleteArea.mockRejectedValue(new Error('Something broke'));
    const { result } = renderStore();
    await act(async () => {
      await expect(result.current.deleteArea(3)).rejects.toThrow('Something broke');
    });
    expect(showToast).toHaveBeenCalledWith({ message: 'Failed to delete area: Something broke', type: 'error' });
  });
});
