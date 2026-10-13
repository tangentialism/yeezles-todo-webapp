import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PhoneTabBar from '../PhoneTabBar';

describe('PhoneTabBar', () => {
  it('renders the four views and marks the current one', () => {
    render(<PhoneTabBar currentView="today" onViewChange={vi.fn()} />);

    expect(screen.getByRole('navigation', { name: 'Views' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('button', { name: 'Today' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Done' })).not.toHaveAttribute('aria-current');
  });

  it('has a Topics tab', () => {
    render(<PhoneTabBar currentView="topics" onViewChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Topics/ })).toHaveAttribute('aria-current', 'page');
  });

  it('switches view on tap', async () => {
    const user = userEvent.setup();
    const onViewChange = vi.fn();
    render(<PhoneTabBar currentView="all" onViewChange={onViewChange} />);

    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(onViewChange).toHaveBeenCalledWith('accomplishments');
  });

  it('shows the open count beside Today', () => {
    render(<PhoneTabBar currentView="all" onViewChange={vi.fn()} todayCount={3} />);

    expect(screen.getByRole('button', { name: 'Today (3 open)' })).toBeInTheDocument();
  });
});
