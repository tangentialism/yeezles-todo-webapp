import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dashboard from '../Dashboard';
import { useOpenPerson } from '../../hooks/useOpenPerson';

vi.mock('../Navigation', () => ({
  default: ({ currentView }: { currentView: string }) => <div data-testid="view">{currentView}</div>,
}));
vi.mock('../PhoneTabBar', () => ({ default: () => null }));
vi.mock('../AddTodoModal', () => ({ default: () => null }));
vi.mock('../PasskeyManagementModal', () => ({ default: () => null }));
vi.mock('../AccessTokenManagementModal', () => ({ default: () => null }));
vi.mock('../AccountMenu', () => ({ default: () => null }));
vi.mock('../../hooks/useNavCounts', () => ({ useTodayOpenCount: () => null, usePendingProposalCount: () => null }));
vi.mock('../../hooks/useTopicsHandoff', () => ({ useTopicsHandoff: () => undefined }));

/** Stands in for person chips on todo rows: one per person id. */
const ChipProbe: React.FC<{ id: number }> = ({ id }) => {
  const openPerson = useOpenPerson();
  return <button type="button" onClick={() => openPerson?.(id)}>{`chip ${id}`}</button>;
};
vi.mock('../ViewContainer', () => ({
  default: ({ openPersonId }: { openPersonId: number | null }) => (
    <div>
      <span data-testid="open-person">{openPersonId ?? 'none'}</span>
      <ChipProbe id={7} />
      <ChipProbe id={9} />
    </div>
  ),
}));

describe('Dashboard: opening a person', () => {
  it('a chip on the All view switches to People with that person selected', async () => {
    render(<Dashboard />);
    expect(screen.getByTestId('view')).toHaveTextContent('all');
    expect(screen.getByTestId('open-person')).toHaveTextContent('none');
    await userEvent.click(screen.getByRole('button', { name: 'chip 7' }));
    expect(screen.getByTestId('view')).toHaveTextContent('people');
    expect(screen.getByTestId('open-person')).toHaveTextContent('7');
  });

  it('a different chip while already on People switches the selection', async () => {
    render(<Dashboard />);
    await userEvent.click(screen.getByRole('button', { name: 'chip 7' }));
    await userEvent.click(screen.getByRole('button', { name: 'chip 9' }));
    expect(screen.getByTestId('view')).toHaveTextContent('people');
    expect(screen.getByTestId('open-person')).toHaveTextContent('9');
  });
});
