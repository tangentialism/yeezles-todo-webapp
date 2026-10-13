import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const api = vi.hoisted(() => ({
  getTodos: vi.fn(),
  createTodo: vi.fn(),
  updateTodo: vi.fn(),
  deleteTodo: vi.fn(),
  moveToToday: vi.fn(),
  removeFromToday: vi.fn(),
}));
vi.mock('../useApi', () => ({ useApi: () => api }));
vi.mock('../useCrossTabSync', () => ({ useCrossTabSync: () => ({ broadcast: vi.fn() }) }));
vi.mock('../../contexts/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn(), hideToast: vi.fn() }) }));
vi.mock('../../contexts/AreaContext', () => ({ useArea: () => ({ currentArea: null }) }));

import { useTodoStore } from '../useTodoStore';

const todo = { id: 5, title: 't', description: '', completed: false, due_date: null, is_today: false, area_id: 1, reference_url: null, created_at: '', updated_at: '', completed_at: null, topic_id: 3, topic: { id: 3, name: 'A' } };

describe('useTodoStore: topic views stay current', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getTodos.mockResolvedValue({ success: true, data: [todo] });
  });

  const setup = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const spy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useTodoStore({ enableBackgroundSync: false }), {
      wrapper: ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
    });
    return { result, spy };
  };

  it('an update refreshes topic counts and topic todo lists', async () => {
    api.updateTodo.mockResolvedValue({ success: true, data: { ...todo, completed: true } });
    const { result, spy } = setup();
    await act(async () => {
      await result.current.updateTodo(5, { completed: true });
    });
    for (const key of ['topics', 'topic', 'topicTodos']) {
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: [key] }));
    }
  });

  it('a create and a delete do the same', async () => {
    api.createTodo.mockResolvedValue({ success: true, data: { ...todo, id: 6 } });
    api.deleteTodo.mockResolvedValue({ success: true, data: undefined });
    const { result, spy } = setup();
    await act(async () => {
      await result.current.createTodo({ title: 'x', area_id: 1, topic_id: 3 });
    });
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['topicTodos'] }));
    spy.mockClear();
    await act(async () => {
      await result.current.deleteTodo(5);
    });
    for (const key of ['topics', 'topic', 'topicTodos']) {
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: [key] }));
    }
  });

  it('moving to Today and removing from Today refresh topic todo lists', async () => {
    api.moveToToday.mockResolvedValue({ success: true, data: { ...todo, is_today: true } });
    api.removeFromToday.mockResolvedValue({ success: true, data: todo });
    const { result, spy } = setup();
    await act(async () => {
      await result.current.moveToToday(5);
    });
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['topicTodos'] }));
    spy.mockClear();
    await act(async () => {
      await result.current.removeFromToday(5);
    });
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['topicTodos'] }));
  });
});
