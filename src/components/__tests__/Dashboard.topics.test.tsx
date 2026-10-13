import { describe, it, expect, vi, afterEach } from 'vitest';
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
vi.mock('../../hooks/useNavCounts', () => ({ useTodayOpenCount: () => null, usePendingProposalCount: () => null }));

/** The hand-back the review page would leave in router state; null for none. */
const handoff = vi.hoisted(() => ({ value: null as null | { view: 'topics'; areaId: number | null; highlightTopicIds?: number[] } }));
vi.mock('../../hooks/useTopicsHandoff', async () => {
  const { useEffect } = await import('react');
  return {
    useTopicsHandoff: (onArrive: (h: NonNullable<typeof handoff.value>) => void) => {
      useEffect(() => {
        if (handoff.value) onArrive(handoff.value);
      }, [onArrive]);
    },
  };
});

/** Stands in for any todo row: a chip that opens topic 3. */
const ChipProbe: React.FC = () => {
  const openTopic = useOpenTopic();
  return <button type="button" onClick={() => openTopic?.(3)}>chip</button>;
};
vi.mock('../ViewContainer', () => ({
  default: ({ openTopicId, highlightTopicIds }: { openTopicId: number | null; highlightTopicIds?: number[] }) => (
    <div>
      <span data-testid="open-topic">{openTopicId ?? 'none'}</span>
      <span data-testid="highlight">{(highlightTopicIds ?? []).join(',')}</span>
      <ChipProbe />
    </div>
  ),
}));

describe('Dashboard: opening a topic', () => {
  afterEach(() => {
    handoff.value = null;
  });

  it('a chip switches to the Topics view with that topic open', async () => {
    render(<Dashboard />);
    expect(screen.getByTestId('view')).toHaveTextContent('all');
    expect(screen.getByTestId('open-topic')).toHaveTextContent('none');
    await userEvent.click(screen.getByRole('button', { name: 'chip' }));
    expect(screen.getByTestId('view')).toHaveTextContent('topics');
    expect(screen.getByTestId('open-topic')).toHaveTextContent('3');
  });

  it('a hand-back from a review opens Topics and highlights the new topics', () => {
    handoff.value = { view: 'topics', areaId: 2, highlightTopicIds: [30, 31] };
    render(<Dashboard />);
    expect(screen.getByTestId('view')).toHaveTextContent('topics');
    expect(screen.getByTestId('highlight')).toHaveTextContent('30,31');
  });
});
