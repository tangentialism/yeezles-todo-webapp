import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TopicChip from '../TopicChip';
import TodoRow from '../../TodoRow';
import { TopicNavigationContext } from '../../../hooks/useOpenTopic';
import type { Todo } from '../../../types/todo';

vi.mock('../../TodoActions', () => ({ default: () => null }));
vi.mock('../../TodayToggle', () => ({ default: () => null }));

const todo: Todo = {
  id: 5, title: 'Order tiles', description: '', completed: false, due_date: null, is_today: false,
  area_id: 2, reference_url: null, created_at: '', updated_at: '', completed_at: null,
  topic_id: 3, topic: { id: 3, name: 'Kitchen reno' },
};

describe('TopicChip', () => {
  it('opens the topic when a provider is present', async () => {
    const openTopic = vi.fn();
    render(
      <TopicNavigationContext.Provider value={openTopic}>
        <TopicChip topic={{ id: 3, name: 'Kitchen reno' }} color="#43A047" />
      </TopicNavigationContext.Provider>
    );
    await userEvent.click(screen.getByRole('button', { name: 'Open topic Kitchen reno' }));
    expect(openTopic).toHaveBeenCalledWith(3);
  });

  it('is plain text without a provider', () => {
    render(<TopicChip topic={{ id: 3, name: 'Kitchen reno' }} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('Kitchen reno')).toBeInTheDocument();
  });
});

describe('TodoRow topic chip', () => {
  const rowProps = { displayState: { completed: false }, onToggleComplete: vi.fn(), onEdit: vi.fn(), onUpdate: vi.fn() };

  it('shows the topic in the meta line', () => {
    render(<TodoRow todo={todo} {...rowProps} />);
    expect(screen.getByText('Kitchen reno')).toBeInTheDocument();
  });

  it('hides it with showTopic={false} and for a todo with no topic', () => {
    const { rerender } = render(<TodoRow todo={todo} {...rowProps} showTopic={false} />);
    expect(screen.queryByText('Kitchen reno')).not.toBeInTheDocument();
    rerender(<TodoRow todo={{ ...todo, topic_id: null, topic: null }} {...rowProps} />);
    expect(screen.queryByText('Kitchen reno')).not.toBeInTheDocument();
  });
});
