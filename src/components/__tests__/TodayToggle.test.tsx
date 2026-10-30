import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import TodayToggle from '../TodayToggle';
import * as TodoStore from '../../hooks/useTodoStore';
import type { Todo } from '../../types/todo';

vi.mock('../../hooks/useTodoStore');

const baseTodo: Todo = {
  id: 5, title: 'Order tiles', description: '', completed: false, due_date: null, is_today: false,
  area_id: 1, reference_url: null, created_at: '', updated_at: '', completed_at: null,
};

const mockStore = (overrides: Record<string, unknown> = {}) => {
  vi.mocked(TodoStore.useTodoStore).mockReturnValue({
    moveToToday: vi.fn(), removeFromToday: vi.fn(),
    isMovingToToday: false, isRemovingFromToday: false, ...overrides,
  } as unknown as ReturnType<typeof TodoStore.useTodoStore>);
};

describe('TodayToggle: Today color', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore();
  });

  it('in Today: pressed, orange on a soft orange circle', () => {
    render(<TodayToggle todo={{ ...baseTodo, is_today: true }} />);
    const button = screen.getByRole('button', { name: 'Remove from Today' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveClass('text-today', 'bg-today-soft');
    expect(button).not.toHaveClass('text-accent');
    expect(button).not.toHaveClass('bg-accent-soft');
  });

  it('not in Today: grey, hover previews orange', () => {
    render(<TodayToggle todo={baseTodo} />);
    const button = screen.getByRole('button', { name: 'Add to Today' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).toHaveClass('text-ink-faint', 'hover:text-today', 'hover:bg-today-soft');
    expect(button).not.toHaveClass('text-today');
  });

  it('loading keeps the in-Today colors', () => {
    mockStore({ isRemovingFromToday: true });
    render(<TodayToggle todo={{ ...baseTodo, is_today: true }} />);
    expect(screen.getByRole('button', { name: 'Remove from Today' })).toHaveClass('text-today', 'bg-today-soft');
  });
});
