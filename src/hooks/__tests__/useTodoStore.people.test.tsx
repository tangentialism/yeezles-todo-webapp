import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { makeTodoPerson } from '../../test/personFactories';

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

const ana = makeTodoPerson({ id: 4, display_name: 'Ana' });
const ben = makeTodoPerson({ id: 9, display_name: 'Ben' });
const todo = { id: 5, title: 't', description: '', completed: false, due_date: null, is_today: false, area_id: 1, reference_url: null, created_at: '', updated_at: '', completed_at: null, topic_id: null, people: [ana] };

describe('useTodoStore: people views stay current', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getTodos.mockResolvedValue({ success: true, data: [todo] });
  });

  const setup = async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const spy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useTodoStore({ enableBackgroundSync: false }), {
      wrapper: ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
    });
    await waitFor(() => expect(result.current.todos).toHaveLength(1));
    return { result, spy };
  };

  const expectKeys = (spy: ReturnType<typeof vi.spyOn>, keys: string[]) => {
    for (const key of keys) expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: [key] }));
  };

  it('a completion toggle refreshes person counts and person todo lists', async () => {
    api.updateTodo.mockResolvedValue({ success: true, data: { ...todo, completed: true } });
    const { result, spy } = await setup();
    await act(async () => {
      await result.current.updateTodo(5, { completed: true });
    });
    expectKeys(spy, ['people', 'person', 'personTodos']);
  });

  it('create, delete, and the Today moves do the same', async () => {
    api.createTodo.mockResolvedValue({ success: true, data: { ...todo, id: 6 } });
    api.deleteTodo.mockResolvedValue({ success: true, data: undefined });
    api.moveToToday.mockResolvedValue({ success: true, data: { ...todo, is_today: true } });
    api.removeFromToday.mockResolvedValue({ success: true, data: todo });
    const { result, spy } = await setup();
    const steps: Array<() => Promise<unknown>> = [
      () => result.current.createTodo({ title: 'x', area_id: 1 }),
      () => result.current.deleteTodo(5),
      () => result.current.moveToToday(5),
      () => result.current.removeFromToday(5),
    ];
    for (const step of steps) {
      spy.mockClear();
      await act(async () => {
        await step();
      });
      expectKeys(spy, ['personTodos']);
    }
  });

  it('an update that changes people keeps the cached people while pending, then takes the server row', async () => {
    let resolveUpdate!: (value: unknown) => void;
    api.updateTodo.mockReturnValue(new Promise((resolve) => { resolveUpdate = resolve; }));
    const { result } = await setup();
    let pending!: Promise<unknown>;
    act(() => {
      pending = result.current.updateTodo(5, { title: 'renamed', people: [{ person_id: 9 }] });
    });
    await waitFor(() => expect(result.current.todos[0].title).toBe('renamed'));
    // Unchanged, not merely undefined: the refs-only patch must not reach the row
    expect(result.current.todos[0].people).toEqual([ana]);
    expect(Object.keys(result.current.todos[0])).toContain('people');
    await act(async () => {
      resolveUpdate({ success: true, data: { ...todo, title: 'renamed', people: [ben] } });
      await pending;
    });
    await waitFor(() => expect(result.current.todos[0].people).toEqual([ben]));
  });
});
