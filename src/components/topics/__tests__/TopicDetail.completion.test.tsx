/**
 * Plan Review Focus 4: completing a todo from topic detail moves it from the
 * open list to Done (n) and updates the counts without a manual refresh.
 * Real topic and todo stores over a fake API, so the invalidation path is
 * what is under test.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { makeTopic } from '../../../test/topicFactories';
import type { Todo } from '../../../types/todo';

const api = vi.hoisted(() => ({
  getTopic: vi.fn(),
  getTodos: vi.fn(),
  updateTodo: vi.fn(),
}));
vi.mock('../../../hooks/useApi', () => ({ useApi: () => api }));
vi.mock('../../../hooks/useCrossTabSync', () => ({ useCrossTabSync: () => ({ broadcast: vi.fn() }) }));
vi.mock('../../../contexts/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn(), hideToast: vi.fn() }) }));
vi.mock('../../../contexts/AreaContext', () => ({ useArea: () => ({ areas: [], currentArea: null }) }));
vi.mock('../../TodoActions', () => ({ default: () => null }));
vi.mock('../../TodayToggle', () => ({ default: () => null }));
vi.mock('../../EditTodoModal', () => ({ default: () => null }));
vi.mock('../TopicNoteEditor', () => ({ default: () => null }));

import TopicDetail from '../TopicDetail';

const makeTodo = (id: number, title: string, completed: boolean): Todo => ({
  id, title, description: '', completed, due_date: null, is_today: false, area_id: 1,
  reference_url: null, created_at: '', updated_at: '', completed_at: null, topic_id: 4, topic: { id: 4, name: 'Kitchen reno' },
});

describe('TopicDetail: completing a todo', () => {
  let server: Todo[];

  beforeEach(() => {
    vi.clearAllMocks();
    server = [makeTodo(1, 'Order countertop', false), makeTodo(2, 'Pick tiles', true)];
    api.getTopic.mockImplementation(async () =>
      makeTopic({
        id: 4, name: 'Kitchen reno',
        open_count: server.filter((t) => !t.completed).length,
        done_count: server.filter((t) => t.completed).length,
      })
    );
    api.getTodos.mockImplementation(async (filters: { topic_id?: number; completed?: boolean }) => ({
      success: true,
      data: filters.topic_id === undefined ? server : server.filter((t) => t.completed === filters.completed),
    }));
    api.updateTodo.mockImplementation(async (id: number, updates: Partial<Todo>) => {
      server = server.map((t) => (t.id === id ? { ...t, ...updates } : t));
      return { success: true, data: server.find((t) => t.id === id) };
    });
  });

  it('moves it from Open to Done (n) and updates the counts without a refresh', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <TopicDetail topicId={4} onBack={vi.fn()} />
      </QueryClientProvider>
    );
    const open = await screen.findByRole('list', { name: 'Open todos' });
    expect(within(open).getByText('Order countertop')).toBeInTheDocument();
    expect(screen.getByText('1 open · 1 done')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Done (1)' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Complete "Order countertop"' }));

    expect(await screen.findByText('0 open · 2 done')).toBeInTheDocument();
    expect(await screen.findByText('No open todos in this topic.')).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: 'Done (2)' }));
    const done = screen.getByRole('list', { name: 'Done todos' });
    expect(within(done).getByText('Order countertop')).toBeInTheDocument();
    expect(api.updateTodo).toHaveBeenCalledWith(1, { completed: true });
  });
});
