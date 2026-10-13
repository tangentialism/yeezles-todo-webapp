import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dashboard from '../Dashboard';
import { useOpenTopic } from '../../hooks/useOpenTopic';

vi.mock('../Navigation', () => ({
  default: ({ currentView }: { currentView: string }) => <div data-testid="view">{currentView}</div>,
}));
vi.mock('../PhoneTabBar', () => ({ default: () => null }));
vi.mock('../AddTodoModal', () => ({ default: () => null }));
vi.mock('../PasskeyManagementModal', () => ({ default: () => null }));
vi.mock('../AccessTokenManagementModal', () => ({ default: () => null }));
vi.mock('../AccountMenu', () => ({ default: () => null }));
vi.mock('../../hooks/useNavCounts', () => ({ useTodayOpenCount: () => null }));

/** Stands in for any todo row: a chip that opens topic 3. */
const ChipProbe: React.FC = () => {
  const openTopic = useOpenTopic();
  return <button type="button" onClick={() => openTopic?.(3)}>chip</button>;
};
vi.mock('../ViewContainer', () => ({
  default: ({ openTopicId }: { openTopicId: number | null }) => (
    <div>
      <span data-testid="open-topic">{openTopicId ?? 'none'}</span>
      <ChipProbe />
    </div>
  ),
}));

describe('Dashboard: opening a topic', () => {
  it('a chip switches to the Topics view with that topic open', async () => {
    render(<Dashboard />);
    expect(screen.getByTestId('view')).toHaveTextContent('all');
    expect(screen.getByTestId('open-topic')).toHaveTextContent('none');
    await userEvent.click(screen.getByRole('button', { name: 'chip' }));
    expect(screen.getByTestId('view')).toHaveTextContent('topics');
    expect(screen.getByTestId('open-topic')).toHaveTextContent('3');
  });
});
