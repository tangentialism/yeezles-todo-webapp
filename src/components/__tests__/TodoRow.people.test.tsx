import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TodoRow from '../TodoRow';
import DoneItem from '../DoneItem';
import { makeTodoPerson } from '../../test/personFactories';
import type { Todo } from '../../types/todo';

vi.mock('../TodoActions', () => ({ default: () => null }));
vi.mock('../TodayToggle', () => ({ default: () => null }));

const todo: Todo = {
  id: 5, title: 'Send the deck', description: '', completed: false, due_date: null, is_today: false,
  area_id: null, reference_url: null, created_at: '', updated_at: '', completed_at: null,
  topic_id: null, topic: null,
};
const priya = makeTodoPerson({ id: 1, display_name: 'Priya Raman' });
const sam = makeTodoPerson({ id: 2, display_name: 'Sam Lee', peopler_id: 4 });
const rowProps = { displayState: { completed: false }, onToggleComplete: vi.fn(), onEdit: vi.fn(), onUpdate: vi.fn() };

describe('TodoRow people chips', () => {
  it('shows a chip per person, and skips hidePersonId', () => {
    const { rerender } = render(<TodoRow todo={{ ...todo, people: [priya, sam] }} {...rowProps} />);
    expect(screen.getByText('Priya Raman')).toBeInTheDocument();
    expect(screen.getByText('Sam Lee')).toBeInTheDocument();
    rerender(<TodoRow todo={{ ...todo, people: [priya, sam] }} {...rowProps} hidePersonId={1} />);
    expect(screen.queryByText('Priya Raman')).not.toBeInTheDocument();
    expect(screen.getByText('Sam Lee')).toBeInTheDocument();
  });

  it('shows none and does not crash when people is undefined', () => {
    render(<TodoRow todo={todo} {...rowProps} />);
    expect(screen.queryByText('Priya Raman')).not.toBeInTheDocument();
  });

  it('renders the meta line for a todo with only people', () => {
    render(<TodoRow todo={{ ...todo, people: [priya] }} {...rowProps} />);
    expect(screen.getByText('Priya Raman')).toBeInTheDocument();
  });
});

describe('DoneItem people chips', () => {
  it('shows the chips', () => {
    render(<ul><DoneItem todo={{ ...todo, completed: true, people: [priya, sam] }} /></ul>);
    expect(screen.getByText('Priya Raman')).toBeInTheDocument();
    expect(screen.getByText('Sam Lee')).toBeInTheDocument();
  });
});
